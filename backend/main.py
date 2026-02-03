from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from models import User, Category, Product, Order, OrderItem, Review, Slide, Main7Item, Main8Content, Main6Content
from routes import auth, categories, products, orders, reviews, users, slides, main7, main8, main6
from config import settings

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Restaurant API",
    description="Full-stack restaurant management API",
    version="1.0.0"
)

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    components = schema.setdefault("components", {})
    security_schemes = components.setdefault("securitySchemes", {})
    existing_scheme = next(iter(security_schemes.keys()), None)
    scheme_name = existing_scheme or "BearerAuth"
    if not existing_scheme:
        security_schemes.setdefault(
            scheme_name,
            {"type": "http", "scheme": "bearer"},
        )

    for path_data in schema.get("paths", {}).values():
        for operation in path_data.values():
            parameters = operation.get("parameters") or []
            if any(
                p.get("in") == "header" and p.get("name", "").lower() == "authorization"
                for p in parameters
            ):
                operation["parameters"] = [
                    p
                    for p in parameters
                    if not (p.get("in") == "header" and p.get("name", "").lower() == "authorization")
                ]
                operation.setdefault("security", []).append({scheme_name: []})

    app.openapi_schema = schema
    return app.openapi_schema

app.openapi = custom_openapi

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(reviews.router)
app.include_router(users.router)
app.include_router(slides.router)
app.include_router(main7.router)
app.include_router(main8.router)
app.include_router(main6.router)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to Restaurant API",
        "docs": "/docs",
        "openapi": "/openapi.json"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
