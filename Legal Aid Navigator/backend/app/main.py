"""
FastAPI application entrypoint.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database import engine, Base, ensure_columns
from app.routers import auth, requests, discovery, admin

# Create all tables on startup (best-effort – remote DB user may lack CREATE privilege)
try:
    Base.metadata.create_all(bind=engine)
    ensure_columns()
except Exception as _schema_err:
    import logging as _log
    _log.getLogger(__name__).warning(
        "Schema init skipped (tables likely already exist): %s", _schema_err
    )

app = FastAPI(
    title="Legal Aid Navigator API",
    version="1.0.0",
    description="Backend for the Legal Aid Navigator – legal-aid discovery, eligibility, and appointment booking.",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(auth.router)
app.include_router(requests.router)
app.include_router(discovery.router)
app.include_router(admin.router)


@app.on_event("startup")
def _seed():
    from app.seed import seed_demo_data
    seed_demo_data()


@app.get("/", tags=["health"])
def health():
    return {"status": "ok", "app": "Legal Aid Navigator API"}
