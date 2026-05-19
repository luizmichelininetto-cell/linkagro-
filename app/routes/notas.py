from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.database import get_db
from app.services import crud
from app.auth import verify_api_key
from app.schemas.nota_fiscal import (
    NotaFiscalOut, NotaFiscalSummary,
    AplicarRateioNotaRequest, AplicarRateioItemRequest,
    RateioNotaOut, RateioItemOut,
)
from app.models.nota_fiscal import FormaPagamento, CentroCusto

router = APIRouter(prefix="/notas", tags=["Notas Fiscais"], dependencies=[Depends(verify_api_key)])


@router.get("/", response_model=List[NotaFiscalSummary])
async def list_notas(
    skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
    fornecedor: Optional[str] = Query(None),
    forma_pagamento: Optional[FormaPagamento] = Query(None),
    centro_custo: Optional[CentroCusto] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await crud.list_notas(db, skip=skip, limit=limit, fornecedor=fornecedor,
                                  forma_pagamento=forma_pagamento, centro_custo=centro_custo)


@router.get("/{nota_id}", response_model=NotaFiscalOut)
async def get_nota(nota_id: int, db: AsyncSession = Depends(get_db)):
    nota = await crud.get_nota(db, nota_id)
    if not nota:
        raise HTTPException(404, "Nota fiscal não encontrada")
    return nota


@router.delete("/{nota_id}")
async def delete_nota(nota_id: int, db: AsyncSession = Depends(get_db)):
    if not await crud.delete_nota(db, nota_id):
        raise HTTPException(404, "Nota fiscal não encontrada")
    return {"mensagem": "Nota excluída com sucesso"}


@router.patch("/{nota_id}/rateio", response_model=NotaFiscalOut,
              summary="Definir/substituir rateio da nota inteira (soma dos percentuais = 100%)")
async def aplicar_rateio_nota(nota_id: int, payload: AplicarRateioNotaRequest, db: AsyncSession = Depends(get_db)):
    nota = await crud.aplicar_rateio_nota(db, nota_id, payload)
    if not nota:
        raise HTTPException(404, "Nota fiscal não encontrada")
    return nota


@router.patch("/itens/{item_id}/rateio", response_model=RateioItemOut,
              summary="Definir/substituir rateio de um item específico (soma dos percentuais = 100%)")
async def aplicar_rateio_item(item_id: int, payload: AplicarRateioItemRequest, db: AsyncSession = Depends(get_db)):
    item = await crud.aplicar_rateio_item(db, item_id, payload)
    if not item:
        raise HTTPException(404, "Item não encontrado")
    return item
