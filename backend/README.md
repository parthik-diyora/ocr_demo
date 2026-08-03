# Backend

Express and TypeScript API for upload orchestration, OCR-driven dynamic form
field detection, and PostgreSQL persistence.

## Run

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

The API starts at `http://localhost:4000`.

## Endpoints

### `POST /api/documents/upload`

Send `multipart/form-data` with a `file` field. Supported types are PDF, PNG,
JPG, and JPEG.

Example response:

```json
{
  "documentId": "uuid",
  "template": "dynamic-form",
  "templateName": "CLAIM FORM - PART - A",
  "fields": {
    "a_policy_no": "P/123456/01",
    "d_name": "Jane Doe"
  },
  "confidence": {
    "a_policy_no": 94,
    "d_name": 93
  },
  "fieldDefinitions": {
    "a_policy_no": {
      "label": "a) Policy No",
      "type": "text",
      "section": "SECTION A: DETAILS OF PRIMARY INSURED"
    }
  },
  "ocr": {
    "text": [],
    "pages": []
  },
  "fileUrl": "/uploads/generated-name.pdf",
  "fileType": "application/pdf"
}
```

### `PUT /api/documents/:id`

```json
{
  "fields": {
    "a_policy_no": "Corrected Policy",
    "d_name": "Corrected Name"
  }
}
```

### `GET /api/documents/:id`

Returns the persisted document record, including OCR output, detected field
definitions, and corrected fields.

## Dynamic Form Detection

Field lists are **not** loaded from static JSON templates. On each upload:

1. OCR text/boxes are grouped into reading-order lines.
2. Section headers (`SECTION A`, `Details of...`) are detected.
3. Labels are detected (`Policy No:`, `a) Name`, date/email/phone hints, etc.).
4. Values are taken from the same line (after `:`) or the line below.
5. A digital form schema is built at runtime and returned as `fieldDefinitions`.

Structured OCR logs are emitted for raw items, detected fields, fill counts,
and low-confidence values.

## Tests

```powershell
npm test
npm run build
```

