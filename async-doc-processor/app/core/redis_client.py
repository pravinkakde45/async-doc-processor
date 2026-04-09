"""
core/redis_client.py
--------------------
Thin wrapper around the redis-py client.

* `redis_client`  – synchronous client used by Celery workers and the pub/sub
                    publisher inside tasks.
* `get_redis()`   – async-compatible getter for FastAPI SSE endpoint that
                    subscribes to the progress channel.

We use a single connection pool so the process doesn't open N sockets.
"""

import json
import logging
import redis
from app.core.config import settings

logger = logging.getLogger(__name__)

# Synchronous client (used by Celery tasks + publish helper)
redis_client = redis.from_url(
    settings.redis_url,
    decode_responses=True,      # strings, not bytes
)


def publish_progress(document_id: str, step: str, progress: int, status: str = "processing"):
    """
    Publish a structured progress event to the Redis Pub/Sub channel.

    Payload shape:
        {
            "document_id": "...",
            "status":      "processing",
            "step":        "parsing_started",
            "progress":    40
        }
    """
    payload = {
        "document_id": document_id,
        "status": status,
        "step": step,
        "progress": progress,
    }
    channel = settings.progress_channel
    redis_client.publish(channel, json.dumps(payload))
    logger.debug("Published [%s] → channel=%s progress=%s%%", step, channel, progress)


def get_redis() -> redis.Redis:
    """Return the shared synchronous Redis client (FastAPI dependency)."""
    return redis_client
