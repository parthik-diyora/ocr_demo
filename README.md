# ClaimLens Insurance IDP Demo

ClaimLens is a three-service demo for uploading insurance claim forms, running
OCR, extracting template-based fields, reviewing low-confidence values, and
saving corrected JSON to PostgreSQL.

## Architecture

```text
React + Material UI (5173)
          |
          v
Node.js + Express API (4000) ---- PostgreSQL (5432)
          |
          v
FastAPI + PaddleOCR (8000)
```

The OCR service owns PDF conversion, image preprocessing, and text detection.
The Node API owns uploads, template detection, coordinate matching, workflow,
and persistence. The frontend owns document review and manual correction.

## Project Structure

```text
backend/
  database/schema.sql
  src/
    controllers/
    middleware/
    repositories/
    routes/
    services/
    templateEngine/  (implemented by TemplateService)
    templates/
    types/
frontend/
  src/
    components/
    hooks/
    pages/
    services/
    types/
ocr-service/
  app/
    services/
```

## Prerequisites

- Node.js 20 or later
- Python 3.10 or 3.11
- PostgreSQL 16, or Docker Desktop
- Poppler for PDF support

On Windows, install Poppler and set `POPPLER_PATH` to its `Library/bin`
directory. PNG and JPEG OCR work without Poppler.

## Quick Start

1. Start PostgreSQL:

   ```powershell
   docker compose up -d postgres
   ```

   When the backend starts, it idempotently applies
   `backend/database/schema.sql` to
   `postgresql://postgres:root@localhost:5432/ocr`.

2. Start the OCR service:

   ```powershell
   cd ocr-service
   py -3.11 -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   python run.py
   ```

3. Start the backend in a second terminal:

   ```powershell
   cd backend
   Copy-Item .env.example .env
   npm install
   npm run dev
   ```

4. Start the frontend in a third terminal:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

5. Open `http://localhost:5173`.

For a database-free UI demo, set `USE_IN_MEMORY_DB=true` in `backend/.env`.
The extracted data will then be lost when the backend restarts.

## Processing Flow

1. `POST /api/documents/upload` validates and stores the original file.
2. The backend sends it to `POST /ocr`.
3. The OCR service converts PDF pages, preprocesses images, and runs OCR.
4. OCR boxes/labels are used to detect form fields dynamically at runtime.
5. A digital form schema is built from the uploaded document (no static field JSON).
6. Initial extraction is saved with `pending_review` status.
7. The frontend displays the document and editable fields.
8. `PUT /api/documents/:id` saves corrected JSON with `reviewed` status.

## Dynamic Forms (not static templates)

The digital form is generated from each upload:

- Labels like `Policy No:`, `Name`, `Date of Admission` are detected from OCR
- Values next to / under those labels are extracted
- Sections like `SECTION A` group fields in the UI
- Field types are inferred (date, email, phone, Yes/No, etc.)

Static `src/templates/*.json` field maps are no longer used.

## API Summary

- Default database URL: `postgresql://postgres:root@localhost:5432/ocr`
- `GET /health`
- `POST /api/documents/upload`
- `GET /api/documents/:id`
- `PUT /api/documents/:id`
- `GET http://localhost:8000/health`
- `POST http://localhost:8000/ocr`

Service-specific details are in each service README.
# ocr_demo
