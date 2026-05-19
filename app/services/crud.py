from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional
from app.models.nota_fiscal import NotaFiscal, ItemNF, RateioNota, RateioItem, FormaPagamento, CentroCusto, Parcela
from app.schemas.nota_fiscal import (
    NotaFiscalCreate, AplicarRateioNotaRequest, AplicarRateioItemRequest,
    AtualizarPagamentoRequest, AplicarParcelasRequest, AtualizarParcelaRequest,
)
from app.models.nota_fiscal import StatusPagamento
from datetime import date, datetime
from dateutil.relativedelta import relativedelta


def _calc_valor(base: Optional[float], percentual: float) -> Optional[float]:
    if base is None:
        return None
    return round(base * percentual / 100, 2)


def _parse_data_br(s: Optional[str]) -> Optional[date]:
    """Parse DD/MM/AAAA → date."""
    if not s:
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


async def create_nota(db: AsyncSession, data: NotaFiscalCreate, texto_ocr: str = None, imagem_path: str = None) -> NotaFiscal:
    nota = NotaFiscal(
        numero_nf=data.numero_nf,
        fornecedor=data.fornecedor,
        data_emissao=data.data_emissao,
        valor_total=data.valor_total,
        forma_pagamento=data.forma_pagamento,
        chave_acesso=data.chave_acesso,
        texto_ocr=texto_ocr,
        imagem_path=imagem_path,
    )
    db.add(nota)
    await db.flush()

    for r in data.rateios:
        db.add(RateioNota(
            nota_id=nota.id,
            centro_custo=r.centro_custo,
            sub_categoria=r.sub_categoria,
            percentual=r.percentual,
            valor_calculado=_calc_valor(data.valor_total, r.percentual),
        ))

    for item_data in data.itens:
        item = ItemNF(
            nota_id=nota.id,
            descricao=item_data.descricao,
            quantidade=item_data.quantidade,
            unidade=item_data.unidade,
            valor_unitario=item_data.valor_unitario,
            valor_total=item_data.valor_total,
            categoria_produto=item_data.categoria_produto,
        )
        db.add(item)
        await db.flush()
        for r in item_data.rateios:
            db.add(RateioItem(
                item_id=item.id,
                centro_custo=r.centro_custo,
                sub_categoria=r.sub_categoria,
                percentual=r.percentual,
                valor_calculado=_calc_valor(item_data.valor_total, r.percentual),
            ))

    await db.commit()
    return await get_nota(db, nota.id)


async def get_nota(db: AsyncSession, nota_id: int) -> Optional[NotaFiscal]:
    result = await db.execute(
        select(NotaFiscal)
        .options(
            selectinload(NotaFiscal.rateios),
            selectinload(NotaFiscal.itens).selectinload(ItemNF.rateios),
            selectinload(NotaFiscal.parcelas),
        )
        .where(NotaFiscal.id == nota_id)
    )
    return result.scalar_one_or_none()


