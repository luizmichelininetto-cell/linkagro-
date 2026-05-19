from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.auth import verify_api_key
from app.models.nota_fiscal import ItemNF, RateioItem, NotaFiscal, Parcela, StatusPagamento
from app.services.crud import list_notas_para_export, list_parcelas
from datetime import date
from dateutil.relativedelta import relativedelta

router = APIRouter(prefix="/insumos", tags=["Insumos"], dependencies=[Depends(verify_api_key)])

CENTROS = ["lavoura", "pecuaria", "investimento", "sede"]


@router.get("/")
async def get_insumos(db: AsyncSession = Depends(get_db)):
    """Retorna itens agrupados por centro de custo e categoria de produto."""
    result = await db.execute(
        select(ItemNF)
        .options(
            selectinload(ItemNF.rateios),
            selectinload(ItemNF.nota),
        )
        .join(ItemNF.nota)
        .order_by(ItemNF.categoria_produto)
    )
    itens = result.scalars().all()

    # Agrupa por centro de custo → categoria → lista de itens
    agrupado: dict = {c: {} for c in CENTROS}
    sem_rateio = []

    for item in itens:
        rateios = item.rateios or []
        if not rateios:
            sem_rateio.append(_item_dict(item))
            continue
        for r in rateios:
            cc = r.centro_custo.value
            cat = item.categoria_produto or "Outros"
            if cc not in agrupado:
                continue
            if cat not in agrupado[cc]:
                agrupado[cc][cat] = []
            valor_item_cc = (item.valor_total or 0) * r.percentual / 100
            agrupado[cc][cat].append({**_item_dict(item), "valor_cc": round(valor_item_cc, 2)})

    # Converte para lista com totais
    resultado = {}
    for cc, cats in agrupado.items():
        resultado[cc] = []
        for cat, items_list in sorted(cats.items()):
            total = sum(i["valor_cc"] for i in items_list)
            resultado[cc].append({
                "categoria": cat,
                "total": round(total, 2),
                "itens": items_list,
            })

    return {"por_centro": resultado, "sem_rateio": sem_rateio}


@router.get("/mensal/")
async def get_gastos_mensais(db: AsyncSession = Depends(get_db)):
    """Retorna gastos mensais: notas emitidas + parcelas devidas por mês."""
    notas = await list_notas_para_export(db)

    # Gastos por mês (data_emissao da nota)
    notas_mes: dict = {}
    for n in notas:
        if not n.data_emissao:
            continue
        mes = _parse_mes(n.data_emissao)
        if mes:
            notas_mes[mes] = notas_mes.get(mes, 0.0) + (n.valor_total or 0)

    # Parcelas por mês de vencimento
    parcelas_result = await db.execute(
        select(Parcela).options(selectinload(Parcela.nota))
    )
    parcelas = parcelas_result.scalars().all()

    parcelas_mes: dict = {}
    parcelas_pagas_mes: dict = {}
    for p in parcelas:
        mes = _parse_mes(p.data_vencimento)
        if mes:
            parcelas_mes[mes] = parcelas_mes.get(mes, 0.0) + (p.valor or 0)
            if p.status_pagamento == StatusPagamento.PAGO:
                parcelas_pagas_mes[mes] = parcelas_pagas_mes.get(mes, 0.0) + (p.valor or 0)

    # Meses a exibir: 12 meses atrás até 6 meses à frente
    hoje = date.today()
    meses = []
    for i in range(-12, 7):
        m = (hoje + relativedelta(months=i)).strftime("%Y-%m")
        meses.append(m)

    resultado = []
    for mes in meses:
        resultado.append({
            "mes": mes,
            "notas_emitidas": round(notas_mes.get(mes, 0), 2),
            "parcelas_devidas": round(parcelas_mes.get(mes, 0), 2),
            "parcelas_pagas": round(parcelas_pagas_mes.get(mes, 0), 2),
        })

    return {"mensal": resultado}


def _item_dict(item: ItemNF) -> dict:
    nota = item.nota
    return {
        "id": item.id,
        "descricao": item.descricao,
        "quantidade": item.quantidade,
        "unidade": item.unidade,
        "valor_total": item.valor_total,
        "categoria_produto": item.categoria_produto or "Outros",
        "nota_id": item.nota_id,
        "fornecedor": nota.fornecedor if nota else None,
        "data_emissao": nota.data_emissao if nota else None,
        "valor_cc": item.valor_total or 0,
    }


def _parse_mes(data_str: str) -> str | None:
    """Converte DD/MM/AAAA ou AAAA-MM-DD para AAAA-MM."""
    if not data_str:
        return None
    try:
        if "/" in data_str:
            parts = data_str.split("/")
            return f"{parts[2]}-{parts[1].zfill(2)}"
        return data_str[:7]
    except Exception:
        return None
