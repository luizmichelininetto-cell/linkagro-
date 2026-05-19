from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional
from app.models.nota_fiscal import NotaFiscal, ItemNF, RateioNota, RateioItem, FormaPagamento, CentroCusto
from app.schemas.nota_fiscal import NotaFiscalCreate, AplicarRateioNotaRequest, AplicarRateioItemRequest


def _calc_valor(base: Optional[float], percentual: float) -> Optional[float]:
    if base is None:
        return None
    return round(base * percentual / 100, 2)


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
