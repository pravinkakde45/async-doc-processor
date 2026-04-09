"""
workers/tasks.py
----------------
Celery tasks for asynchronous document processing.

Processing pipeline (7 steps):
    1. document_received      →   5 %
    2. parsing_started        →  20 %
    3. parsing_completed      →  40 %
    4. extraction_started     →  55 %
    5. extraction_completed   →  75 %
    6. final_result_stored    →  90 %
    7. job_completed          → 100 %

Each step:
    • Updates the document status/data in PostgreSQL
    • Publishes a progress event to Redis Pub/Sub channel

IMPORTANT: No file processing happens inside the API request cycle.
           The API only creates the DB record and fires this task.
"""

import time
import logging
import random
from uuid import UUID

from celery import Task
from app.workers.celery_app import celery_app
from app.core.database import SessionLocal
from app.core.redis_client import publish_progress
from app.models.document import Document, DocumentStatus

logger = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _update_db(db, document_id: str, status: DocumentStatus, extra_data: dict = None):
    """Update document status + optionally merge extracted_data fields."""
    doc: Document = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise ValueError(f"Document {document_id} not found in DB")
    doc.status = status
    if extra_data:
        merged = dict(doc.extracted_data or {})
        merged.update(extra_data)
        doc.extracted_data = merged
    db.commit()
    db.refresh(doc)
    return doc


def _step(db, document_id: str, step: str, progress: int,
          status: DocumentStatus = DocumentStatus.PROCESSING,
          extra_data: dict = None, delay: float = 1.0):
    """
    Unified step runner:
        1. Sleep to simulate real work
        2. Update DB
        3. Publish Redis event
    """
    time.sleep(delay)
    _update_db(db, document_id, status, extra_data)
    publish_progress(document_id, step=step, progress=progress, status=status.value)
    logger.info("[%s] doc=%s progress=%d%%", step, document_id, progress)


# ── Mock extraction logic ─────────────────────────────────────────────────────

def _mock_extract(filename: str) -> dict:
    """Return fake extracted data – replace with real NLP/OCR in production."""
    categories = ["Finance", "Legal", "Medical", "Technical", "General"]
    return {
        "title":    f"Processed: {filename}",
        "category": random.choice(categories),
        "summary":  (
            f"This document '{filename}' was automatically analysed. "
            "The content contains structured information relevant to the assigned category."
        ),
        "keywords": ["async", "document", "processing", "celery", filename.split(".")[0]],
        "pages":    random.randint(1, 50),
        "language": "en",
    }


# ── Celery Task ───────────────────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    name="tasks.process_document",
    max_retries=3,
    default_retry_delay=30,   # seconds before retry
    soft_time_limit=300,       # 5 min soft limit
    time_limit=360,            # 6 min hard limit
)
def process_document(self: Task, document_id: str, filename: str):
    """
    Main document processing task.

    Parameters
    ----------
    document_id : str   UUID of the document record in PostgreSQL
    filename    : str   Original filename (used for mock extraction)
    """
    db = SessionLocal()
    try:
        logger.info("Starting processing for document %s", document_id)

        # ── Step 1: document_received ────────────────────────────────────────
        _step(db, document_id, "document_received", 5,  delay=0.5)

        # ── Step 2: parsing_started ──────────────────────────────────────────
        _step(db, document_id, "parsing_started",   20, delay=1.5)

        # ── Step 3: parsing_completed ────────────────────────────────────────
        _step(db, document_id, "parsing_completed", 40, delay=1.5)

        # ── Step 4: extraction_started ───────────────────────────────────────
        _step(db, document_id, "extraction_started", 55, delay=1.0)

        # ── Step 5: extraction_completed (attach mock data) ──────────────────
        extracted = _mock_extract(filename)
        _step(db, document_id, "extraction_completed", 75, extra_data=extracted, delay=2.0)

        # ── Step 6: final_result_stored ──────────────────────────────────────
        _step(db, document_id, "final_result_stored", 90, delay=1.0)

        # ── Step 7: job_completed ────────────────────────────────────────────
        _step(
            db, document_id, "job_completed", 100,
            status=DocumentStatus.COMPLETED,
            delay=0.5,
        )

        logger.info("Document %s processed successfully.", document_id)
        return {"document_id": document_id, "result": "success"}

    except Exception as exc:
        logger.exception("Error processing document %s: %s", document_id, exc)

        # Mark as FAILED in DB + publish failure event
        try:
            _update_db(db, document_id, DocumentStatus.FAILED, {"error": str(exc)})
            publish_progress(document_id, step="job_failed", progress=0, status="failed")
        except Exception as inner:
            logger.error("Failed to update FAILED status: %s", inner)

        # Celery retry (raises Retry exception internally)
        raise self.retry(exc=exc)

    finally:
        db.close()
