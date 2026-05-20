from pydantic_settings import BaseSettings
from typing import List
import os


def _fix_db_url(url: str) -> str:
    """Railway injeta postgres:// mas SQLAlchemy async precisa de postgresql+asyncpg://"""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str = ""
    API_KEY: str = ""
    DATABASE_URL: str = "sqlite+aiosqlite:///./nf_scanner.db"
    SECRET_KEY: str = "gestao-fazendas-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 dias
    SUPER_ADMIN_EMAIL: str = "admin@gestaofazendas.com"
    SUPER_ADMIN_SENHA: str = "admin123"
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: str = "jpg,jpeg,png,pdf,webp"

    @property
    def allowed_extensions_list(self) -> List[str]:
        return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",")]

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
settings.DATABASE_URL = _fix_db_url(settings.DATABASE_URL)
