from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

# User Schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: Optional[str] = None
    roles: list[str] = ["user"]

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None

class UserAdminUpdate(BaseModel):
    role: Optional[str] = None
    roles: Optional[list[str]] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Admin panel uchun qisqa user ma'lumoti
class UserPublic(BaseModel):
    id: int
    name: str
    email: EmailStr

    class Config:
        from_attributes = True

# Category Schemas
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    image: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Product Schemas
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: int
    discount_price: Optional[int] = None
    image: Optional[str] = None
    category_id: int
    is_available: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    discount_price: Optional[int] = None
    image: Optional[str] = None
    category_id: Optional[int] = None
    is_available: Optional[bool] = None

class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Order Item Schemas
class OrderItemBase(BaseModel):
    product_id: int
    quantity: int

class OrderItemResponse(OrderItemBase):
    id: int
    price: int
    product: Optional["ProductResponse"] = None
    
    class Config:
        from_attributes = True

# Order Schemas
class OrderBase(BaseModel):
    delivery_address: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None

class OrderCreate(OrderBase):
    items: List[OrderItemBase]

class OrderUpdate(BaseModel):
    status: str
    delivery_address: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None

class OrderResponse(OrderBase):
    id: int
    user_id: int
    user: Optional[UserPublic] = None
    status: str
    total_price: int
    items: List[OrderItemResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
    
    class Config:
        from_attributes = True

# Review Schemas
class ReviewBase(BaseModel):
    rating: int
    comment: Optional[str] = None

class ReviewCreate(ReviewBase):
    product_id: int

class ReviewResponse(ReviewBase):
    id: int
    user_id: int
    product_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    user_id: Optional[int] = None

# Slide Schemas
class SlideBase(BaseModel):
    title: str
    text: str
    img: str

class SlideCreate(SlideBase):
    pass

class SlideUpdate(BaseModel):
    title: Optional[str] = None
    text: Optional[str] = None
    img: Optional[str] = None

class SlideResponse(SlideBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Main7 Schemas
class Main7Base(BaseModel):
    name: str
    description: Optional[str] = None
    old_price: Optional[str] = None
    new_price: Optional[str] = None
    img: Optional[str] = None
    day: int = 0
    hour: int = 0
    minute: int = 0
    second: int = 0

class Main7Create(Main7Base):
    pass

class Main7Update(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    old_price: Optional[str] = None
    new_price: Optional[str] = None
    img: Optional[str] = None
    day: Optional[int] = None
    hour: Optional[int] = None
    minute: Optional[int] = None
    second: Optional[int] = None

class Main7Response(Main7Base):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Main8 Schemas
class Main8Base(BaseModel):
    title: str
    text: str
    img: str

class Main8Create(Main8Base):
    pass

class Main8Update(BaseModel):
    title: Optional[str] = None
    text: Optional[str] = None
    img: Optional[str] = None

class Main8Response(Main8Base):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Main6 Schemas
class Main6Base(BaseModel):
    title: str
    text: str
    image: str

class Main6Create(Main6Base):
    pass

class Main6Update(BaseModel):
    title: Optional[str] = None
    text: Optional[str] = None
    image: Optional[str] = None

class Main6Response(Main6Base):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


OrderItemResponse.model_rebuild()
