# Backend Setup Instructions

## Method 1: Using Docker (Recommended)

### Prerequisites
- Docker Desktop installed
- Docker Compose installed

### Steps

1. **Build and run with Docker Compose**:
```bash
cd backend
docker-compose up --build
```

2. **Run migrations** (in another terminal):
```bash
docker-compose exec api alembic upgrade head
```

3. **Create admin user** (Optional):
```bash
docker-compose exec api python -c "
from database import SessionLocal
from models import User
from security import hash_password

db = SessionLocal()
admin = User(
    name='Admin',
    email='admin@example.com',
    password=hash_password('admin123'),
    role='admin'
)
db.add(admin)
db.commit()
print('Admin user created: admin@example.com / admin123')
"
```

4. **Access the API**:
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Database: localhost:5432

---

## Method 2: Manual Installation (Windows)

### Prerequisites
- Python 3.10+ installed
- PostgreSQL installed and running

### Steps

1. **Create virtual environment**:
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

2. **Install dependencies**:
```powershell
pip install -r requirements-simple.txt
```

3. **Create `.env` file**:
```powershell
Copy-Item .env.example .env
```

4. **Edit `.env` with your database credentials**:
```
DATABASE_URL=postgresql://user:password@localhost:5432/restaurant_db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

5. **Create PostgreSQL database**:
```powershell
createdb -U postgres restaurant_db
```

6. **Run migrations**:
```powershell
alembic upgrade head
```

7. **Start the server**:
```powershell
python main.py
```

API will be available at `http://localhost:8000`

---

## API Documentation

### Authentication Endpoints

**Register User**
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Login**
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "is_active": true
  }
}
```

### Categories

**Get All Categories**
```bash
curl http://localhost:8000/categories/
```

**Create Category** (Admin only)
```bash
curl -X POST http://localhost:8000/categories/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Burgers",
    "description": "Delicious burgers",
    "image": "url_to_image"
  }'
```

### Products

**Get All Products**
```bash
curl http://localhost:8000/products/
```

**Get Products by Category**
```bash
curl "http://localhost:8000/products/?category_id=1"
```

**Create Product** (Admin/Chef only)
```bash
curl -X POST http://localhost:8000/products/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hamburger",
    "description": "Classic hamburger",
    "price": 999,
    "category_id": 1,
    "image": "url",
    "is_available": true
  }'
```

### Orders

**Create Order**
```bash
curl -X POST http://localhost:8000/orders/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "delivery_address": "123 Main St",
    "phone": "+998901234567",
    "notes": "No onions please",
    "items": [
      {
        "product_id": 1,
        "quantity": 2
      }
    ]
  }'
```

**Get My Orders**
```bash
curl http://localhost:8000/orders/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Update Order Status** (Admin/Chef)
```bash
curl -X PUT http://localhost:8000/orders/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "preparing"
  }'
```

### Reviews

**Get Product Reviews**
```bash
curl http://localhost:8000/reviews/product/1
```

**Create Review**
```bash
curl -X POST http://localhost:8000/reviews/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "rating": 5,
    "comment": "Excellent food!"
  }'
```

---

## Database Schema

### Users Table
- id (PK)
- name
- email (unique)
- password (hashed)
- role (user/admin/chef)
- is_active
- created_at
- updated_at

### Categories Table
- id (PK)
- name (unique)
- description
- image
- created_at

### Products Table
- id (PK)
- name
- description
- price (in cents)
- image
- category_id (FK)
- is_available
- created_at
- updated_at

### Orders Table
- id (PK)
- user_id (FK)
- status (pending/confirmed/preparing/ready/delivered/cancelled)
- total_price (in cents)
- delivery_address
- phone
- notes
- created_at
- updated_at

### Order Items Table
- id (PK)
- order_id (FK)
- product_id (FK)
- quantity
- price (in cents)

### Reviews Table
- id (PK)
- user_id (FK)
- product_id (FK)
- rating (1-5)
- comment
- created_at

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/restaurant_db

# JWT Configuration
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
```

---

## Troubleshooting

### Port 5432 already in use
Change the PostgreSQL port in docker-compose.yml or stop the other service:
```powershell
Get-Process | Where-Object {$_.Port -eq 5432}
Stop-Process -Name <process_name>
```

### Password hashing issues
Make sure `bcrypt` is properly installed:
```powershell
pip install --upgrade bcrypt
```

### Database connection errors
Verify PostgreSQL is running and credentials are correct:
```powershell
psql -U postgres -h localhost
```

### Migration errors
Reset migrations:
```bash
alembic downgrade base
alembic upgrade head
```

---

## Next Steps

1. Connect your React frontend to this API
2. Update the CORS_ORIGINS in config.py with your frontend URL
3. Implement additional features as needed
4. Deploy to production (Heroku, AWS, DigitalOcean, etc.)

