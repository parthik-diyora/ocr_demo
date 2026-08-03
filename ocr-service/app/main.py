import os
import sys

# Ensure root ocr-service directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
import time

from fastapi import FastAPI, File, UploadFile

from app.models import OcrResponse
from app.services.document_service import DocumentService
from app.services.ocr_service import OcrService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("ocr-service")

app = FastAPI(
    title="Insurance IDP OCR Service",
    version="1.0.0",
    description="Independent PaddleOCR / EasyOCR service for images and multi-page PDFs.",
)
ocr_service = OcrService()


@app.get("/health")
async def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "ocr",
        "engine": ocr_service.engine_name,
    }


@app.post("/ocr", response_model=OcrResponse)
async def run_ocr(file: UploadFile = File(...)) -> OcrResponse:
    started_at = time.perf_counter()
    content_type = file.content_type or "application/octet-stream"
    filename = file.filename or "document"

    logger.info(
        "OCR request received | filename=%s | content_type=%s",
        filename,
        content_type,
    )

    DocumentService.validate(content_type, filename)
    contents = await file.read()
    if not contents:
        from fastapi import HTTPException

        logger.warning("OCR request rejected | empty file | filename=%s", filename)
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    images = DocumentService.to_images(contents, content_type, filename)
    logger.info(
        "OCR document converted | filename=%s | bytes=%s | pages=%s",
        filename,
        len(contents),
        len(images),
    )

    response = ocr_service.process(images)
    duration_ms = (time.perf_counter() - started_at) * 1000
    logger.info(
        "OCR request complete | filename=%s | engine=%s | pages=%s | items=%s | duration_ms=%.0f",
        filename,
        ocr_service.engine_name,
        len(response.pages),
        len(response.text),
        duration_ms,
    )
    for item in response.text:
        logger.info(
            "OCR extracted | page=%s | conf=%.3f | text=%s",
            item.page,
            item.confidence,
            item.text,
        )
    return response
