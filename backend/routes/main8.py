from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Main8Content
from schemas import Main8Create, Main8Update, Main8Response
from routes.auth import require_role

router = APIRouter(prefix="/main8", tags=["main8"])

@router.get("/", response_model=list[Main8Response])
@router.get("", response_model=list[Main8Response])
def list_content(db: Session = Depends(get_db)):
    return db.query(Main8Content).order_by(Main8Content.id.desc()).all()

@router.post("/", response_model=Main8Response, dependencies=[Depends(require_role(["admin"]))])
@router.post("", response_model=Main8Response, dependencies=[Depends(require_role(["admin"]))])
def create_content(payload: Main8Create, db: Session = Depends(get_db)):
    content = Main8Content(**payload.dict())
    db.add(content)
    db.commit()
    db.refresh(content)
    return content

@router.put("/{content_id}", response_model=Main8Response, dependencies=[Depends(require_role(["admin"]))])
def update_content(
    content_id: int,
    payload: Main8Update,
    db: Session = Depends(get_db)
):
    content = db.query(Main8Content).filter(Main8Content.id == content_id).first()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )
    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(content, field, value)
    db.commit()
    db.refresh(content)
    return content

@router.delete("/{content_id}", dependencies=[Depends(require_role(["admin"]))])
def delete_content(content_id: int, db: Session = Depends(get_db)):
    content = db.query(Main8Content).filter(Main8Content.id == content_id).first()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )
    db.delete(content)
    db.commit()
    return {"message": "Content deleted successfully"}
