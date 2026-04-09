# Async Document Processing Workflow System

A production-style backend built with **FastAPI + Celery + Redis + PostgreSQL**.

## Architecture

```
app/
├── main.py                  # FastAPI app factory + lifespan
├── api/
│   └── documents.py         # All HTTP endpoints (upload, list, detail, export, SSE)
├── models/
│   └── document.py          # SQLAlchemy ORM model
├── schemas/
│   └── document.py          # Pydantic v2 request/response schemas
├── services/
│   └── document_service.py  # Business logic (CRUD + finalize)
├── workers/
│   ├── celery_app.py        # Celery application factory
│   └── tasks.py             # process_document task (7-step pipeline)
├── core/
│   ├── config.py            # Pydantic-settings (env vars)
│   ├── database.py          # SQLAlchemy engine + get_db() dependency
│   └── redis_client.py      # Redis client + publish_progress()
└── utils/
    └── file_helpers.py      # Async file saving helpers
```

## Quick Start (Docker)

```bash
# 1. Clone and enter the project
cp .env.example .env

# 2. Start all services
docker compose up --build

# 3. Visit the API docs
open http://localhost:8000/docs

# 4. Monitor Celery tasks (Flower)
open http://localhost:5555
```

## Quick Start (Local)

```bash
# Prerequisites: PostgreSQL + Redis running locally

python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # edit DB/Redis URLs if needed

# Start FastAPI
uvicorn app.main:app --reload

# Start Celery worker (separate terminal)
celery -A app.workers.celery_app.celery_app worker --loglevel=info
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/documents/upload` | Upload one or more files |
| `GET`  | `/api/v1/documents` | List with search / filter / sort |
| `GET`  | `/api/v1/documents/{id}` | Full detail + extracted data |
| `POST` | `/api/v1/documents/{id}/retry` | Re-trigger failed job |
| `PUT`  | `/api/v1/documents/{id}` | Edit title / category / summary / keywords |
| `POST` | `/api/v1/documents/{id}/finalize` | Lock record |
| `GET`  | `/api/v1/documents/{id}/export?format=json` | Export as JSON |
| `GET`  | `/api/v1/documents/{id}/export?format=csv` | Export as CSV |
| `GET`  | `/api/v1/documents/{id}/progress` | SSE live progress stream |
| `GET`  | `/health` | Health check |

## Processing Pipeline

Each uploaded document is processed asynchronously by Celery through 7 steps:

```
document_received   →   5%
parsing_started     →  20%
parsing_completed   →  40%
extraction_started  →  55%
extraction_completed→  75%
final_result_stored →  90%
job_completed       → 100%
```

Each step updates PostgreSQL and publishes a Redis Pub/Sub event.
The `/progress` SSE endpoint subscribes to Redis and streams events live to the browser.

## SSE Usage (JavaScript)

```javascript
const evtSource = new EventSource(
  "http://localhost:8000/api/v1/documents/{id}/progress"
);
evtSource.onmessage = (e) => {
  const event = JSON.parse(e.data);
  console.log(`Step: ${event.step} | Progress: ${event.progress}%`);
  if (event.progress >= 100) evtSource.close();
};
```
