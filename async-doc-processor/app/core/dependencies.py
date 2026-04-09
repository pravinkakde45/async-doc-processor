"""
core/dependencies.py
FastAPI dependency functions for clean injection.
"""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.document_service import DocumentService


async def get_document_service(db: AsyncSession = Depends(get_db)) -> DocumentService:
    """Inject DocumentService with a live DB session."""
    return DocumentService(db)
