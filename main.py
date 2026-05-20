from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from pathlib import Path
import logging

from app.database import init_db, AsyncSessionLocal
from app.routes import scan, notas, exportar, dashboard, insumos
from app.routes.auth import router as auth_router
from app.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger(__name__)

STATIC_DIR = Path(__file__).parent / "static"


async def _seed_super_admin():
    from sqlalchemy import select
    from app.models.usuario import Usuario, PapelUsuario, PERMISSOES_ADMIN
    from app.services.auth_service import hash_senha, get_usuario_by_email

    async with AsyncSessionLocal() as db:
        try:
            existente = await get_usuario_by_email(db, settings.SUPER_ADMIN_EMAIL)
            if not existente:
                admin = Usuario(
                    nome="Super Admin",
                    email=settings.SUPER_ADMIN_EMAIL,
                    senha_hash=hash_senha(settings.SUPER_ADMIN_SENHA),
                    papel=PapelUsuario.SUPER_ADMIN,
                    fazenda_id=None,
                    permissoes=PERMISSOES_ADMIN,
                    ativo=True,
                )
                db.add(admin)
                await db.commit()
                logger.info(f"Super admin criado: {settings.SUPER_ADMIN_EMAIL}")
        except Exception as e:
            logger.error(f"Erro ao criar super admin: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Iniciando Gestão de Fazendas API...")
    # Importa modelos de usuário para que sejam criados pelo create_all
    import app.models.usuario  # noqa
    await init_db()
    await _seed_super_admin()
    logger.info("Banco de dados pronto.")
    yield
    logger.info("Encerrando API.")


app = FastAPI(title="Gestão de Fazendas API", version="2.0.0", lifespan=lifespan)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

app.include_router(auth_router)
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
