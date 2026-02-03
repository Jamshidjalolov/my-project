from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(20), default="user")  # legacy single role
    roles = Column(JSONB, default=list, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    orders = relationship("Order", back_populates="user")
    reviews = relationship("Review", back_populates="user")

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    image = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text)
    price = Column(Integer, nullable=False)  # in cents
    discount_price = Column(Integer, nullable=True)
    image = Column(Text)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    category = relationship("Category", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")
    reviews = relationship("Review", back_populates="product")

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default="pending")  # pending, confirmed, preparing, ready, delivered, cancelled
    total_price = Column(Integer, nullable=False)  # in cents
    delivery_address = Column(Text)
    phone = Column(String(20))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Integer, nullable=False)  # in cents
    
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="reviews")
    product = relationship("Product", back_populates="reviews")

class Slide(Base):
    __tablename__ = "slides"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(Text, nullable=False)
    text = Column(Text, nullable=False)
    img = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Main7Item(Base):
    __tablename__ = "main7_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text)
    old_price = Column(String(50))
    new_price = Column(String(50))
    img = Column(Text)
    day = Column(Integer, default=0)
    hour = Column(Integer, default=0)
    minute = Column(Integer, default=0)
    second = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class Main8Content(Base):
    __tablename__ = "main8_content"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    text = Column(Text, nullable=False)
    img = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Main6Content(Base):
    __tablename__ = "main6_content"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    text = Column(Text, nullable=False)
    image = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
