import io
import cv2
import numpy as np
import pypdfium2 as pdfium
from PIL import Image, UnidentifiedImageError
from fastapi import HTTPException

from app.config import settings
from app.services.image_service import ImageService


class DocumentService:
    @staticmethod
    def to_images(contents: bytes, content_type: str, filename: str = "") -> list[np.ndarray]:
        is_pdf = content_type == "application/pdf" or filename.lower().endswith(".pdf")
        if is_pdf:
            # 1. Try pypdfium2 (pure python, native Windows rendering without Poppler)
            try:
                pdf = pdfium.PdfDocument(contents)
                images = []
                for page in pdf:
                    pil_img = page.render(scale=2).to_pil()
                    images.append(ImageService.pil_to_bgr(pil_img))
                if images:
                    return images
            except Exception:
                pass

            # 2. Fallback to pdf2image if pypdfium2 encounters an issue
            try:
                from pdf2image import convert_from_bytes
                poppler_path = settings.poppler_path if settings.poppler_path else None
                pages = convert_from_bytes(
                    contents,
                    dpi=settings.pdf_dpi,
                    poppler_path=poppler_path,
                    fmt="png",
                )
                return [ImageService.pil_to_bgr(page) for page in pages]
            except Exception as error:
                raise HTTPException(
                    status_code=422,
                    detail=f"PDF conversion failed: {error}",
                ) from error

        try:
            image = Image.open(io.BytesIO(contents))
            return [ImageService.pil_to_bgr(image)]
        except UnidentifiedImageError as error:
            raise HTTPException(
                status_code=415, detail="The uploaded image could not be decoded."
            ) from error

    @staticmethod
    def validate(content_type: str, filename: str) -> None:
        ext = filename.lower().split(".")[-1] if "." in filename else ""
        supported_types = {
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/pjpeg",
            "image/webp",
            "application/octet-stream",
        }
        supported_exts = {"pdf", "png", "jpg", "jpeg", "webp", "bmp", "tiff"}
        if content_type not in supported_types and ext not in supported_exts:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file type '{content_type}' for {filename}.",
            )