async def list_notas(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    fornecedor: Optional[str] = None,
    forma_pagamento: Optional[FormaPagamento] = None,
    centro_custo: Optional[CentroCusto] = None,
    status_pagamento: Optional[StatusPagamento] = None,
) -> List[NotaFiscal]:
    query = (
        select(NotaFiscal)
        .options(
            selectinload(NotaFiscal.rateios),
            selectinload(NotaFiscal.itens).selectinload(ItemNF.rateios),
        )
    )
    if fornecedor:
        query = query.where(NotaFiscal.fornecedor.ilike(f"%{fornecedor}%"))
    if forma_pagamento:
        query = query.where(NotaFiscal.forma_pagamento == forma_pagamento)
    if status_pagamento:
        query = query.where(NotaFiscal.status_pagamento == status_pagamento)
    if centro_custo:
        query = query.where(
            NotaFiscal.id.in_(select(RateioNota.nota_id).where(RateioNota.centro_custo == centro_custo)) |
            NotaFiscal.id.in_(
                select(ItemNF.nota_id)
                .join(RateioItem, RateioItem.item_id == ItemNF.id)
                .where(RateioItem.centro_custo == centro_custo)
            )
        )
    query = query.order_by(NotaFiscal.criado_em.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def delete_nota(db: AsyncSession, nota_id: int) -> bool:
    result = await db.execute(delete(NotaFiscal).where(NotaFiscal.id == nota_id))
    await db.commit()
    return result.rowcount > 0


async def list_notas_para_export(
    db: AsyncSession,
    fornecedor: Optional[str] = None,
    forma_pagamento: Optional[FormaPagamento] = None,
    centro_custo: Optional[CentroCusto] = None,
) -> List[NotaFiscal]:
    query = (
        select(NotaFiscal)
        .options(
            selectinload(NotaFiscal.rateios),
            selectinload(NotaFiscal.itens).selectinload(ItemNF.rateios),
            selectinload(NotaFiscal.parcelas),
        )
    )
    if fornecedor:
        query = query.where(NotaFiscal.fornecedor.ilike(f"%{fornecedor}%"))
    if forma_pagamento:
        query = query.where(NotaFiscal.forma_pagamento == forma_pagamento)
    if centro_custo:
        query = query.where(
            NotaFiscal.id.in_(select(RateioNota.nota_id).where(RateioNota.centro_custo == centro_custo)) |
            NotaFiscal.id.in_(
                select(ItemNF.nota_id)
                .join(RateioItem, RateioItem.item_id == ItemNF.id)
                .where(RateioItem.centro_custo == centro_custo)
            )
        )
    query = query.order_by(NotaFiscal.criado_em.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def aplicar_rateio_nota(db: AsyncSession, nota_id: int, payload: AplicarRateioNotaRequest) -> Optional[NotaFiscal]:
    nota = await get_nota(db, nota_id)
    if not nota:
        return None
    await db.execute(delete(RateioNota).where(RateioNota.nota_id == nota_id))
    for r in payload.rateios:
        db.add(RateioNota(
            nota_id=nota_id,
            centro_custo=r.centro_custo,
            sub_categoria=r.sub_categoria,
            percentual=r.percentual,
            valor_calculado=_calc_valor(nota.valor_total, r.percentual),
        ))
    await db.commit()
    return await get_nota(db, nota_id)


async def atualizar_pagamento(db: AsyncSession, nota_id: int, payload: AtualizarPagamentoRequest) -> Optional[NotaFiscal]:
    nota = await get_nota(db, nota_id)
    if not nota:
        return None
    nota.status_pagamento = payload.status_pagamento
    nota.data_vencimento = payload.data_vencimento
    nota.data_pagamento = payload.data_pagamento
    if payload.status_pagamento == StatusPagamento.PENDENTE and payload.data_vencimento:
        try:
            venc = date.fromisoformat(payload.data_vencimento)
            if venc < date.today():
                nota.status_pagamento = StatusPagamento.VENCIDO
        except ValueError:
            pass
    await db.commit()
    return await get_nota(db, nota_id)


async def criar_parcelas(db: AsyncSession, nota_id: int, payload: AplicarParcelasRequest) -> Optional[NotaFiscal]:
    nota = await get_nota(db, nota_id)
    if not nota:
        return None
    # Remove parcelas existentes
    await db.execute(delete(Parcela).where(Parcela.nota_id == nota_id))
    valor_parcela = round((nota.valor_total or 0) / payload.num_parcelas, 2)
    data_base = _parse_data_br(payload.data_primeira_parcela)
    if not data_base:
        raise ValueError("Data da primeira parcela inválida. Use DD/MM/AAAA.")
    for i in range(payload.num_parcelas):
        venc = data_base + relativedelta(months=i)
        db.add(Parcela(
            nota_id=nota_id,
            numero=i + 1,
            valor=valor_parcela,
            data_vencimento=venc.strftime("%d/%m/%Y"),
            status_pagamento=StatusPagamento.PENDENTE,
        ))
    nota.num_parcelas = payload.num_parcelas
    nota.valor_parcela = valor_parcela
    await db.commit()
    return await get_nota(db, nota_id)


async def atualizar_parcela(db: AsyncSession, parcela_id: int, payload: AtualizarParcelaRequest) -> Optional[Parcela]:
    result = await db.execute(select(Parcela).where(Parcela.id == parcela_id))
    parcela = result.scalar_one_or_none()
    if not parcela:
        return None
    parcela.status_pagamento = payload.status_pagamento
    parcela.data_pagamento = payload.data_pagamento
    await db.commit()
    result = await db.execute(select(Parcela).where(Parcela.id == parcela_id))
    return result.scalar_one_or_none()


async def list_parcelas(db: AsyncSession, apenas_pendentes: bool = False) -> List[Parcela]:
    query = select(Parcela).options(selectinload(Parcela.nota))
    if apenas_pendentes:
        query = query.where(Parcela.status_pagamento != StatusPagamento.PAGO)
    query = query.order_by(Parcela.data_vencimento)
    result = await db.execute(query)
    return list(result.scalars().all())


async def list_itens_por_categoria(db: AsyncSession) -> List[ItemNF]:
    """Retorna todos os itens com centro de custo via rateio."""
    result = await db.execute(
        select(ItemNF)
        .options(
            selectinload(ItemNF.rateios),
            selectinload(ItemNF.nota),
        )
        .order_by(ItemNF.categoria_produto)
    )
    return list(result.scalars().all())


async def aplicar_rateio_item(db: AsyncSession, item_id: int, payload: AplicarRateioItemRequest) -> Optional[ItemNF]:
    result = await db.execute(
        select(ItemNF).options(selectinload(ItemNF.rateios)).where(ItemNF.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        return None
    await db.execute(delete(RateioItem).where(RateioItem.item_id == item_id))
    for r in payload.rateios:
        db.add(RateioItem(
            item_id=item_id,
            centro_custo=r.centro_custo,
            sub_categoria=r.sub_categoria,
            percentual=r.percentual,
            valor_calculado=_calc_valor(item.valor_total, r.percentual),
        ))
    await db.commit()
    result = await db.execute(
        select(ItemNF).options(selectinload(ItemNF.rateios)).where(ItemNF.id == item_id)
    )
    return result.scalar_one_or_none()
