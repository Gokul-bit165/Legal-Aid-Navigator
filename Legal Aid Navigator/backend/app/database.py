from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

# Create engine – handle SQLite (needs special connect_args) and MySQL (no extra args)
if settings.DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    # For MySQL / TiDB use the default engine creation (SQLAlchemy will pick the appropriate driver)
    engine = create_engine(settings.DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency – yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_columns():
    """Lightweight migration: add columns introduced after a database was first created."""
    from sqlalchemy import inspect, text

    wanted = {
        "users": {"role": "VARCHAR DEFAULT 'applicant'"},
        "legal_aid_requests": {
            "admin_status": "VARCHAR", "admin_notes": "TEXT",
            "is_urgent": "BOOLEAN DEFAULT 0", "urgent_reason": "VARCHAR",
            "fee_detected": "BOOLEAN DEFAULT 0", "fee_details": "VARCHAR",
            "n8n_request_id": "VARCHAR", "service_id": "VARCHAR", "service_name": "VARCHAR",
            "service_match_status": "VARCHAR", "booking_reference": "VARCHAR",
        },
    }
    insp = inspect(engine)
    with engine.begin() as conn:
        for table, cols in wanted.items():
            if not insp.has_table(table):
                continue
            have = {c["name"] for c in insp.get_columns(table)}
            for name, ddl in cols.items():
                if name not in have:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
