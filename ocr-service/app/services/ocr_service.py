from __future__ import annotations

import logging
import time
from typing import Any

import numpy as np

from app.config import settings
from app.models import OcrItem, OcrPage, OcrResponse
from app.services.image_service import ImageService

logger = logging.getLogger("ocr-service")


class OcrService:
    def __init__(self) -> None:
        self.rapid_engine = None
        self.easy_reader = None
        self.paddle_engine = None
        self.engine_name = "none"

        # 1. Primary Engine: RapidOCR (PaddleOCR ONNX)
        try:
            from rapidocr_onnxruntime import RapidOCR

            self.rapid_engine = RapidOCR()
            self.engine_name = "rapidocr"
            logger.info("OCR engine initialized: RapidOCR (PaddleOCR ONNX)")
        except Exception as exc:
            logger.warning("RapidOCR unavailable: %s", exc)

        # 2. Secondary Engine: EasyOCR
        if not self.rapid_engine:
            try:
                import easyocr

                self.easy_reader = easyocr.Reader(
                    [settings.ocr_language],
                    gpu=settings.ocr_use_gpu,
                    verbose=False,
                )
                self.engine_name = "easyocr"
                logger.info(
                    "OCR engine initialized: EasyOCR (lang=%s, gpu=%s)",
                    settings.ocr_language,
                    settings.ocr_use_gpu,
                )
            except Exception as exc:
                logger.warning("EasyOCR unavailable: %s", exc)

        # 3. Fallback Engine: PaddleOCR native
        if not self.rapid_engine and not self.easy_reader:
            try:
                from paddleocr import PaddleOCR

                self.paddle_engine = PaddleOCR(
                    use_angle_cls=True,
                    lang=settings.ocr_language,
                    ocr_version="PP-OCRv4",
                )
                self.engine_name = "paddleocr"
                logger.info(
                    "OCR engine initialized: PaddleOCR PP-OCRv4 (lang=%s, angle_cls=True)",
                    settings.ocr_language,
                )
            except Exception as exc:
                logger.error("No OCR engine available: %s", exc)

    def process(self, images: list[np.ndarray]) -> OcrResponse:
        started_at = time.perf_counter()
        pages: list[OcrPage] = []
        all_items: list[OcrItem] = []

        logger.info(
            "OCR process start | engine=%s | pages=%s",
            self.engine_name,
            len(images),
        )

        for page_number, image in enumerate(images, start=1):
            page_started = time.perf_counter()
            processed = ImageService.preprocess(image)
            height, width = processed.shape[:2]
            items: list[OcrItem] = []
            engine_used = "none"

            # 1. RapidOCR (PaddleOCR ONNX)
            if self.rapid_engine:
                try:
                    result, elapse = self.rapid_engine(processed)
                    if result:
                        for box, text, confidence in result:
                            if not text or not str(text).strip():
                                continue
                            poly = [[float(pt[0]), float(pt[1])] for pt in box]
                            items.append(
                                OcrItem(
                                    text=str(text).strip(),
                                    confidence=float(confidence),
                                    box=poly,
                                    page=page_number,
                                )
                            )
                        engine_used = "rapidocr"
                except Exception as exc:
                    logger.exception(
                        "RapidOCR failed on page %s: %s", page_number, exc
                    )

            # 2. EasyOCR
            if not items and self.easy_reader:
                try:
                    results = self.easy_reader.readtext(processed)
                    for bbox, text, confidence in results:
                        if not text or not str(text).strip():
                            continue
                        box = [[float(pt[0]), float(pt[1])] for pt in bbox]
                        items.append(
                            OcrItem(
                                text=str(text).strip(),
                                confidence=float(confidence),
                                box=box,
                                page=page_number,
                            )
                        )
                    engine_used = "easyocr"
                except Exception as exc:
                    logger.exception(
                        "EasyOCR failed on page %s: %s", page_number, exc
                    )

            # 3. PaddleOCR Native
            if not items and self.paddle_engine:
                try:
                    result = self.paddle_engine.ocr(processed)
                    items = self._parse_paddle_result(result, page_number)
                    engine_used = "paddleocr"
                except Exception as exc:
                    logger.exception(
                        "PaddleOCR failed on page %s: %s", page_number, exc
                    )

            pages.append(
                OcrPage(
                    page=page_number,
                    width=width,
                    height=height,
                    text=items,
                )
            )
            all_items.extend(items)

            avg_conf = (
                sum(item.confidence for item in items) / len(items)
                if items
                else 0.0
            )
            preview = " | ".join(item.text for item in items[:15])
            logger.info(
                "OCR page result | page=%s | engine=%s | size=%sx%s | items=%s | avg_conf=%.3f | duration_ms=%.0f | preview=%s",
                page_number,
                engine_used,
                width,
                height,
                len(items),
                avg_conf,
                (time.perf_counter() - page_started) * 1000,
                preview,
            )
            for item in items:
                logger.info(
                    "RAW OCR ITEM | page=%s | conf=%.3f | text=%s",
                    page_number,
                    item.confidence,
                    item.text,
                )

        duration_ms = (time.perf_counter() - started_at) * 1000
        logger.info(
            "OCR process complete | engine=%s | pages=%s | items=%s | duration_ms=%.0f",
            self.engine_name,
            len(pages),
            len(all_items),
            duration_ms,
        )
        return OcrResponse(text=all_items, pages=pages)

    @staticmethod
    def _parse_paddle_result(result: Any, page_number: int) -> list[OcrItem]:
        if not result:
            return []

        items: list[OcrItem] = []
        if isinstance(result, (list, tuple)):
            for res in result:
                if not res:
                    continue
                if isinstance(res, dict):
                    polys = (
                        res.get("dt_polys")
                        or res.get("rec_polys")
                        or res.get("polys")
                        or []
                    )
                    texts = (
                        res.get("rec_text")
                        or res.get("rec_texts")
                        or res.get("texts")
                        or []
                    )
                    scores = (
                        res.get("rec_score")
                        or res.get("rec_scores")
                        or res.get("scores")
                        or []
                    )

                    if isinstance(polys, (list, np.ndarray)) and isinstance(
                        texts, (list, np.ndarray)
                    ):
                        for poly, text, score in zip(
                            polys,
                            texts,
                            scores
                            if len(scores) == len(texts)
                            else [0.99] * len(texts),
                        ):
                            box = (
                                [[float(pt[0]), float(pt[1])] for pt in poly]
                                if hasattr(poly, "__iter__")
                                else []
                            )
                            items.append(
                                OcrItem(
                                    text=str(text).strip(),
                                    confidence=float(score),
                                    box=box,
                                    page=page_number,
                                )
                            )
                elif isinstance(res, (list, tuple)):
                    lines = (
                        res[0]
                        if len(res) == 1
                        and isinstance(res[0], list)
                        and res[0]
                        and isinstance(res[0][0], (list, tuple))
                        else res
                    )
                    for line in lines:
                        if (
                            not line
                            or not isinstance(line, (list, tuple))
                            or len(line) < 2
                        ):
                            continue
                        box, recognition = line[0], line[1]
                        if isinstance(recognition, (list, tuple)) and len(
                            recognition
                        ) >= 2:
                            text, confidence = recognition[0], recognition[1]
                            items.append(
                                OcrItem(
                                    text=str(text).strip(),
                                    confidence=float(confidence),
                                    box=[
                                        [float(pt[0]), float(pt[1])]
                                        for pt in box
                                    ]
                                    if isinstance(box, (list, tuple))
                                    else [],
                                    page=page_number,
                                )
                            )
        return items
