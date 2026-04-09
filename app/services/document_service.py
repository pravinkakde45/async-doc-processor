"""
services/document_service.py
-----------------------------
All business logic for documents lives here.
Routes call service functions; service functions talk to the DB.
This keeps routes thin and logic testable.
"""

import logging
from typing import List, Optional
from uuid import UUID

from sqlalchemy import asc, desc, or_
from sqlalchemy.orm import Session

from app.models.document import Document, DocumentStatus
from app.schemas.document import ExtractedDataUpdate

logger = logging.getLogger(__name__)


# ── Create ────────────────────────────────────────────────────────────────────

def create_document(db: Session, *, filename: str, file_type: str, size: int) -> Document:
    """Insert a new document record with QUEUED status."""
    doc = Document(
        filename=filename,
        file_type=file_type,
        size=size,
        status=DocumentStatus.QUEUED,
        extracted_data={},
        is_finalized=False,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    logger.info("Created document %s (%s)", doc.id, doc.filename)
    return doc


# ── Read ──────────────────────────────────────────────────────────────────────

def get_document(db: Session, document_id: UUID) -> Optional[Document]:
    """Return a single document or None."""
    return db.query(Document).filter(Document.id == document_id).first()


def list_documents(
    db: Session,
    *,
    search:   Optional[str] = None,
    status:   Optional[str] = None,
    sort_by:  str = "created_at",
    sort_dir: str = "desc",
    skip:     int = 0,
    limit:    int = 50,
) -> List[Document]:
    """
    Paginated list with optional search and filter.

    search   – partial match on filename (case-insensitive)
    status   – exact DocumentStatus value
    sort_by  – 'created_at' | 'filename'
    sort_dir – 'asc' | 'desc'
    """
    q = db.query(Document)

    if search:
        q = q.filter(Document.filename.ilike(f"%{search}%"))

    if status:
        try:
            q = q.filter(Document.status == DocumentStatus(status))
        except ValueError:
            pass  # ignore unknown status; return unfiltered

    sort_col = Document.created_at if sort_by == "created_at" else Document.filename
    q = q.order_by(desc(sort_col) if sort_dir == "desc" else asc(sort_col))

    return q.offset(skip).limit(limit).all()


# ── Update ────────────────────────────────────────────────────────────────────

def update_status(db: Session, document_id: UUID, status: DocumentStatus, error: Optional[str] = None) -> Optional[Document]:
    """Update document status; optionally store an error message."""
    doc = get_document(db, document_id)
    if not doc:
        return None
    doc.status = status
    if error:
        data = dict(doc.extracted_data or {})
        data["error"] = error
        doc.extracted_data = data
    db.commit()
    db.refresh(doc)
    return doc


def update_extracted_data(db: Session, document_id: UUID, payload: ExtractedDataUpdate) -> Optional[Document]:
    """Merge user-supplied fields into extracted_data JSON."""
    doc = get_document(db, document_id)
    if not doc:
        return None
    if doc.is_finalized:
        raise ValueError("Document is finalized and cannot be modified.")

    data = dict(doc.extracted_data or {})
    update_fields = payload.model_dump(exclude_none=True)
    data.update(update_fields)
    doc.extracted_data = data
    db.commit()
    db.refresh(doc)
    logger.info("Updated extracted_data for document %s", document_id)
    return doc


def finalize_document(db: Session, document_id: UUID) -> Optional[Document]:
    """Lock the document – no further edits allowed."""
    doc = get_document(db, document_id)
    if not doc:
        return None
    if doc.is_finalized:
        return doc  # idempotent
    if doc.status not in (DocumentStatus.COMPLETED, DocumentStatus.FAILED):
        raise ValueError("Only Completed or Failed documents can be finalized.")
    doc.is_finalized = True
    doc.status = DocumentStatus.FINALIZED
    db.commit()
    db.refresh(doc)
    logger.info("Finalized document %s", document_id)
    return doc
