from pydantic import BaseModel


class OcrItem(BaseModel):
    text: str
    confidence: float
    box: list[list[float]]
    page: int


class OcrPage(BaseModel):
    page: int
    width: int
    height: int
    text: list[OcrItem]


class OcrResponse(BaseModel):
    text: list[OcrItem]
    pages: list[OcrPage]

