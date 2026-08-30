from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import engine, Base
from backend.api.routes import router as routes_router
from backend.api.shipments import router as shipments_router
from backend.api.recommendations import router as settings_router
from backend.api.environmental import router as environmental_router
from backend.api.carbon import router as carbon_router

# Create all DB tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PharmaGuard AI",
    description="AI-powered pharmaceutical cold-chain intelligence and route optimization platform.",
    version="1.0.0",
)

# Allow frontend dev server and Vercel production domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:3000", "http://localhost:1573",
        "https://pharmaguard-backend.vercel.app",
        "https://*.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(routes_router, prefix="/api")
app.include_router(shipments_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(environmental_router, prefix="/api")
app.include_router(carbon_router, prefix="/api")



@app.get("/")
def root():
    """Root endpoint — returns API info."""
    return {
        "name": "PharmaGuard AI",
        "version": "1.0.0",
        "status": "running",
        "api_docs": "http://localhost:8000/docs",
        "health": "http://localhost:8000/api/health",
    }


@app.get("/api/health")
def health_check():
    """Health check endpoint — also signals FortyGuard status."""
    from backend.database import SessionLocal
    from backend.models import BackendSettings

    db = SessionLocal()
    try:
        db_settings = db.query(BackendSettings).first()
        has_key = (
            db_settings is not None
            and db_settings.fortyguard_api_key is not None
            and db_settings.fortyguard_api_key != ""
        )
    finally:
        db.close()

    return {
        "status": "ok",
        "fortyguard_status": "LIVE" if has_key else "NO_KEY",
        "version": "1.0.0",
    }
