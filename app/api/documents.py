"""
api/documents.py
----------------
All document-related HTTP endpoints.

Endpoints:
    POST   /documents/upload          – Upload one or more files
    GET    /documents                 – List documents (search / filter / sort)
    GET    /documents/{id}            – Document detail
    POST   /documents/{id}/retry      – Re-trigger a failed job
    PUT    /documents/{id}            – Edit extracted data
    POST   /documents/{id}/finalize   – Lock the record
    GET    /documents/{id}/export     – Export as JSON or CSV
    GET    /documents/{id}/progress   – SSE stream of live progress
"""

import csv
import io
import json
import logging
from typing import List, Optional
from uuid import UUID

import redis as redis_module
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import JSONResponse, StreamingResponse
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.redis_client import get_redis
from app.models.document import DocumentStatus
from app.schemas.document import (
    DocumentDetail,
    DocumentListItem,
    DocumentUploadResponse,
    ExtractedDataUpdate,
    ExportFormat,
)
from app.services import document_service
from app.utils.file_helpers import save_upload_file
from app.workers.tasks import process_document

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["Documents"])


# ─────────────────────────────────────────────────────────────────────────────
# POST /documents/upload
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/upload",
    response_model=List[DocumentUploadResponse],
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload one or more documents",
)
async def upload_documents(
    files: List[UploadFile] = File(..., description="One or more files to process"),
    db:    Session = Depends(get_db),
):
    """
    1. Save each file to disk (async, 64 KB chunks).
    2. Create a DB record (status = Queued).
    3. Fire a Celery task (NON-BLOCKING – returns immediately).
    4. Return metadata for all uploaded files.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    responses = []
    for upload_file in files:
        # Persist file to disk
        meta = await save_upload_file(upload_file)

        # Create DB record
        doc = document_service.create_document(
            db,
            filename=meta["filename"],
            file_type=meta["file_type"],
            size=meta["size"],
        )

        # ⚡ Dispatch background task – this returns IMMEDIATELY
        try:
            process_document.delay(str(doc.id), doc.filename)
            logger.info("Queued Celery task for document %s", doc.id)
        except Exception as e:
            logger.error("Failed to queue Celery task for %s: %s", doc.id, e)

        responses.append(DocumentUploadResponse(
            id=doc.id,
            filename=doc.filename,
            file_type=doc.file_type,
            size=doc.size,
            status=doc.status,
            upload_timestamp=doc.created_at,
        ))

    return responses


# ─────────────────────────────────────────────────────────────────────────────
# GET /documents
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=List[DocumentListItem],
    summary="List documents with search / filter / sort",
)
def list_documents(
    search:   Optional[str] = Query(None, description="Partial filename match"),
    status_f: Optional[str] = Query(None, alias="status", description="Filter by status"),
    sort_by:  str           = Query("created_at", enum=["created_at", "filename"]),
    sort_dir: str           = Query("desc", enum=["asc", "desc"]),
    skip:     int           = Query(0, ge=0),
    limit:    int           = Query(50, ge=1, le=200),
    db:       Session       = Depends(get_db),
):
    docs = document_service.list_documents(
        db,
        search=search,
        status=status_f,
        sort_by=sort_by,
        sort_dir=sort_dir,
        skip=skip,
        limit=limit,
    )
    return docs


# ─────────────────────────────────────────────────────────────────────────────
# GET /documents/{id}
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/{document_id}",
    response_model=DocumentDetail,
    summary="Get full document detail",
)
def get_document(document_id: UUID, db: Session = Depends(get_db)):
    doc = document_service.get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc


# ─────────────────────────────────────────────────────────────────────────────
# POST /documents/{id}/retry
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/{document_id}/retry",
    response_model=DocumentDetail,
    summary="Re-trigger processing for a failed document",
)
def retry_document(document_id: UUID, db: Session = Depends(get_db)):
    doc = document_service.get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if doc.status != DocumentStatus.FAILED:
        raise HTTPException(
            status_code=400,
            detail=f"Only Failed documents can be retried. Current status: {doc.status}",
        )

    # Reset to Queued
    doc = document_service.update_status(db, document_id, DocumentStatus.QUEUED)

    # Re-dispatch Celery task
    try:
        process_document.delay(str(doc.id), doc.filename)
        logger.info("Retried document %s", document_id)
    except Exception as e:
        logger.error("Failed to queue Celery task for %s: %s", doc.id, e)
    return doc


# ─────────────────────────────────────────────────────────────────────────────
# PUT /documents/{id}
# ─────────────────────────────────────────────────────────────────────────────

@router.put(
    "/{document_id}",
    response_model=DocumentDetail,
    summary="Edit extracted data (title / category / summary / keywords)",
)
def update_document(
    document_id: UUID,
    payload:     ExtractedDataUpdate,
    db:          Session = Depends(get_db),
):
    try:
        doc = document_service.update_extracted_data(db, document_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc


# ─────────────────────────────────────────────────────────────────────────────
# POST /documents/{id}/finalize
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/{document_id}/finalize",
    response_model=DocumentDetail,
    summary="Lock the document – no further edits after this",
)
def finalize_document(document_id: UUID, db: Session = Depends(get_db)):
    try:
        doc = document_service.finalize_document(db, document_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc


# ─────────────────────────────────────────────────────────────────────────────
# GET /documents/{id}/export
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/{document_id}/export",
    summary="Export document metadata as JSON or CSV",
)
def export_document(
    document_id: UUID,
    format: ExportFormat = Query(ExportFormat.JSON, description="json | csv"),
    db: Session = Depends(get_db),
):
    doc = document_service.get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    data = {
        "id":             str(doc.id),
        "filename":       doc.filename,
        "file_type":      doc.file_type,
        "size":           doc.size,
        "status":         doc.status.value,
        "created_at":     doc.created_at.isoformat(),
        "updated_at":     doc.updated_at.isoformat(),
        "is_finalized":   doc.is_finalized,
        "extracted_data": doc.extracted_data or {},
    }

    if format == ExportFormat.JSON:
        return JSONResponse(
            content=data,
            headers={"Content-Disposition": f'attachment; filename="{doc.id}.json"'},
        )

    # ── CSV export ─────────────────────────────────────────────────────────
    buf = io.StringIO()
    writer = csv.writer(buf)

    # Flatten extracted_data into top-level columns
    flat = {**{k: v for k, v in data.items() if k != "extracted_data"}}
    extracted = data.get("extracted_data", {})
    for k, v in extracted.items():
        flat[f"extracted_{k}"] = json.dumps(v) if isinstance(v, (list, dict)) else v

    writer.writerow(flat.keys())
    writer.writerow(flat.values())

    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{doc.id}.csv"'},
    )


# ─────────────────────────────────────────────────────────────────────────────
# GET /documents/{id}/progress  (Server-Sent Events)
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/{document_id}/progress",
    summary="Stream real-time processing progress via Server-Sent Events",
)
async def stream_progress(
    document_id: UUID,
    db:          Session = Depends(get_db),
    r:           redis_module.Redis = Depends(get_redis),
):
    """
    Subscribe to Redis Pub/Sub channel and forward events as SSE.

    The client receives events in the shape:
        data: {"document_id": "...", "status": "processing", "step": "parsing_started", "progress": 40}

    The stream closes automatically when progress reaches 100
    or the document reaches a terminal state (Completed / Failed / Finalized).
    """
    # Verify document exists before opening the SSE stream
    doc = document_service.get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    async def event_generator():
        # Create a new pub/sub connection per SSE client
        pubsub = r.pubsub()
        pubsub.subscribe(settings.progress_channel)
        logger.info("SSE client subscribed for document %s", document_id)

        try:
            # If already done, send a synthetic final event and close
            if doc.status in (DocumentStatus.COMPLETED, DocumentStatus.FAILED, DocumentStatus.FINALIZED):
                yield {
                    "data": json.dumps({
                        "document_id": str(document_id),
                        "status":      doc.status.value,
                        "step":        "already_completed",
                        "progress":    100,
                    })
                }
                return

            for message in pubsub.listen():
                if message["type"] != "message":
                    continue

                try:
                    event = json.loads(message["data"])
                except json.JSONDecodeError:
                    continue

                # Only forward events for THIS document
                if event.get("document_id") != str(document_id):
                    continue

                yield {"data": json.dumps(event)}

                # Close the stream once processing is terminal
                if event.get("progress", 0) >= 100 or event.get("status") in ("failed", "completed"):
                    break

        finally:
            pubsub.unsubscribe(settings.progress_channel)
            pubsub.close()
            logger.info("SSE stream closed for document %s", document_id)

    return EventSourceResponse(event_generator())
