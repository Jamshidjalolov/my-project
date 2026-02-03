from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Category
from schemas import CategoryCreate, CategoryResponse
from routes.auth import require_role

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("/", response_model=list[CategoryResponse])
@router.get("", response_model=list[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).all()
    return categories

@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(category_id: int, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    return category

@router.put("/{category_id}", response_model=CategoryResponse, dependencies=[Depends(require_role(["admin"]))])
def update_category(
    category_id: int,
    category: CategoryCreate,
    db: Session = Depends(get_db)
):
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if not db_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    db_category.name = category.name
    db_category.description = category.description
    db_category.image = category.image
    db.commit()
    db.refresh(db_category)
    return db_category

@router.post("/", response_model=CategoryResponse, dependencies=[Depends(require_role(["admin"]))])
@router.post("", response_model=CategoryResponse, dependencies=[Depends(require_role(["admin"]))])
def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db)
):
    db_category = Category(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@router.delete("/{category_id}", dependencies=[Depends(require_role(["admin"]))])
def delete_category(
    category_id: int,
    db: Session = Depends(get_db)
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    db.delete(category)
    db.commit()
    return {"message": "Category deleted successfully"}
