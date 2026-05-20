import pytesseract
import fitz  # pymupdf
from PIL import Image, ImageEnhance, ImageFilter
import io
import base64
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

import shutil
pytesseract.pytesseract.tesseract_cmd = shutil.which("tesseract") or "/opt/homebrew/bin/tesseract"
TESSERACT_CONFIG = "--oem 3 --psm 6 -l por+eng"


def _preprocess_image(image: Image.Image) -> Image.Image:
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    image = image.convert("L")
    w, h = image.size
    if w < 1000:
        scale = 1000 / w
        image = image.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(2.0)
    image = image.filter(ImageFilter.SHARPEN)
    return image


def _ocr_image(image: Image.Image) -> str:
    processed = _preprocess_image(image)
    return pytesseract.image_to_string(processed, config=TESSERACT_CONFIG)


def _pdf_to_images(pdf_bytes: bytes) -> list[Image.Image]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    images = []
    for page in doc:
        mat = fitz.Matrix(200 / 72, 200 / 72)  # 200 DPI
        pix = page.get_pixmap(matrix=mat)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        images.append(img)
    doc.close()
    return images


async def extract_text_from_bytes(image_bytes: bytes, filename: str = "") -> str:
    try:
        if filename.lower().endswith(".pdf"):
            pages = _pdf_to_images(image_bytes)
            texts = [_ocr_image(page) for page in pages]
            return "\n\n".join(t.strip() for t in texts if t.strip())
        image = Image.open(io.BytesIO(image_bytes))
        return _ocr_image(image).strip()
    except Exception as e:
        logger.error(f"Erro no OCR: {e}")
        raise ValueError(f"Não foi possível processar a imagem: {str(e)}")


async def extract_text_from_path(path: str) -> str:
    image_bytes = Path(path).read_bytes()
    return await extract_text_from_bytes(image_bytes)


def image_to_base64(image_bytes: bytes, media_type: str = "image/jpeg") -> str:
    encoded = base64.standard_b64encode(image_bytes).decode("utf-8")
    return encoded
