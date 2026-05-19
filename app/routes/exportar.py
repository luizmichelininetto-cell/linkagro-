from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import io
from app.database import get_db
from app.services import crud, export_service
from app.auth import verify_api_key
from app.models.nota_fiscal import FormaPagamento, CentroCusto

router = APIRouter(prefix="/exportar", tags=["Exportação"], dependencies=[Depends(verify_api_key)])


@router.get("/excel", summary="Exportar para Excel (.xlsx) com abas de detalhe e resumo por centro de custo")
async def export_excel(
    fornecedor: Optional[str] = Query(None),
    forma_pagamento: Optional[FormaPagamento] = Query(None),
    centro_custo: Optional[CentroCusto] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    notas = await crud.list_notas_para_export(db, fornecedor=fornecedor, forma_pagamento=forma_pagamento, centro_custo=centro_custo)
    if not notas:
        return {"mensagem": "Nenhuma nota encontrada para exportar"}
    excel_bytes = export_service.export_to_excel(notas)
    return StreamingResponse(io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=notas_fiscais.xlsx"})


@router.get("/csv", summary="Exportar para CSV")
async def export_csv(
    fornecedor: Optional[str] = Query(None),
    forma_pagamento: Optional[FormaPagamento] = Query(None),
    centro_custo: Optional[CentroCusto] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    notas = await crud.list_notas_para_export(db, fornecedor=fornecedor, forma_pagamento=forma_pagamento, centro_custo=centro_custo)
    if not notas:
        return {"mensagem": "Nenhuma nota encontrada para exportar"}
    csv_bytes = export_service.export_to_csv(notas)
    return StreamingResponse(io.BytesIO(csv_bytes), media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=notas_fiscais.csv"})
