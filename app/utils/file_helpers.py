"""
utils/file_helpers.py
---------------------
Small helpers for file handling – kept here so routes stay thin.
"""

import os
import uuid
import logging
import aiofiles
from pathlib import Path
from fastapi import UploadFile
from app.core.config import settings

logger = logging.getLogger(__name__)


def ensure_upload_dir() -> Path:
    """Create the upload directory if it doesn't exist."""
    path = Path(settings.upload_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


async def save_upload_file(upload_file: UploadFile) -> dict:
    """
    Persist an uploaded file to disk and return its metadata.

    Returns:
        {
            "filename":  original name,
            "file_type": content_type or extension,
            "size":      bytes written,
            "disk_path": absolute path on server,
        }
    """
    upload_dir = ensure_upload_dir()
    unique_name = f"{uuid.uuid4()}_{upload_file.filename}"
    dest_path   = upload_dir / unique_name

    size = 0
    async with aiofiles.open(dest_path, "wb") as out:
        while chunk := await upload_file.read(1024 * 64):  # 64 KB chunks
            await out.write(chunk)
            size += len(chunk)

    file_type = upload_file.content_type or Path(upload_file.filename).suffix or "unknown"
    logger.info("Saved upload: %s (%d bytes) → %s", upload_file.filename, size, dest_path)

    return {
        "filename":  upload_file.filename,
        "file_type": file_type,
        "size":      size,
        "disk_path": str(dest_path),
    }
