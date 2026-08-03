# OCR Service

Independent FastAPI service using PaddleOCR, OpenCV, Pillow, and pdf2image.

## Run

Python 3.10 or 3.11 is recommended for Paddle compatibility.

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python run.py
```

The service starts at `http://localhost:8000`. Interactive API documentation is
available at `http://localhost:8000/docs`.

Environment variables can be set in the shell. The demo does not require
python-dotenv:

```powershell
$env:OCR_LANGUAGE = "en"
$env:OCR_USE_GPU = "false"
$env:PDF_DPI = "200"
$env:POPPLER_PATH = "C:\tools\poppler\Library\bin"
python run.py
```

## API

### `POST /ocr`

Send a PDF, PNG, JPG, or JPEG as multipart form field `file`.

```json
{
  "text": [
    {
      "text": "Policy No",
      "confidence": 0.99,
      "box": [[10, 20], [100, 20], [100, 45], [10, 45]],
      "page": 1
    }
  ],
  "pages": [
    {
      "page": 1,
      "width": 1654,
      "height": 2339,
      "text": []
    }
  ]
}
```

## Preprocessing

Each page is converted to grayscale, denoised, contrast-enhanced with CLAHE,
deskewed when the detected angle is reasonable, and converted back to BGR for
PaddleOCR.

PDF conversion requires Poppler. If `pdftoppm` is not on `PATH`, set
`POPPLER_PATH`.

