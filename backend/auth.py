from datetime import datetime, timedelta
from typing import Optional
from pathlib import Path
from uuid import uuid4

from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from config import (
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    FIREBASE_CREDENTIALS_PATH,
    FIREBASE_PROJECT_ID,
    FIREBASE_REQUIRE_EMAIL_VERIFIED,
    FIREBASE_REQUIRE_EMAIL_CODE,
)
from database import SessionLocal
from models import User, Role, EmailOTP

try:
    import firebase_admin
    from firebase_admin import credentials, auth as fb_auth
except Exception:  # pragma: no cover - optional dependency
    firebase_admin = None
    fb_auth = None

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

firebase_app = None
firebase_error: Exception | None = None
if firebase_admin and FIREBASE_CREDENTIALS_PATH:
    try:
        cred_path = Path(FIREBASE_CREDENTIALS_PATH)
        if not cred_path.is_absolute():
            cred_path = (Path(__file__).resolve().parent / cred_path).resolve()
        if cred_path.exists():
            cred = credentials.Certificate(str(cred_path))
            options = {"projectId": FIREBASE_PROJECT_ID} if FIREBASE_PROJECT_ID else None
            if firebase_admin._apps:
                firebase_app = firebase_admin.get_app()
            else:
                firebase_app = firebase_admin.initialize_app(cred, options)
    except Exception as exc:  # pragma: no cover - runtime environment
        firebase_error = exc


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_user_by_username_or_email(db: Session, username: str) -> Optional[User]:
    candidate = username.strip()
    if not candidate:
        return None
    email_candidate = candidate.lower()
    return (
        db.query(User)
        .filter(
            (User.username == candidate)
            | (User.email == candidate)
            | (User.email == email_candidate)
        )
        .first()
    )


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    if not username or not password:
        return None
    user = get_user_by_username_or_email(db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def _get_user_from_jwt(db: Session, token: str) -> Optional[User]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        if not user_id:
            return None
    except JWTError:
        return None
    return db.query(User).filter(User.id == int(user_id)).first()


def _get_user_from_firebase(db: Session, token: str) -> Optional[User]:
    if not firebase_app or not fb_auth:
        return None
    try:
        decoded = fb_auth.verify_id_token(token, app=firebase_app)
    except Exception:
        return None
    email = decoded.get("email")
    if not email:
        return None
    if FIREBASE_REQUIRE_EMAIL_VERIFIED and not decoded.get("email_verified", False):
        raise HTTPException(status_code=403, detail="Email not verified")
    if FIREBASE_REQUIRE_EMAIL_CODE:
        verified = (
            db.query(EmailOTP)
            .filter(EmailOTP.email == email, EmailOTP.verified_at.isnot(None))
            .first()
        )
        if not verified:
            raise HTTPException(status_code=403, detail="Email code required")

    user = db.query(User).filter(User.email == email).first()
    if user:
        return user

    base_username = (decoded.get("name") or email.split("@")[0] or "user").strip()
    candidate = base_username
    counter = 1
    while db.query(User).filter(User.username == candidate).first():
        candidate = f"{base_username}{counter}"
        counter += 1

    user = User(
        email=email,
        username=candidate,
        hashed_password=get_password_hash(uuid4().hex),
    )
    user.roles = [get_or_create_role(db, "user")]
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    user = _get_user_from_jwt(db, token)
    if user:
        return user
    user = _get_user_from_firebase(db, token)
    if user:
        return user
    raise credentials_exception


def get_optional_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    token = parts[1]
    user = _get_user_from_jwt(db, token)
    if user:
        return user
    return _get_user_from_firebase(db, token)


def create_firebase_custom_token_for_user(user: User) -> Optional[str]:
    if not firebase_app or not fb_auth:
        return None
    claims = {
        "app_user_id": user.id,
        "roles": [role.name for role in user.roles],
    }
    token = fb_auth.create_custom_token(
        uid=f"app-user-{user.id}",
        developer_claims=claims,
        app=firebase_app,
    )
    if isinstance(token, bytes):
        return token.decode("utf-8")
    return str(token)


def get_or_create_role(db: Session, name: str) -> Role:
    role = db.query(Role).filter(Role.name == name).first()
    if role:
        return role
    role = Role(name=name)
    db.add(role)
    db.commit()
    db.refresh(role)
    return role
