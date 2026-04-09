"""
schemas/document.py
-------------------
Pydantic v2 schemas for request validation and response serialisation.

Separation:
    DocumentUploadResponse  – returned right after file upload
    DocumentListItem        – compact item in GET /documents list
    DocumentDetail          – full record from GET /documents/{id}
    ExtractedDataUpdate     – body for PUT /documents/{id}
    ExportFormat            – query param enum for GET /documents/{id}/export
"""

from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


# ── Shared ────────────────────────────────────────────────────────────────────

class DocumentStatus(str, Enum):
    QUEUED     = "Queued"
    PROCESSING = "Processing"
    COMPLETED  = "Completed"
    FAILED     = "Failed"
    FINALIZED  = "Finalized"


class ExportFormat(str, Enum):
    JSON = "json"
    CSV  = "csv"


# ── Responses ─────────────────────────────────────────────────────────────────

class DocumentUploadResponse(BaseModel):
    """Returned for each file after POST /documents/upload."""
    id:               UUID
    filename:         str
    file_type:        str
    size:             int
    status:           DocumentStatus
    upload_timestamp: datetime

    model_config = {"from_attributes": True}


class DocumentListItem(BaseModel):
    id:           UUID
    filename:     str
    file_type:    str
    size:         int
    status:       DocumentStatus
    created_at:   datetime
    updated_at:   datetime
    is_finalized: bool

    model_config = {"from_attributes": True}


class DocumentDetail(BaseModel):
    id:             UUID
    filename:       str
    file_type:      str
    size:           int
    status:         DocumentStatus
    created_at:     datetime
    updated_at:     datetime
    extracted_data: Optional[Dict[str, Any]] = None
    is_finalized:   bool

    model_config = {"from_attributes": True}


# ── Request bodies ────────────────────────────────────────────────────────────

class ExtractedDataUpdate(BaseModel):
    """Body for PUT /documents/{id} – all fields optional."""
    title:    Optional[str]       = Field(None, max_length=512)
    category: Optional[str]       = Field(None, max_length=256)
    summary:  Optional[str]       = None
    keywords: Optional[List[str]] = None


# ── Progress event (published to Redis, streamed via SSE) ─────────────────────

class ProgressEvent(BaseModel):
    document_id: str
    status:      str
    step:        str
    progress:    int  # 0-100
