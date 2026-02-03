from fastapi import APIRouter, Depends, HTTPException, status, Security
from sqlalchemy.orm import Session
from database import get_db
from models import Review, Product, User
from schemas import ReviewCreate, ReviewResponse
from routes.auth import get_current_user, get_user_roles

router = APIRouter(prefix="/reviews", tags=["reviews"])

@router.get("/", response_model=list[ReviewResponse])
@router.get("", response_model=list[ReviewResponse])
def list_reviews(product_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(Review)
    if product_id is not None:
        query = query.filter(Review.product_id == product_id)
    return query.all()

@router.get("/product/{product_id}", response_model=list[ReviewResponse])
def get_product_reviews(product_id: int, db: Session = Depends(get_db)):
    reviews = db.query(Review).filter(Review.product_id == product_id).all()
    return reviews

@router.post("/", response_model=ReviewResponse)
@router.post("", response_model=ReviewResponse)
def create_review(
    review: ReviewCreate,
    user: User = Security(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if product exists
    product = db.query(Product).filter(Product.id == review.product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Check if rating is valid
    if review.rating < 1 or review.rating > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be between 1 and 5"
        )
    
    db_review = Review(
        user_id=user.id,
        product_id=review.product_id,
        rating=review.rating,
        comment=review.comment
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    return db_review

@router.delete("/{review_id}")
def delete_review(
    review_id: int,
    user: User = Security(get_current_user),
    db: Session = Depends(get_db)
):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # Check if user is owner or admin
    if review.user_id != user.id and "admin" not in get_user_roles(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    db.delete(review)
    db.commit()
    return {"message": "Review deleted successfully"}
