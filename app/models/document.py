"""
models/document.py
------------------
SQLAlchemy ORM model for the `documents` table.

Columns:
    id               – UUID primary key
    filename         – original file name
    file_type        – MIME type or extension
    size             – bytes
    status           – enum: Queued / Processing / Completed / Failed / Finalized
    created_at       – upload timestamp
    updated_at       – last-modified timestamp (auto-updated)
    extracted_data   – JSON blob: title, category, summary, keywords, error
    is_finalized     – locked flag; finalized docs cannot be modified
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, DateTime, Boolean, Text, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class DocumentStatus(str, enum.Enum):
    QUEUED      = "Queued"
    PROCESSING  = "Processing"
    COMPLETED   = "Completed"
    FAILED      = "Failed"
    FINALIZED   = "Finalized"


class Document(Base):
    __tablename__ = "documents"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    filename       = Column(String(512),  nullable=False)
    file_type      = Column(String(128),  nullable=False)
    size           = Column(Integer,      nullable=False)   # bytes
    status         = Column(
        SAEnum(DocumentStatus, name="document_status"),
        nullable=False,
        default=DocumentStatus.QUEUED,
        index=True,
    )
    created_at     = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at     = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    # Flexible JSON field: stores extracted data AND error messages
    extracted_data = Column(JSONB, nullable=True, default=dict)
    is_finalized   = Column(Boolean, default=False, nullable=False)

    def __repr__(self):
        return f"<Document id={self.id} filename={self.filename!r} status={self.status}>"
