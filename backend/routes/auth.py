from fastapi import APIRouter, Depends, HTTPException, status, Security
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserCreate, UserLogin, UserResponse, Token, UserUpdate
from security import hash_password, verify_password, create_access_token, verify_token

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


def get_user_roles(user: User) -> set[str]:
    roles: list[str] = []
    if getattr(user, "roles", None):
        roles = user.roles or []
    elif getattr(user, "role", None):
        roles = [user.role]

    normalized: set[str] = set()
    for role in roles:
        if not role:
            continue
        if isinstance(role, str):
            for part in role.split(","):
                part = part.strip().lower()
                if part:
                    normalized.add(part)
    return normalized

def get_current_user(
    token: str = Security(oauth2_scheme),
    db: Session = Depends(get_db),
):
    user_id = verify_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    return user


def require_role(roles: list[str]):
    def role_checker(user: User = Security(get_current_user)):
        allowed = {r.lower() for r in roles}
        if not get_user_roles(user).intersection(allowed):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        return user
    return role_checker

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = hash_password(user.password)
    roles = ["user"]
    if db.query(User).count() == 0:
        roles = ["admin"]
    db_user = User(
        name=user.name,
        email=user.email,
        password=hashed_password,
        role=roles[0],
        roles=roles,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    # Check if user exists
    db_user = db.query(User).filter(User.email == credentials.email).first()
    
    if not db_user or not verify_password(credentials.password, db_user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not db_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    
    # Create JWT token
    access_token = create_access_token(data={"sub": db_user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }

# OAuth2 uchun token olish (Swagger Authorize shu endpointni ishlatadi).
@router.post("/token", response_model=Token)
def token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == form_data.username).first()

    if not db_user or not verify_password(form_data.password, db_user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not db_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    access_token = create_access_token(data={"sub": db_user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }

@router.get("/me", response_model=UserResponse)
def get_me(user: User = Security(get_current_user)):
    return user

@router.put("/me", response_model=UserResponse)
def update_current_user(
    user_update: UserUpdate,
    user: User = Security(get_current_user),
    db: Session = Depends(get_db)
):
    if user_update.name:
        user.name = user_update.name
    
    if user_update.password:
        user.password = hash_password(user_update.password)
    
    db.commit()
    db.refresh(user)
    return user
