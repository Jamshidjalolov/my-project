from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserResponse, UserAdminUpdate
from routes.auth import require_role, get_current_user

router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(get_current_user)])

@router.get("/", response_model=list[UserResponse], dependencies=[Depends(require_role(["admin"]))])
@router.get("", response_model=list[UserResponse], dependencies=[Depends(require_role(["admin"]))])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@router.patch("/{user_id}", response_model=UserResponse, dependencies=[Depends(require_role(["admin"]))])
def update_user(
    user_id: int,
    payload: UserAdminUpdate,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if payload.role is not None:
        user.role = payload.role
        user.roles = [payload.role]
    if payload.roles is not None:
        user.roles = payload.roles
        user.role = payload.roles[0] if payload.roles else "user"
    if payload.is_active is not None:
        user.is_active = payload.is_active

    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", dependencies=[Depends(require_role(["admin"]))])
def delete_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Oxirgi adminni o'chirishga ruxsat yo'q
    is_admin = (user.role == "admin") or ("admin" in (user.roles or []))
    if is_admin:
        admins = [u for u in db.query(User).all() if (u.role == "admin") or ("admin" in (u.roles or []))]
        if len(admins) <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Last admin cannot be deleted"
            )

    db.delete(user)
    db.commit()
    return {"message": "User deleted"}
