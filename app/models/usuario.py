import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.nota_fiscal import Base


class PapelUsuario(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN_FAZENDA = "admin_fazenda"
    FUNCIONARIO = "funcionario"


PERMISSOES_PADRAO = {
    "escanear": True,
    "ver_notas": False,
    "ver_contas": False,
    "ver_insumos": False,
    "ver_dashboard": False,
    "exportar": False,
}

PERMISSOES_ADMIN = {k: True for k in PERMISSOES_PADRAO}


class Fazenda(Base):
    __tablename__ = "fazendas"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    ativo = Column(Boolean, default=True, nullable=False)

    usuarios = relationship("Usuario", back_populates="fazenda")
    notas = relationship("NotaFiscal", back_populates="fazenda")


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    senha_hash = Column(String(200), nullable=False)
    papel = Column(Enum(PapelUsuario), default=PapelUsuario.FUNCIONARIO, nullable=False)
    fazenda_id = Column(Integer, ForeignKey("fazendas.id"), nullable=True)
    permissoes = Column(JSON, nullable=False, default=PERMISSOES_PADRAO)
    ativo = Column(Boolean, default=True, nullable=False)

    fazenda = relationship("Fazenda", back_populates="usuarios")
