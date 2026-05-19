from __future__ import annotations

import anthropic
import json
import logging
from typing import Optional
from app.config import settings
from app.schemas.nota_fiscal import NotaFiscalCreate, ItemNFCreate
from app.models.nota_fiscal import FormaPagamento

logger = logging.getLogger(__name__)

_client: Optional[anthropic.Anthropic] = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        if not settings.ANTHROPIC_API_KEY:
            raise RuntimeError("ANTHROPIC_API_KEY não configurada no .env")
        _client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


SYSTEM_PROMPT = """Você é um especialista em leitura de notas fiscais e recibos brasileiros.
Sua tarefa é extrair informações estruturadas do texto OCR ou imagem fornecida.

Retorne SOMENTE um JSON válido, sem markdown, sem explicações, no seguinte formato:
{
  "numero_nf": "número da nota fiscal ou cupom fiscal (string ou null)",
  "fornecedor": "nome do estabelecimento/empresa emissora (string ou null)",
  "data_emissao": "data no formato DD/MM/AAAA (string ou null)",
  "valor_total": 0.00,
  "forma_pagamento": "credito|debito|pix|boleto|dinheiro|desconhecido",
  "chave_acesso": "chave de acesso de 44 dígitos se houver (string ou null)",
  "confianca": 0.95,
  "itens": [
    {
      "descricao": "nome do produto",
      "quantidade": 1.0,
      "unidade": "UN|KG|L|CX|etc",
      "valor_unitario": 0.00,
      "valor_total": 0.00
    }
  ]
}

Regras:
- forma_pagamento: detecte palavras como "CRÉDITO", "DÉBITO", "PIX", "BOLETO", "DINHEIRO", "ESPÉCIE"
- valor_total: use o valor final pago (após descontos), como número float
- confianca: sua confiança de 0.0 a 1.0 na extração
- Se um campo não for encontrado, use null
- Para itens: inclua todos os produtos/serviços listados
- NÃO invente dados. Se não encontrar, use null
"""


async def extract_nf_from_text(ocr_text: str) -> dict:
    try:
        message = get_client().messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"Extraia os dados desta nota fiscal/recibo:\n\n{ocr_text}"}]
        )
        raw = message.content[0].text.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error(f"Claude retornou JSON inválido: {e}")
        raise ValueError("Resposta inválida do modelo de IA")
    except Exception as e:
        logger.error(f"Erro ao chamar Claude: {e}")
        raise


async def extract_nf_from_image(image_bytes: bytes, media_type: str = "image/jpeg") -> dict:
    import base64
    image_data = base64.standard_b64encode(image_bytes).decode("utf-8")
    try:
        message = get_client().messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_data}},
                    {"type": "text", "text": "Extraia os dados desta nota fiscal ou recibo."}
                ]
            }]
        )
        raw = message.content[0].text.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error(f"Claude Vision retornou JSON inválido: {e}")
        raise ValueError("Resposta inválida do modelo de IA")
    except Exception as e:
        logger.error(f"Erro ao chamar Claude Vision: {e}")
        raise


def parse_extraction_to_schema(data: dict) -> NotaFiscalCreate:
    itens = [
        ItemNFCreate(
            descricao=item.get("descricao", ""),
            quantidade=item.get("quantidade"),
            unidade=item.get("unidade"),
            valor_unitario=item.get("valor_unitario"),
            valor_total=item.get("valor_total"),
        )
        for item in data.get("itens", [])
    ]
    fp_raw = (data.get("forma_pagamento") or "desconhecido").lower()
    try:
        forma_pagamento = FormaPagamento(fp_raw)
    except ValueError:
        forma_pagamento = FormaPagamento.DESCONHECIDO
    return NotaFiscalCreate(
        numero_nf=data.get("numero_nf"),
        fornecedor=data.get("fornecedor"),
        data_emissao=data.get("data_emissao"),
        valor_total=data.get("valor_total"),
        forma_pagamento=forma_pagamento,
        chave_acesso=data.get("chave_acesso"),
        itens=itens,
    )
