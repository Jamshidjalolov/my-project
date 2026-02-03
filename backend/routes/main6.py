from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Main6Content
from schemas import Main6Create, Main6Update, Main6Response
from routes.auth import require_role

router = APIRouter(prefix="/main6", tags=["main6"])

@router.get("/", response_model=list[Main6Response])
@router.get("", response_model=list[Main6Response])
def list_content(db: Session = Depends(get_db)):
    return db.query(Main6Content).order_by(Main6Content.id.desc()).all()

@router.post("/", response_model=Main6Response, dependencies=[Depends(require_role(["admin"]))])
@router.post("", response_model=Main6Response, dependencies=[Depends(require_role(["admin"]))])
def create_content(payload: Main6Create, db: Session = Depends(get_db)):
    content = Main6Content(**payload.dict())
    db.add(content)
    db.commit()
    db.refresh(content)
    return content

@router.put("/{content_id}", response_model=Main6Response, dependencies=[Depends(require_role(["admin"]))])
def update_content(
    content_id: int,
    payload: Main6Update,
    db: Session = Depends(get_db)
):
    content = db.query(Main6Content).filter(Main6Content.id == content_id).first()
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
    content = db.query(Main6Content).filter(Main6Content.id == content_id).first()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )
    db.delete(content)
    db.commit()
    return {"message": "Content deleted successfully"}
