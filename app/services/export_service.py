import pandas as pd
import io
from typing import List
from app.models.nota_fiscal import NotaFiscal, CentroCusto

CENTROS = [c.value for c in CentroCusto]


def _rateio_nota_map(nota: NotaFiscal) -> dict:
    return {r.centro_custo.value: r.valor_calculado for r in (nota.rateios or [])}


def _rateio_nota_sub_map(nota: NotaFiscal) -> dict:
    return {r.centro_custo.value: r.sub_categoria for r in (nota.rateios or [])}


def _rateio_item_map(item) -> dict:
    return {r.centro_custo.value: r.valor_calculado for r in (item.rateios or [])}


def _rateio_item_sub_map(item) -> dict:
    return {r.centro_custo.value: r.sub_categoria for r in (item.rateios or [])}


def notas_to_dataframe(notas: List[NotaFiscal]) -> pd.DataFrame:
    rows = []
    for nota in notas:
        rateio_nota = _rateio_nota_map(nota)
        rateio_nota_sub = _rateio_nota_sub_map(nota)
        itens = nota.itens or []
        if itens:
            for item in itens:
                rateio_item = _rateio_item_map(item)
                rateio_item_sub = _rateio_item_sub_map(item)
                rateio_efetivo = rateio_item if rateio_item else rateio_nota
                sub_efetivo = rateio_item_sub if rateio_item else rateio_nota_sub
                row = {
                    "ID Nota": nota.id, "Número NF": nota.numero_nf,
                    "Fornecedor": nota.fornecedor, "Data Emissão": nota.data_emissao,
                    "Valor Total NF": nota.valor_total,
                    "Forma Pagamento": nota.forma_pagamento.value if nota.forma_pagamento else None,
                    "Chave Acesso": nota.chave_acesso, "Produto": item.descricao,
                    "Quantidade": item.quantidade, "Unidade": item.unidade,
                    "Valor Unitário": item.valor_unitario, "Valor Total Item": item.valor_total,
                    "Nível Rateio": "item" if rateio_item else ("nota" if rateio_nota else None),
                    "Lançado em": nota.criado_em.strftime("%d/%m/%Y %H:%M"),
                }
                for c in CENTROS:
                    row[f"CC {c.capitalize()}"] = rateio_efetivo.get(c)
                    row[f"Sub {c.capitalize()}"] = sub_efetivo.get(c)
                rows.append(row)
        else:
            row = {
                "ID Nota": nota.id, "Número NF": nota.numero_nf,
                "Fornecedor": nota.fornecedor, "Data Emissão": nota.data_emissao,
                "Valor Total NF": nota.valor_total,
                "Forma Pagamento": nota.forma_pagamento.value if nota.forma_pagamento else None,
                "Chave Acesso": nota.chave_acesso, "Produto": None,
                "Quantidade": None, "Unidade": None, "Valor Unitário": None,
                "Valor Total Item": None,
                "Nível Rateio": "nota" if rateio_nota else None,
                "Lançado em": nota.criado_em.strftime("%d/%m/%Y %H:%M"),
            }
            for c in CENTROS:
                row[f"CC {c.capitalize()}"] = rateio_nota.get(c)
                row[f"Sub {c.capitalize()}"] = rateio_nota_sub.get(c)
            rows.append(row)
    return pd.DataFrame(rows)


def export_to_excel(notas: List[NotaFiscal]) -> bytes:
    df = notas_to_dataframe(notas)
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Notas Fiscais")
        ws = writer.sheets["Notas Fiscais"]
        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            ws.column_dimensions[col[0].column_letter].width = min(max_len + 4, 50)
        resumo_df = pd.DataFrame(_build_resumo(notas))
        resumo_df.to_excel(writer, index=False, sheet_name="Resumo por Centro de Custo")
    buffer.seek(0)
    return buffer.read()


def export_to_csv(notas: List[NotaFiscal]) -> bytes:
    df = notas_to_dataframe(notas)
    return df.to_csv(index=False, encoding="utf-8-sig").encode("utf-8-sig")


def _build_resumo(notas: List[NotaFiscal]) -> list:
    totais = {c: 0.0 for c in CENTROS}
    sem_rateio = 0.0
    for nota in notas:
        rateio_nota = _rateio_nota_map(nota)
        itens = nota.itens or []
        if itens:
            for item in itens:
                rateio_item = _rateio_item_map(item)
                rateio = rateio_item or rateio_nota
                if rateio:
                    for c, v in rateio.items():
                        if v and c in totais:
                            totais[c] += v
                else:
                    sem_rateio += item.valor_total or 0.0
        else:
            if rateio_nota:
                for c, v in rateio_nota.items():
                    if v and c in totais:
                        totais[c] += v
            else:
                sem_rateio += nota.valor_total or 0.0
    rows = [{"Centro de Custo": c.capitalize(), "Total (R$)": round(totais[c], 2)} for c in CENTROS]
    if sem_rateio:
        rows.append({"Centro de Custo": "Sem rateio", "Total (R$)": round(sem_rateio, 2)})
    return rows
