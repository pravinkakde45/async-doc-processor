import pytest
from unittest.mock import patch
from app.models.document import DocumentStatus

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

@patch("app.api.documents.process_document.delay")
def test_upload_documents(mock_delay, client, db_session):
    # Create a dummy file
    files = {"files": ("test1.pdf", b"%PDF-1.4 mock content", "application/pdf")}
    
    response = client.post("/api/v1/documents/upload", files=files)
    assert response.status_code == 202
    data = response.json()
    assert len(data) == 1
    
    doc = data[0]
    assert doc["filename"] == "test1.pdf"
    assert doc["status"] == DocumentStatus.QUEUED.value
    
    # Assert delay was called
    mock_delay.assert_called_once()
    assert mock_delay.call_args[0][0] == doc["id"]
    assert mock_delay.call_args[0][1] == "test1.pdf"

def test_list_documents_empty(client):
    response = client.get("/api/v1/documents")
    assert response.status_code == 200
    assert response.json() == []

@patch("app.api.documents.process_document.delay")
def test_get_document_detail(mock_delay, client, db_session):
    # Upload first
    files = {"files": ("test2.pdf", b"abc", "application/pdf")}
    upload_res = client.post("/api/v1/documents/upload", files=files)
    doc_id = upload_res.json()[0]["id"]
    
    # Get detail
    response = client.get(f"/api/v1/documents/{doc_id}")
    assert response.status_code == 200
    detail = response.json()
    assert detail["id"] == doc_id
    assert detail["filename"] == "test2.pdf"
    assert detail["status"] == DocumentStatus.QUEUED.value

def test_get_document_not_found(client):
    from uuid import uuid4
    response = client.get(f"/api/v1/documents/{uuid4()}")
    assert response.status_code == 404

@patch("app.api.documents.process_document.delay")
def test_retry_document_failed(mock_delay, client, db_session):
    # Create doc directly via service for FAILED state
    from app.services.document_service import create_document, update_status
    doc = create_document(db_session, filename="fail.pdf", file_type="pdf", size=100)
    update_status(db_session, doc.id, DocumentStatus.FAILED)
    
    response = client.post(f"/api/v1/documents/{doc.id}/retry")
    assert response.status_code == 200
    assert response.json()["status"] == DocumentStatus.QUEUED.value
    mock_delay.assert_called_once_with(str(doc.id), doc.filename)

@patch("app.api.documents.process_document.delay")
def test_retry_document_invalid_status(mock_delay, client, db_session):
    from app.services.document_service import create_document
    doc = create_document(db_session, filename="queue.pdf", file_type="pdf", size=100)
    
    response = client.post(f"/api/v1/documents/{doc.id}/retry")
    assert response.status_code == 400
    assert "Only Failed documents can be retried" in response.json()["detail"]

def test_update_document(client, db_session):
    from app.services.document_service import create_document
    doc = create_document(db_session, filename="to_update.pdf", file_type="pdf", size=10)
    
    payload = {"title": "New Title", "category": "Legal"}
    response = client.put(f"/api/v1/documents/{doc.id}", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["extracted_data"]["title"] == "New Title"
    assert data["extracted_data"]["category"] == "Legal"

def test_finalize_document_invalid(client, db_session):
    from app.services.document_service import create_document
    doc = create_document(db_session, filename="raw.pdf", file_type="pdf", size=10)
    
    # Must be Completed or Failed
    response = client.post(f"/api/v1/documents/{doc.id}/finalize")
    assert response.status_code == 400
    assert "Only Completed or Failed" in response.json()["detail"]

def test_finalize_document_valid(client, db_session):
    from app.services.document_service import create_document, update_status
    doc = create_document(db_session, filename="done.pdf", file_type="pdf", size=10)
    update_status(db_session, doc.id, DocumentStatus.COMPLETED)
    
    response = client.post(f"/api/v1/documents/{doc.id}/finalize")
    assert response.status_code == 200
    data = response.json()
    assert data["is_finalized"] is True
    assert data["status"] == DocumentStatus.FINALIZED.value
    
    # Cannot update after finalize
    res = client.put(f"/api/v1/documents/{doc.id}", json={"title": "test"})
    assert res.status_code == 400
    assert "Document is finalized" in res.json()["detail"]

def test_export_document_json(client, db_session):
    from app.services.document_service import create_document
    doc = create_document(db_session, filename="export.pdf", file_type="pdf", size=10)
    
    response = client.get(f"/api/v1/documents/{doc.id}/export?format=json")
    assert response.status_code == 200
    assert response.headers["content-disposition"].endswith('.json"')
    data = response.json()
    assert data["filename"] == "export.pdf"

def test_export_document_csv(client, db_session):
    from app.services.document_service import create_document
    doc = create_document(db_session, filename="export.pdf", file_type="pdf", size=10)
    
    response = client.get(f"/api/v1/documents/{doc.id}/export?format=csv")
    assert response.status_code == 200
    assert response.headers["content-disposition"].endswith('.csv"')
    text = response.text
    assert "filename" in text
    assert "export.pdf" in text
