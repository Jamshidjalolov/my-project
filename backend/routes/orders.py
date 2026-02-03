from fastapi import APIRouter, Depends, HTTPException, status, Security
from datetime import datetime, timedelta
from sqlalchemy.orm import Session, selectinload
from database import get_db
from models import Order, OrderItem, Product, User
from schemas import OrderCreate, OrderResponse, OrderUpdate
from routes.auth import get_current_user, get_user_roles

router = APIRouter(prefix="/orders", tags=["orders"], dependencies=[Depends(get_current_user)])

def _serialize_order(order: Order) -> OrderResponse:
    # User ma'lumotini majburiy qo'shib yuboramiz
    payload = OrderResponse.model_validate(order).model_dump()
    if order.user:
        payload["user"] = {
            "id": order.user.id,
            "name": order.user.name,
            "email": order.user.email,
        }
    # created_at / updated_at ni har doim yuboramiz
    if order.created_at:
        payload["created_at"] = order.created_at
    if order.updated_at:
        payload["updated_at"] = order.updated_at
    return OrderResponse.model_validate(payload)

@router.get("/", response_model=list[OrderResponse])
@router.get("", response_model=list[OrderResponse])
def get_orders(
    user: User = Security(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if user is admin or chef
    base_query = db.query(Order).options(
        selectinload(Order.items).selectinload(OrderItem.product),
        selectinload(Order.user),
    ).order_by(Order.created_at.asc())

    if get_user_roles(user).intersection({"admin", "chef"}):
        orders = base_query.all()
    else:
        orders = base_query.filter(Order.user_id == user.id).all()

    # User ma'lumotlari to'liq yuklanganini kafolatlaymiz
    for order in orders:
        _ = order.user

    # Pydantic user maydonini qat'iy serialize qilishi uchun
    return [_serialize_order(order) for order in orders]

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    user: User = Security(get_current_user),
    db: Session = Depends(get_db)
):
    order = db.query(Order).options(
        selectinload(Order.items).selectinload(OrderItem.product),
        selectinload(Order.user),
    ).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check if user is owner, admin, or chef
    if order.user_id != user.id and not get_user_roles(user).intersection({"admin", "chef"}):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    _ = order.user
    return _serialize_order(order)

@router.post("/", response_model=OrderResponse)
@router.post("", response_model=OrderResponse)
def create_order(
    order: OrderCreate,
    user: User = Security(get_current_user),
    db: Session = Depends(get_db)
):
    # Calculate total price
    total_price = 0
    
    # Create order
    db_order = Order(
        user_id=user.id,
        delivery_address=order.delivery_address,
        phone=order.phone,
        notes=order.notes,
        total_price=total_price
    )
    
    # Add order items
    for item in order.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {item.product_id} not found"
            )
        
        item_price = product.discount_price if product.discount_price is not None else product.price
        total_price += item_price * item.quantity
        
        order_item = OrderItem(
            product_id=product.id,
            quantity=item.quantity,
            price=item_price
        )
        db_order.items.append(order_item)
    
    db_order.total_price = total_price
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    db_order.user = user
    return _serialize_order(db_order)

@router.put("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: int,
    order_update: OrderUpdate,
    user: User = Security(get_current_user),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check if user is owner, admin, or chef
    if order.user_id != user.id and not get_user_roles(user).intersection({"admin", "chef"}):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    update_data = order_update.dict(exclude_unset=True)
    # Accept uchun vaqt cheklovi yo'q

    if update_data.get("status") == "cancelled":
        # Foydalanuvchi 2 daqiqadan keyin bekor qila olmaydi
        created_at = order.created_at
        if created_at and datetime.utcnow() > created_at + timedelta(minutes=2):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order cancel time expired"
            )
    for field, value in update_data.items():
        setattr(order, field, value)
    
    db.commit()
    db.refresh(order)
    return _serialize_order(order)

@router.delete("/{order_id}")
def delete_order(
    order_id: int,
    user: User = Security(get_current_user),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check if user is owner or admin
    if order.user_id != user.id and "admin" not in get_user_roles(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    db.delete(order)
    db.commit()
    return {"message": "Order deleted successfully"}
