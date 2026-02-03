from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Slide
from schemas import SlideCreate, SlideUpdate, SlideResponse
from routes.auth import require_role

router = APIRouter(prefix="/slides", tags=["slides"])

@router.get("/", response_model=list[SlideResponse])
@router.get("", response_model=list[SlideResponse])
def list_slides(db: Session = Depends(get_db)):
    return db.query(Slide).order_by(Slide.id.desc()).all()

@router.get("/{slide_id}", response_model=SlideResponse)
def get_slide(slide_id: int, db: Session = Depends(get_db)):
    slide = db.query(Slide).filter(Slide.id == slide_id).first()
    if not slide:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Slide not found"
        )
    return slide

@router.post("/", response_model=SlideResponse, dependencies=[Depends(require_role(["admin"]))])
@router.post("", response_model=SlideResponse, dependencies=[Depends(require_role(["admin"]))])
def create_slide(payload: SlideCreate, db: Session = Depends(get_db)):
    slide = Slide(**payload.dict())
    db.add(slide)
    db.commit()
    db.refresh(slide)
    return slide

@router.put("/{slide_id}", response_model=SlideResponse, dependencies=[Depends(require_role(["admin"]))])
def update_slide(
    slide_id: int,
    payload: SlideUpdate,
    db: Session = Depends(get_db)
):
    slide = db.query(Slide).filter(Slide.id == slide_id).first()
    if not slide:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Slide not found"
        )

    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(slide, field, value)

    db.commit()
    db.refresh(slide)
    return slide

@router.delete("/{slide_id}", dependencies=[Depends(require_role(["admin"]))])
def delete_slide(slide_id: int, db: Session = Depends(get_db)):
    slide = db.query(Slide).filter(Slide.id == slide_id).first()
    if not slide:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Slide not found"
        )
    db.delete(slide)
    db.commit()
    return {"message": "Slide deleted successfully"}
