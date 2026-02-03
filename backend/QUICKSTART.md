# 🍽️ Restaurant Backend - Complete Setup

Your complete backend is ready! Here's what has been created:

## 📦 What's Included

### **Core Backend Files**
- ✅ **main.py** - FastAPI application entry point
- ✅ **config.py** - Configuration management
- ✅ **database.py** - SQLAlchemy ORM setup
- ✅ **security.py** - JWT tokens & password hashing with bcrypt

### **Database Models (SQLAlchemy)**
- ✅ **User** - User authentication & roles (user/admin/chef)
- ✅ **Category** - Product categories
- ✅ **Product** - Menu items with pricing
- ✅ **Order** - Order management with status tracking
- ✅ **OrderItem** - Items in orders
- ✅ **Review** - Product ratings & reviews

### **API Endpoints**
- ✅ **Authentication** - Register, Login, JWT tokens
- ✅ **Categories** - Full CRUD (admin only)
- ✅ **Products** - Create, Read, Update, Delete
- ✅ **Orders** - Order management with authorization
- ✅ **Reviews** - Product reviews & ratings

### **Database Migrations (Alembic)**
- ✅ **Initial migration** - All tables auto-created
- ✅ **Alembic setup** - Version control for DB schema

### **Deployment Files**
- ✅ **Dockerfile** - Docker containerization
- ✅ **docker-compose.yml** - Multi-container orchestration
- ✅ **setup.sh** - Linux/Mac quick setup
- ✅ **setup.bat** - Windows quick setup

### **Documentation**
- ✅ **README.md** - API documentation
- ✅ **SETUP.md** - Detailed setup instructions
- ✅ **requirements-simple.txt** - Python dependencies

---

## 🚀 Quick Start

### **Option 1: Docker (Recommended)**
```bash
cd backend
docker-compose up --build
```

Then open: http://localhost:8000/docs

### **Option 2: Windows Manual Setup**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements-simple.txt
# Create PostgreSQL database first
python main.py
```

---

## 📋 File Structure

```
backend/
├── alembic/
│   └── versions/
│       └── 001_initial.py          # Database migration
├── models/
│   ├── __init__.py                 # All database models
│   └── models.py                   # Model exports
├── routes/
│   ├── __init__.py
│   ├── auth.py                     # Authentication endpoints
│   ├── categories.py               # Categories endpoints
│   ├── products.py                 # Products endpoints
│   ├── orders.py                   # Orders endpoints
│   └── reviews.py                  # Reviews endpoints
├── schemas/
│   ├── __init__.py                 # All Pydantic schemas
│   └── schemas.py                  # Schema exports
├── config.py                        # Configuration
├── database.py                      # Database setup
├── security.py                      # JWT & Password hashing
├── main.py                          # FastAPI app
├── Dockerfile                       # Docker image
├── docker-compose.yml               # Docker Compose config
├── requirements.txt                 # Exact dependencies
├── requirements-simple.txt          # Flexible dependencies
├── .env.example                     # Example environment file
├── setup.sh                         # Linux/Mac setup script
├── setup.bat                        # Windows setup script
├── README.md                        # API documentation
├── SETUP.md                         # Detailed setup guide
└── .gitignore                       # Git ignore file
```

---

## 🔐 Security Features

- ✅ **Bcrypt password hashing** - Industry standard
- ✅ **JWT authentication** - Secure token-based auth
- ✅ **Role-based access control** - user/admin/chef roles
- ✅ **CORS protection** - Configurable origins
- ✅ **Input validation** - Pydantic validation
- ✅ **SQL injection protection** - SQLAlchemy ORM

---

## 🛠️ Technology Stack

| Technology | Purpose |
|-----------|---------|
| FastAPI | Web framework |
| Uvicorn | ASGI server |
| SQLAlchemy | ORM |
| PostgreSQL | Database |
| Alembic | Migrations |
| Pydantic | Validation |
| JWT | Authentication |
| Bcrypt | Password hashing |
| Docker | Containerization |

---

## 📝 Environment Variables

Create a `.env` file:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/restaurant_db
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
```

---

## 🧪 Testing the API

### Register a user:
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":"John Doe",
    "email":"john@example.com",
    "password":"password123"
  }'
```

### Login:
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"john@example.com",
    "password":"password123"
  }'
```

### View API Docs:
```
http://localhost:8000/docs
```

---

## 🔗 Connect to React Frontend

Update your React API client to use:

```javascript
const API_URL = 'http://localhost:8000';

// Login example
const login = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  localStorage.setItem('token', data.access_token);
  return data;
};

// Get products
const getProducts = async () => {
  const response = await fetch(`${API_URL}/products/`);
  return response.json();
};

// Create order with auth
const createOrder = async (orderData) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/orders/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(orderData)
  });
  return response.json();
};
```

---

## 📚 Next Steps

1. ✅ Backend setup complete
2. ⏭️ **Next**: Start the backend with Docker or manual setup
3. ⏭️ **Then**: Connect your React frontend
4. ⏭️ **Finally**: Deploy to production

---

## 🆘 Help & Support

- **API Docs**: http://localhost:8000/docs
- **Database**: localhost:5432 (with Docker)
- **Logs**: `docker-compose logs -f api`

---

## ⚠️ Important Notes

- Change `SECRET_KEY` in production
- Use environment variables for sensitive data
- Enable HTTPS in production
- Configure proper CORS origins
- Set up proper logging and monitoring
- Backup your database regularly

---

**Happy coding! 🎉**
