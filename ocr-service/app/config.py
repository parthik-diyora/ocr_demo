import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    ocr_language: str = os.getenv("OCR_LANGUAGE", "en")
    ocr_use_gpu: bool = os.getenv("OCR_USE_GPU", "false").lower() == "true"
    pdf_dpi: int = int(os.getenv("PDF_DPI", "200"))
    poppler_path: str | None = os.getenv("POPPLER_PATH") or None


settings = Settings()

