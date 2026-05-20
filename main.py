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


async def _run_migrations():
    """Adiciona colunas novas em tabelas existentes (idempotente)."""
    from sqlalchemy import text
    from app.database import engine

    # Colunas para adicionar em tabelas existentes
    # IF NOT EXISTS é suportado no PostgreSQL 9.6+ e SQLite 3.37+
    migrations_pg = [
        "ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS num_parcelas INTEGER",
        "ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS valor_parcela FLOAT",
        "ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS data_vencimento VARCHAR(20)",
        "ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS data_pagamento VARCHAR(20)",
        "ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP",
        "ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS fazenda_id INTEGER REFERENCES fazendas(id)",
        "ALTER TABLE itens_nf ADD COLUMN IF NOT EXISTS categoria_produto VARCHAR(60)",
    ]

    migrations_sqlite = [
        "ALTER TABLE notas_fiscais ADD COLUMN num_parcelas INTEGER",
        "ALTER TABLE notas_fiscais ADD COLUMN valor_parcela FLOAT",
        "ALTER TABLE notas_fiscais ADD COLUMN data_vencimento VARCHAR(20)",
        "ALTER TABLE notas_fiscais ADD COLUMN data_pagamento VARCHAR(20)",
        "ALTER TABLE notas_fiscais ADD COLUMN atualizado_em TIMESTAMP",
        "ALTER TABLE notas_fiscais ADD COLUMN fazenda_id INTEGER",
        "ALTER TABLE itens_nf ADD COLUMN categoria_produto VARCHAR(60)",
    ]

    is_sqlite = settings.DATABASE_URL.startswith("sqlite")
    migrations = migrations_pg if not is_sqlite else migrations_sqlite

    async with engine.begin() as conn:
        for sql in migrations:
            try:
                await conn.execute(text(sql))
                logger.info(f"Migration OK: {sql[:60]}")
            except Exception as e:
                # Coluna já existe ou outro erro esperado
                logger.debug(f"Migration skipped ({type(e).__name__}): {sql[:60]}")


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
            else:
                logger.info(f"Super admin já existe: {settings.SUPER_ADMIN_EMAIL}")
        except Exception as e:
            logger.error(f"Erro ao criar super admin: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Iniciando Gestão de Fazendas API...")
    import app.models.usuario  # noqa — garante que modelos sejam registrados
    await init_db()
    await _run_migrations()
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
