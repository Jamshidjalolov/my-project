import argparse
import os
import sys
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import SessionLocal, Base, engine
from models import User, Category, Product, Slide, Main6Content, Main7Item, Main8Content
from security import hash_password


def ensure_admin(db, name: str, email: str, password: str):
    user = db.query(User).filter(User.email == email).first()
    if user:
        if user.role != "admin" or (user.roles and "admin" not in user.roles):
            user.role = "admin"
            user.roles = ["admin"]
            user.is_active = True
            db.commit()
            db.refresh(user)
        return user

    user = User(
        name=name,
        email=email,
        password=hash_password(password),
        role="admin",
        roles=["admin"],
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def seed_categories(db):
    if db.query(Category).count() > 0:
        return db.query(Category).all()

    items = [
        Category(name="Fruits", description="Fresh fruits", image="https://picsum.photos/seed/fruits/600/400"),
        Category(name="Vegetables", description="Green and fresh", image="https://picsum.photos/seed/veg/600/400"),
        Category(name="Meat", description="Best meat cuts", image="https://picsum.photos/seed/meat/600/400"),
        Category(name="Milk", description="Dairy products", image="https://picsum.photos/seed/milk/600/400"),
        Category(name="Cakes", description="Sweet cakes", image="https://picsum.photos/seed/cake/600/400"),
        Category(name="Drinks", description="Cold drinks", image="https://picsum.photos/seed/drinks/600/400"),
    ]
    db.add_all(items)
    db.commit()
    return items


def seed_products(db, categories):
    if db.query(Product).count() > 0:
        return

    cat_map = {c.name: c.id for c in categories}
    items = [
        Product(
            name="Apple",
            description="Red apple",
            price=12000,
            discount_price=10000,
            image="https://picsum.photos/seed/apple/500/400",
            category_id=cat_map["Fruits"],
            is_available=True,
        ),
        Product(
            name="Tomato",
            description="Fresh tomato",
            price=8000,
            discount_price=None,
            image="https://picsum.photos/seed/tomato/500/400",
            category_id=cat_map["Vegetables"],
            is_available=True,
        ),
        Product(
            name="Beef",
            description="Premium beef",
            price=90000,
            discount_price=85000,
            image="https://picsum.photos/seed/beef/500/400",
            category_id=cat_map["Meat"],
            is_available=True,
        ),
    ]
    db.add_all(items)
    db.commit()


def seed_slides(db):
    if db.query(Slide).count() > 0:
        return

    items = [
        Slide(
            title="Fresh Food Every Day",
            text="Order healthy meals quickly.",
            img="https://picsum.photos/seed/slide1/900/600",
            created_at=datetime.utcnow(),
        ),
        Slide(
            title="Special Offers",
            text="Get discounts on selected products.",
            img="https://picsum.photos/seed/slide2/900/600",
            created_at=datetime.utcnow(),
        ),
    ]
    db.add_all(items)
    db.commit()


def seed_main6(db):
    if db.query(Main6Content).count() > 0:
        return

    items = [
        Main6Content(
            title="Fast Delivery",
            text="Your order arrives in minutes.",
            image="https://picsum.photos/seed/main6a/800/600",
        ),
        Main6Content(
            title="Best Quality",
            text="Top quality products for your family.",
            image="https://picsum.photos/seed/main6b/800/600",
        ),
    ]
    db.add_all(items)
    db.commit()


def seed_main7(db):
    if db.query(Main7Item).count() > 0:
        return

    items = [
        Main7Item(
            name="Weekend Combo",
            description="Special price for weekend",
            old_price="150000",
            new_price="120000",
            img="https://picsum.photos/seed/main7a/600/500",
            day=1,
            hour=5,
            minute=30,
            second=45,
        ),
        Main7Item(
            name="Chef Choice",
            description="Popular menu set",
            old_price="90000",
            new_price="75000",
            img="https://picsum.photos/seed/main7b/600/500",
            day=2,
            hour=3,
            minute=15,
            second=10,
        ),
    ]
    db.add_all(items)
    db.commit()


def seed_main8(db):
    if db.query(Main8Content).count() > 0:
        return

    item = Main8Content(
        title="Get our mobile app",
        text="Order faster with our app.",
        img="https://picsum.photos/seed/main8/700/700",
    )
    db.add(item)
    db.commit()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--admin-name", default="Admin", help="Admin name")
    parser.add_argument("--admin-email", default="admin@example.com", help="Admin email")
    parser.add_argument("--admin-password", default="admin12345", help="Admin password")
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ensure_admin(db, args.admin_name, args.admin_email, args.admin_password)
        categories = seed_categories(db)
        seed_products(db, categories)
        seed_slides(db)
        seed_main6(db)
        seed_main7(db)
        seed_main8(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
