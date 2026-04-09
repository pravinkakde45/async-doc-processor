"""
core/database.py
----------------
SQLAlchemy engine + session factory + Base for all ORM models.
Uses synchronous psycopg2 driver (Celery workers are sync).
FastAPI endpoints use the get_db() dependency to get a scoped session.
"""

import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Engine ────────────────────────────────────────────────────────────────────
# pool_pre_ping keeps stale connections from failing silently
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=settings.debug,          # SQL query logging in dev
)

# ── Session factory ───────────────────────────────────────────────────────────
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Declarative Base ──────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── FastAPI Dependency ────────────────────────────────────────────────────────
def get_db():
    """Yield a DB session; close it automatically when the request is done."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db():
    """Create all tables (called at app startup)."""
    from app.models import document  # noqa: F401 – registers models with Base
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created / verified.")
