from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.auth import verify_api_key
from app.models.nota_fiscal import NotaFiscal, RateioNota, RateioItem, ItemNF, CentroCusto, StatusPagamento
from app.services.crud import list_notas_para_export
from datetime import date

router = APIRouter(prefix="/dashboard", tags=["Dashboard"], dependencies=[Depends(verify_api_key)])


@router.get("/")
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    notas = await list_notas_para_export(db)

    total_notas = len(notas)
    valor_total_geral = sum(n.valor_total or 0 for n in notas)

    # Totais por status de pagamento
    por_status: dict = {s.value: {"count": 0, "valor": 0.0} for s in StatusPagamento}
    for n in notas:
        st = (n.status_pagamento or StatusPagamento.PENDENTE).value
        por_status[st]["count"] += 1
        por_status[st]["valor"] += n.valor_total or 0

    # Totais por centro de custo (usando rateios)
    por_cc: dict = {c.value: 0.0 for c in CentroCusto}
    sem_rateio = 0.0
    today = date.today()
    for n in notas:
        rateio_nota = {r.centro_custo.value: r.valor_calculado for r in (n.rateios or [])}
        itens = n.itens or []
        if itens:
            for item in itens:
                rateio_item = {r.centro_custo.value: r.valor_calculado for r in (item.rateios or [])}
                rateio = rateio_item or rateio_nota
                if rateio:
                    for c, v in rateio.items():
                        if v and c in por_cc:
                            por_cc[c] += v
                else:
                    sem_rateio += item.valor_total or 0
        else:
            if rateio_nota:
                for c, v in rateio_nota.items():
                    if v and c in por_cc:
                        por_cc[c] += v
            else:
                sem_rateio += n.valor_total or 0

    # Evolução mensal (últimos 12 meses)
    mensal: dict = {}
    for n in notas:
        if n.data_emissao:
            try:
                mes = n.data_emissao[:7]  # "YYYY-MM"
                mensal[mes] = mensal.get(mes, 0.0) + (n.valor_total or 0)
            except Exception:
                pass

    meses_ordenados = sorted(mensal.items())[-12:]

    # Vencimentos próximos (pendentes/vencidos nos próximos 30 dias ou vencidos)
    alertas = []
    for n in notas:
        st = n.status_pagamento or StatusPagamento.PENDENTE
        if st in (StatusPagamento.PENDENTE, StatusPagamento.VENCIDO) and n.data_vencimento:
            try:
                venc = date.fromisoformat(n.data_vencimento)
                delta = (venc - today).days
                if delta <= 30:
                    alertas.append({
                        "id": n.id,
                        "fornecedor": n.fornecedor,
                        "valor_total": n.valor_total,
                        "data_vencimento": n.data_vencimento,
                        "dias_para_vencer": delta,
                        "status": st.value,
                    })
            except ValueError:
                pass

    alertas.sort(key=lambda x: x["dias_para_vencer"])

    return {
        "total_notas": total_notas,
        "valor_total_geral": round(valor_total_geral, 2),
        "por_status": por_status,
        "por_centro_custo": {k: round(v, 2) for k, v in por_cc.items()},
        "sem_rateio": round(sem_rateio, 2),
        "evolucao_mensal": [{"mes": m, "valor": round(v, 2)} for m, v in meses_ordenados],
        "alertas_vencimento": alertas[:10],
    }
