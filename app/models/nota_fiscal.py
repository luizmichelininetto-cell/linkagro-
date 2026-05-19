from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum, CheckConstraint
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.ext.asyncio import AsyncAttrs
from datetime import datetime
import enum


class Base(AsyncAttrs, DeclarativeBase):
    pass


class FormaPagamento(str, enum.Enum):
    CREDITO = "credito"
    DEBITO = "debito"
    PIX = "pix"
    BOLETO = "boleto"
    DINHEIRO = "dinheiro"
    DESCONHECIDO = "desconhecido"


class StatusPagamento(str, enum.Enum):
    PENDENTE = "pendente"
    PAGO = "pago"
    VENCIDO = "vencido"


class CentroCusto(str, enum.Enum):
    LAVOURA = "lavoura"
    PECUARIA = "pecuaria"
    INVESTIMENTO = "investimento"
    SEDE = "sede"


SUBCATEGORIAS = {
    "lavoura":   ["Soja", "Milho", "Operacional", "M.O.", "Investimento"],
    "pecuaria":  ["Alimentação", "Ração", "Medicamento", "Investimento", "Operacional", "M.O."],
    "investimento": [],
    "sede":      ["Manutenção", "Limpeza", "Investimento"],
}

# Categorias de produto por centro de custo (para classificação automática)
CATEGORIAS_PRODUTO = [
    "Defensivo Agrícola",
    "Fertilizante / Adubo",
    "Semente",
    "Ração / Alimentação Animal",
    "Medicamento / Vacina",
    "Sal / Suplemento",
    "Combustível / Lubrificante",
    "Peça / Manutenção",
    "Mão de Obra",
    "Equipamento",
    "Infraestrutura",
    "Material de Escritório",
    "Limpeza / Higiene",
    "Embalagem / Armazenagem",
    "Serviço",
    "Outros",
]


class NotaFiscal(Base):
    __tablename__ = "notas_fiscais"

    id = Column(Integer, primary_key=True, index=True)
    numero_nf = Column(String(100), nullable=True, index=True)
    fornecedor = Column(String(255), nullable=True)
    data_emissao = Column(String(20), nullable=True)
    valor_total = Column(Float, nullable=True)
    forma_pagamento = Column(Enum(FormaPagamento), default=FormaPagamento.DESCONHECIDO)
    chave_acesso = Column(String(50), nullable=True)
    texto_ocr = Column(Text, nullable=True)
    imagem_path = Column(String(500), nullable=True)
    status_pagamento = Column(Enum(StatusPagamento), default=StatusPagamento.PENDENTE, nullable=False)
    data_vencimento = Column(String(20), nullable=True)
    data_pagamento = Column(String(20), nullable=True)
    num_parcelas = Column(Integer, nullable=True)
    valor_parcela = Column(Float, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    itens = relationship("ItemNF", back_populates="nota", cascade="all, delete-orphan")
    rateios = relationship("RateioNota", back_populates="nota", cascade="all, delete-orphan")
    parcelas = relationship("Parcela", back_populates="nota", cascade="all, delete-orphan",
                            order_by="Parcela.numero")


class ItemNF(Base):
    __tablename__ = "itens_nf"

    id = Column(Integer, primary_key=True, index=True)
    nota_id = Column(Integer, ForeignKey("notas_fiscais.id"), nullable=False)
    descricao = Column(String(500), nullable=False)
    quantidade = Column(Float, nullable=True)
    unidade = Column(String(20), nullable=True)
    valor_unitario = Column(Float, nullable=True)
    valor_total = Column(Float, nullable=True)
    categoria_produto = Column(String(60), nullable=True)

    nota = relationship("NotaFiscal", back_populates="itens")
    rateios = relationship("RateioItem", back_populates="item", cascade="all, delete-orphan")


class Parcela(Base):
    """Parcela de compra parcelada no cartão de crédito."""
    __tablename__ = "parcelas"

    id = Column(Integer, primary_key=True, index=True)
    nota_id = Column(Integer, ForeignKey("notas_fiscais.id"), nullable=False)
    numero = Column(Integer, nullable=False)
    valor = Column(Float, nullable=False)
    data_vencimento = Column(String(20), nullable=False)
    status_pagamento = Column(Enum(StatusPagamento), default=StatusPagamento.PENDENTE, nullable=False)
    data_pagamento = Column(String(20), nullable=True)

    nota = relationship("NotaFiscal", back_populates="parcelas")


class RateioNota(Base):
    """Divisão percentual da nota inteira entre centros de custo."""
    __tablename__ = "rateios_nota"
    __table_args__ = (
        CheckConstraint("percentual > 0 AND percentual <= 100", name="ck_rateio_nota_percentual"),
    )

    id = Column(Integer, primary_key=True, index=True)
    nota_id = Column(Integer, ForeignKey("notas_fiscais.id"), nullable=False)
    centro_custo = Column(Enum(CentroCusto), nullable=False, index=True)
    sub_categoria = Column(String(50), nullable=True)
    percentual = Column(Float, nullable=False)
    valor_calculado = Column(Float, nullable=True)

    nota = relationship("NotaFiscal", back_populates="rateios")


class RateioItem(Base):
    """Divisão percentual de um item específico entre centros de custo."""
    __tablename__ = "rateios_item"
    __table_args__ = (
        CheckConstraint("percentual > 0 AND percentual <= 100", name="ck_rateio_item_percentual"),
    )

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("itens_nf.id"), nullable=False)
    centro_custo = Column(Enum(CentroCusto), nullable=False, index=True)
    sub_categoria = Column(String(50), nullable=True)
    percentual = Column(Float, nullable=False)
    valor_calculado = Column(Float, nullable=True)

    item = relationship("ItemNF", back_populates="rateios")
