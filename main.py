from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from pathlib import Path
import logging

from app.database import init_db
from app.routes import scan, notas, exportar, dashboard, insumos
from app.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger(__name__)

STATIC_DIR = Path(__file__).parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Iniciando NF Scanner API...")
    await init_db()
    logger.info("Banco de dados pronto.")
    yield
    logger.info("Encerrando API.")


app = FastAPI(title="NF Scanner API", version="1.0.0", lifespan=lifespan)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

app.include_router(scan.router)
app.include_router(notas.router)
app.include_router(exportar.router)
app.include_router(dashboard.router)
app.include_router(insumos.router)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}


# Serve o frontend buildado — deve ficar por último
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        return FileResponse(STATIC_DIR / "index.html")
