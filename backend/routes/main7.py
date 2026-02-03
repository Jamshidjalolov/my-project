from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Main7Item
from schemas import Main7Create, Main7Update, Main7Response
from routes.auth import require_role

router = APIRouter(prefix="/main7", tags=["main7"])

@router.get("/", response_model=list[Main7Response])
@router.get("", response_model=list[Main7Response])
def list_items(db: Session = Depends(get_db)):
    # Faqat bitta (eng so'nggi) combo qaytadi
    return db.query(Main7Item).order_by(Main7Item.id.desc()).limit(1).all()

@router.post("/", response_model=Main7Response, dependencies=[Depends(require_role(["admin"]))])
@router.post("", response_model=Main7Response, dependencies=[Depends(require_role(["admin"]))])
def create_item(payload: Main7Create, db: Session = Depends(get_db)):
    # Faqat bitta combo bo'lishi uchun eskilarini o'chiramiz
    db.query(Main7Item).delete()
    item = Main7Item(**payload.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/{item_id}", response_model=Main7Response, dependencies=[Depends(require_role(["admin"]))])
def update_item(
    item_id: int,
    payload: Main7Update,
    db: Session = Depends(get_db)
):
    item = db.query(Main7Item).filter(Main7Item.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}", dependencies=[Depends(require_role(["admin"]))])
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Main7Item).filter(Main7Item.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    db.delete(item)
    db.commit()
    return {"message": "Item deleted successfully"}
