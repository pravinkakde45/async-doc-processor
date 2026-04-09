"""
workers/celery_app.py
---------------------
Celery application factory.

The broker and result backend are both Redis (different DB indexes).
All tasks are auto-discovered from the `workers` package.
"""

from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "doc_processor",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.workers.tasks"],   # task modules to auto-discover
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    # Retry failed tasks up to 3 times with exponential back-off
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,    # fair dispatch
)
