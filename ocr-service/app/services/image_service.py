import cv2
import numpy as np
from PIL import Image


class ImageService:
    @staticmethod
    def pil_to_bgr(image: Image.Image) -> np.ndarray:
        rgb = np.array(image.convert("RGB"))
        return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

    @staticmethod
    def preprocess(image: np.ndarray) -> np.ndarray:
        # 1. Grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        # 2. Deskew (fixes tilted scans)
        try:
            coords = np.column_stack(np.where(gray > 0))
            if coords.size > 0:
                angle = cv2.minAreaRect(coords)[-1]
                if angle < -45:
                    angle += 90
                if 0.5 < abs(angle) < 45:
                    (h, w) = gray.shape[:2]
                    matrix = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
                    gray = cv2.warpAffine(
                        gray,
                        matrix,
                        (w, h),
                        flags=cv2.INTER_CUBIC,
                        borderMode=cv2.BORDER_REPLICATE,
                    )
        except Exception:
            pass

        # 3. Denoise
        try:
            gray = cv2.fastNlMeansDenoising(gray, h=7)
        except Exception:
            pass

        # 4. Upscale for low DPI text
        h, w = gray.shape[:2]
        if w < 1200 or h < 1200:
            gray = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

        # Convert back to 3-channel BGR for OCR engines
        return cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
