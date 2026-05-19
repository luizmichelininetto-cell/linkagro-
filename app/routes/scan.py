from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import ocr_service, claude_service, crud
from app.schemas.nota_fiscal import ScanResponse
from app.auth import verify_api_key
from app.config import settings
import uuid, os, logging

router = APIRouter(prefix="/scan", tags=["Scan"], dependencies=[Depends(verify_api_key)])
logger = logging.getLogger(__name__)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _validate_file(file: UploadFile):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in settings.allowed_extensions_list:
        raise HTTPException(415, f"Formato não suportado. Use: {', '.join(settings.allowed_extensions_list)}")


@router.post("/", response_model=ScanResponse, summary="Escanear nota fiscal ou recibo")
async def scan_nota(
    file: UploadFile = File(..., description="Imagem da nota fiscal (JPG, PNG, PDF, WEBP)"),
    db: AsyncSession = Depends(get_db),
):
    _validate_file(file)
    image_bytes = await file.read()
    if len(image_bytes) > settings.max_file_size_bytes:
        raise HTTPException(413, f"Arquivo muito grande. Máximo: {settings.MAX_FILE_SIZE_MB}MB")

    ext = (file.filename or "img.jpg").rsplit(".", 1)[-1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(image_bytes)

    try:
        logger.info(f"Iniciando OCR: {filename}")
        texto_ocr = await ocr_service.extract_text_from_bytes(image_bytes, filename=file.filename or "")

        media_type_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}

        if ext == "pdf":
            # Claude Vision não suporta PDF — usa sempre o texto OCR extraído
            if not texto_ocr:
                raise HTTPException(422, "Não foi possível extrair texto do PDF.")
            extracted = await claude_service.extract_nf_from_text(texto_ocr)
        else:
            media_type = media_type_map.get(ext, "image/jpeg")
            try:
                extracted = await claude_service.extract_nf_from_image(image_bytes, media_type)
            except Exception as vision_err:
                logger.warning(f"Claude Vision falhou ({vision_err}), usando texto OCR...")
                if not texto_ocr:
                    raise HTTPException(422, "Não foi possível extrair texto da imagem.")
                extracted = await claude_service.extract_nf_from_text(texto_ocr)

        confianca = extracted.pop("confianca", None)
        nota_data = claude_service.parse_extraction_to_schema(extracted)
        nota = await crud.create_nota(db, nota_data, texto_ocr=texto_ocr, imagem_path=filepath)
        return ScanResponse(sucesso=True, nota=nota, texto_ocr=texto_ocr, confianca=confianca)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erro no processamento da NF")
        return ScanResponse(sucesso=False, erro=str(e))
