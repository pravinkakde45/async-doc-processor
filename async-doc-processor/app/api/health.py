"""
api/health.py
Health check endpoint — used by Docker, Kubernetes, load balancers.
"""

from fastapi import APIRouter
from app.core.redis_client import redis_client
from app.core.database import engine

router = APIRouter(tags=["Health"])


@router.get("/health", summary="System health check")
async def health():
    checks = {"api": "ok", "redis": "unknown", "database": "unknown"}

    # Redis ping
    try:
        redis_client.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {e}"

    # DB ping
    try:
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"

    overall = "ok" if all(v == "ok" for v in checks.values()) else "degraded"
    return {"status": overall, "checks": checks}
