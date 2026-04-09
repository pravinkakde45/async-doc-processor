"""
core/config.py
--------------
Centralised settings loaded from environment variables (or .env file).
All configurable values live here — no magic strings scattered in code.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Application ──────────────────────────────────────────────────────────
    app_name: str = "AsyncDocProcessor"
    app_env: str = "development"
    debug: bool = True
    secret_key: str = "change-me-in-production"

    # ── PostgreSQL ────────────────────────────────────────────────────────────
    database_url: str = "postgresql://postgres:postgres@localhost:5432/doc_processor"

    # ── Redis ─────────────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── Celery ────────────────────────────────────────────────────────────────
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    # ── File Upload ───────────────────────────────────────────────────────────
    upload_dir: str = "./uploads"
    max_file_size_mb: int = 50

    # ── Redis Pub/Sub ─────────────────────────────────────────────────────────
    progress_channel: str = "document_progress"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    """Return a cached singleton of Settings."""
    return Settings()


settings = get_settings()
