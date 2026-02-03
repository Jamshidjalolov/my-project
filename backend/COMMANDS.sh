#!/bin/bash
# Quick Command Reference for Restaurant Backend

echo "========================================"
echo "  Restaurant Backend - Command Reference"
echo "========================================"
echo ""

# Docker Commands
echo "📦 DOCKER COMMANDS"
echo "  docker-compose up                 # Start all services"
echo "  docker-compose up -d              # Start in background"
echo "  docker-compose down               # Stop all services"
echo "  docker-compose logs -f api        # View API logs"
echo "  docker-compose logs -f postgres   # View DB logs"
echo "  docker-compose build              # Rebuild images"
echo ""

# Python Commands
echo "🐍 PYTHON COMMANDS"
echo "  python -m venv venv               # Create virtual env"
echo "  source venv/bin/activate          # Activate venv (Linux/Mac)"
echo "  venv\\Scripts\\Activate.ps1        # Activate venv (Windows)"
echo "  pip install -r requirements.txt   # Install dependencies"
echo "  python main.py                    # Run server"
echo ""

# Database Commands
echo "🗄️  DATABASE COMMANDS"
echo "  alembic init alembic              # Initialize migrations"
echo "  alembic revision --autogenerate   # Create migration"
echo "  alembic upgrade head              # Run migrations"
echo "  alembic downgrade base            # Revert migrations"
echo "  alembic current                   # Check current version"
echo ""

# PostgreSQL Commands
echo "🐘 POSTGRESQL COMMANDS"
echo "  createdb restaurant_db            # Create database"
echo "  dropdb restaurant_db              # Delete database"
echo "  psql -U postgres -d restaurant_db # Connect to database"
echo "  \\dt                              # List tables (in psql)"
echo "  \\d users                         # Show table structure (in psql)"
echo ""

# API Testing
echo "🧪 API TESTING"
echo "  curl http://localhost:8000/health          # Health check"
echo "  curl http://localhost:8000/docs            # API documentation"
echo "  curl http://localhost:8000/openapi.json    # OpenAPI spec"
echo ""

# File Management
echo "📁 FILE MANAGEMENT"
echo "  cp .env.example .env              # Create .env file"
echo "  rm .env                           # Remove .env file"
echo "  tree -L 2                         # Show directory tree"
echo "  find . -name '*.py' | wc -l       # Count Python files"
echo ""

# Useful Tips
echo "💡 USEFUL TIPS"
echo "  1. Always activate venv before running pip"
echo "  2. Update .env with your database credentials"
echo "  3. Run migrations before starting API"
echo "  4. Use docker-compose for easier setup"
echo "  5. Check logs if something goes wrong"
echo ""

echo "========================================"
echo "  More info: See README.md, SETUP.md"
echo "========================================"
