from pydantic import BaseModel, Field, model_validator
from typing import List, Optional
from datetime import datetime
from app.models.nota_fiscal import FormaPagamento, CentroCusto, StatusPagamento


# ── Rateio ─────────────────────────────────────────────────────────────────

class RateioBase(BaseModel):
    centro_custo: CentroCusto
    sub_categoria: Optional[str] = None
    percentual: float = Field(..., gt=0, le=100, description="Percentual de 0.01 a 100")


class RateioNotaCreate(RateioBase):
    pass


class RateioNotaOut(RateioBase):
    id: int
    nota_id: int
    sub_categoria: Optional[str] = None
    valor_calculado: Optional[float] = None

    class Config:
        from_attributes = True


class RateioItemCreate(RateioBase):
    pass


class RateioItemOut(RateioBase):
    id: int
    item_id: int
    sub_categoria: Optional[str] = None
    valor_calculado: Optional[float] = None

    class Config:
        from_attributes = True


def _validate_rateios(rateios: List[RateioBase]) -> List[RateioBase]:
    """Valida que a soma dos percentuais seja exatamente 100%."""
    if not rateios:
        return rateios
    total = sum(r.percentual for r in rateios)
    if abs(total - 100.0) > 0.01:
        raise ValueError(f"A soma dos percentuais deve ser 100%. Atual: {total:.2f}%")
    centros = [r.centro_custo for r in rateios]
    if len(centros) != len(set(centros)):
        raise ValueError("Cada centro de custo pode aparecer apenas uma vez no rateio.")
    return rateios


# ── Parcelas ───────────────────────────────────────────────────────────────

class ParcelaOut(BaseModel):
    id: int
    nota_id: int
    numero: int
    valor: float
    data_vencimento: str
    status_pagamento: StatusPagamento
    data_pagamento: Optional[str] = None

    class Config:
        from_attributes = True


class AplicarParcelasRequest(BaseModel):
    num_parcelas: int = Field(..., ge=2, le=48)
    data_primeira_parcela: str  # DD/MM/AAAA


class AtualizarParcelaRequest(BaseModel):
    status_pagamento: StatusPagamento
    data_pagamento: Optional[str] = None


# ── Itens ──────────────────────────────────────────────────────────────────

class ItemNFBase(BaseModel):
    descricao: str
    quantidade: Optional[float] = None
    unidade: Optional[str] = None
    valor_unitario: Optional[float] = None
    valor_total: Optional[float] = None
    categoria_produto: Optional[str] = None


class ItemNFCreate(ItemNFBase):
    rateios: List[RateioItemCreate] = Field(default=[], description="Rateio por centro de custo deste item (soma = 100%)")

    @model_validator(mode="after")
    def check_rateios(self):
        _validate_rateios(self.rateios)
        return self


class ItemNFOut(ItemNFBase):
    id: int
    nota_id: int
    rateios: List[RateioItemOut] = []

    class Config:
        from_attributes = True


# ── Nota Fiscal ────────────────────────────────────────────────────────────

class NotaFiscalBase(BaseModel):
    numero_nf: Optional[str] = None
    fornecedor: Optional[str] = None
    data_emissao: Optional[str] = None
    valor_total: Optional[float] = None
    forma_pagamento: Optional[FormaPagamento] = FormaPagamento.DESCONHECIDO
    chave_acesso: Optional[str] = None
    status_pagamento: Optional[StatusPagamento] = StatusPagamento.PENDENTE
    data_vencimento: Optional[str] = None
    data_pagamento: Optional[str] = None
    num_parcelas: Optional[int] = None
    valor_parcela: Optional[float] = None


class NotaFiscalCreate(NotaFiscalBase):
    itens: List[ItemNFCreate] = []
    rateios: List[RateioNotaCreate] = Field(
        default=[],
        description="Rateio da nota inteira por centro de custo (soma = 100%). "
                    "Use este OU rateios por item, não ambos."
    )
    texto_ocr: Optional[str] = None
    imagem_path: Optional[str] = None

    @model_validator(mode="after")
    def check_rateios_nota(self):
        _validate_rateios(self.rateios)
        return self


class NotaFiscalOut(NotaFiscalBase):
    id: int
    itens: List[ItemNFOut] = []
    rateios: List[RateioNotaOut] = []
    parcelas: List[ParcelaOut] = []
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True


class NotaFiscalSummary(BaseModel):
    id: int
    numero_nf: Optional[str]
    fornecedor: Optional[str]
    data_emissao: Optional[str]
    valor_total: Optional[float]
    forma_pagamento: Optional[FormaPagamento]
    status_pagamento: Optional[StatusPagamento]
    data_vencimento: Optional[str]
    data_pagamento: Optional[str]
    num_parcelas: Optional[int] = None
    criado_em: datetime

    class Config:
        from_attributes = True


# ── Aplicar rateio (endpoint PATCH) ────────────────────────────────────────

class AplicarRateioNotaRequest(BaseModel):
    """Payload para definir/substituir o rateio de uma nota inteira."""
    rateios: List[RateioNotaCreate] = Field(..., min_length=1)

    @model_validator(mode="after")
    def check(self):
        _validate_rateios(self.rateios)
        return self


class AplicarRateioItemRequest(BaseModel):
    """Payload para definir/substituir o rateio de um item específico."""
    rateios: List[RateioItemCreate] = Field(..., min_length=1)

    @model_validator(mode="after")
    def check(self):
        _validate_rateios(self.rateios)
        return self


# ── Resposta de scan ────────────────────────────────────────────────────────

class ScanResponse(BaseModel):
    sucesso: bool
    nota: Optional[NotaFiscalOut] = None
    texto_ocr: Optional[str] = None
    erro: Optional[str] = None
    confianca: Optional[float] = Field(None, description="0.0 a 1.0")


# ── Atualizar pagamento ─────────────────────────────────────────────────────

class AtualizarPagamentoRequest(BaseModel):
    status_pagamento: StatusPagamento
    data_vencimento: Optional[str] = None
    data_pagamento: Optional[str] = None


# ── Exportação ──────────────────────────────────────────────────────────────

class ExportFilter(BaseModel):
    data_inicio: Optional[str] = None
    data_fim: Optional[str] = None
    fornecedor: Optional[str] = None
    forma_pagamento: Optional[FormaPagamento] = None
    centro_custo: Optional[CentroCusto] = None
