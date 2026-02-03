# Backend Setup Guide

## Installation

1. **Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Create `.env` file:**
```bash
cp .env.example .env
```

4. **Edit `.env` with your database credentials:**
```
DATABASE_URL=postgresql://username:password@localhost:5432/restaurant_db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

5. **Create PostgreSQL database:**
```bash
createdb restaurant_db
```

## Running Migrations

```bash
# Initialize Alembic (if needed)
alembic init alembic

# Run migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "Description"
```

## Running the API

```bash
python main.py
```

API will be available at `http://localhost:8000`
API Docs: `http://localhost:8000/docs`

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user
- `PUT /auth/me` - Update current user

### Categories
- `GET /categories/` - Get all categories
- `GET /categories/{id}` - Get category by id
- `POST /categories/` - Create category (admin only)
- `DELETE /categories/{id}` - Delete category (admin only)

### Products
- `GET /products/` - Get all products
- `GET /products/?category_id=1` - Get products by category
- `GET /products/{id}` - Get product by id
- `POST /products/` - Create product (admin/chef only)
- `PUT /products/{id}` - Update product (admin/chef only)
- `DELETE /products/{id}` - Delete product (admin only)

### Orders
- `GET /orders/` - Get user orders (admin/chef see all)
- `GET /orders/{id}` - Get order by id
- `POST /orders/` - Create new order
- `PUT /orders/{id}` - Update order status
- `DELETE /orders/{id}` - Delete order

### Reviews
- `GET /reviews/product/{product_id}` - Get product reviews
- `POST /reviews/` - Create review
- `DELETE /reviews/{id}` - Delete review

## Project Structure

```
backend/
├── alembic/                 # Database migrations
├── models/                  # SQLAlchemy models
├── routes/                  # API endpoints
├── schemas/                 # Pydantic schemas
├── config.py               # Configuration
├── database.py             # Database setup
├── security.py             # JWT & password hashing
├── main.py                 # FastAPI app
├── requirements.txt        # Dependencies
├── .env.example           # Example environment variables
└── .gitignore
```

## Security Notes

- Always change `SECRET_KEY` in production
- Use environment variables for sensitive data
- Passwords are hashed with bcrypt
- Authentication uses JWT tokens
- CORS is configured for frontend origins

## Database Schema

The application includes the following tables:
- **users** - User accounts with roles (user, admin, chef)
- **categories** - Product categories
- **products** - Menu items
- **orders** - Customer orders
- **order_items** - Items in each order
- **reviews** - Product reviews and ratings
