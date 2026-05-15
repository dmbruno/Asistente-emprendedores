"""Extracción de datos de facturas con IA visión.

Providers soportados:
  - Claude Opus 4.7  (BYOK: la api_key la trae el cliente, se lee de DB)
  - Gemini 2.0 Flash (plataforma: GEMINI_API_KEY en .env — tier gratuito para dev)

Si GEMINI_API_KEY está seteado en el entorno, se usa Gemini y se ignora la
api_key del cliente.  En producción se puede forzar Claude dejando la var vacía.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import re
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger(__name__)

CLAUDE_MODEL = "claude-opus-4-7"
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
_PROMPTS_DIR = Path(__file__).resolve().parent.parent.parent / "prompts"
# Mantener el viejo path como fallback para tests que lo usen directamente
PROMPT_PATH = _PROMPTS_DIR / "extraccion_factura.md"


class Confianza(BaseModel):
    global_: int = Field(ge=0, le=100, alias="global")
    tipo_comprobante: int = Field(ge=0, le=100, default=0)
    numero: int = Field(ge=0, le=100, default=0)
    fecha: int = Field(ge=0, le=100, default=0)
    emisor_cuit: int = Field(ge=0, le=100, default=0)
    total: int = Field(ge=0, le=100, default=0)
    items: int = Field(ge=0, le=100, default=0)

    @field_validator("global_", "tipo_comprobante", "numero", "fecha", "emisor_cuit", "total", "items", mode="before")
    @classmethod
    def _none_to_zero(cls, v: Any) -> int:
        return 0 if v is None else v


class Parte(BaseModel):
    cuit: str | None = None
    razon_social: str | None = None
    condicion_iva: str | None = None


class Item(BaseModel):
    descripcion: str
    cantidad: float
    precio_unitario: float
    subtotal: float


class FacturaExtraida(BaseModel):
    tipo_comprobante: str | None = None
    punto_venta: str | None = None
    numero: str | None = None
    fecha: str | None = None
    emisor: Parte = Field(default_factory=Parte)
    receptor: Parte = Field(default_factory=Parte)
    items: list[Item] = Field(default_factory=list)
    neto_gravado: float | None = None
    subtotal: float = 0.0
    iva_21: float = 0.0
    iva_10_5: float = 0.0
    iva_27: float = 0.0
    otros_impuestos: float = 0.0
    total: float = 0.0
    cae: str | None = None
    vencimiento_cae: str | None = None
    moneda: str = "ARS"
    confianza: Confianza
    observaciones: str | None = None

    @field_validator("subtotal", "iva_21", "iva_10_5", "iva_27", "otros_impuestos", "total", mode="before")
    @classmethod
    def _none_to_zero(cls, v: Any) -> float:
        return 0.0 if v is None else v

    @field_validator("moneda", mode="before")
    @classmethod
    def _moneda_valida(cls, v: Any) -> str:
        if not isinstance(v, str) or v not in {"ARS", "USD", "EUR"}:
            return "ARS"
        return v


class ExtraccionError(Exception):
    pass


def _mock_factura() -> FacturaExtraida:
    return FacturaExtraida(
        tipo_comprobante="Factura B",
        punto_venta="0001",
        numero="00000042",
        fecha="2026-05-04",
        emisor=Parte(
            cuit="20-12345678-1",
            razon_social="Proveedor Demo S.A.",
            condicion_iva="Responsable Inscripto",
        ),
        receptor=Parte(
            cuit="27-98765432-1",
            razon_social="Cliente Demo",
            condicion_iva="Monotributista",
        ),
        items=[
            Item(descripcion="Servicio de consultoría", cantidad=1, precio_unitario=10000.0, subtotal=10000.0),
            Item(descripcion="Materiales varios", cantidad=2, precio_unitario=1500.0, subtotal=3000.0),
        ],
        subtotal=13000.0,
        iva_21=2730.0,
        total=15730.0,
        cae="12345678901234",
        vencimiento_cae="2026-05-14",
        moneda="ARS",
        confianza=Confianza(**{"global": 95, "tipo_comprobante": 99, "numero": 99, "fecha": 99, "emisor_cuit": 90, "total": 95, "items": 85}),
    )


def _load_prompt(condicion_fiscal: str = "monotributo") -> str:
    if condicion_fiscal == "responsable_inscripto":
        path = _PROMPTS_DIR / "extraccion_ri.md"
    else:
        path = _PROMPTS_DIR / "extraccion_monotributo.md"
        if not path.exists():
            path = PROMPT_PATH  # fallback al prompt original
    if not path.exists():
        raise ExtraccionError(f"Prompt no encontrado en {path}")
    return path.read_text(encoding="utf-8")


def _parse_response(text: str) -> FacturaExtraida:
    text = text.strip()
    # Extraer JSON si Claude lo envolvió en bloque markdown
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        text = match.group(1).strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        raise ExtraccionError(f"Respuesta no es JSON válido: {e}. Inicio: {text[:200]}")

    if data.get("error") == "no_es_comprobante":
        raise ExtraccionError("La imagen no es un comprobante fiscal")

    try:
        return FacturaExtraida(**data)
    except Exception as e:
        raise ExtraccionError(f"Datos del comprobante inválidos: {e}")


def extraer_factura(
    image_bytes: bytes,
    api_key: str,
    media_type: str = "image/jpeg",
    provider: str = "anthropic",
    condicion_fiscal: str = "monotributo",
) -> FacturaExtraida:
    """Extrae datos de factura con visión.

    Orden de prioridad:
    1. MOCK_CLAUDE env → devuelve factura de prueba.
    2. GEMINI_API_KEY env → override de plataforma (dev/free tier).
    3. `provider` arg con `api_key` BYOK del cliente.

    condicion_fiscal: "monotributo" | "responsable_inscripto" | "exento"
      Determina qué prompt se usa y qué campos se esperan en el JSON resultante.
    """
    if os.getenv("MOCK_CLAUDE", "").lower() in ("1", "true", "yes"):
        logger.info("MOCK_CLAUDE activo — devolviendo factura de prueba")
        return _mock_factura()

    # Override de plataforma: GEMINI_API_KEY en el entorno tiene prioridad
    gemini_env_key = os.getenv("GEMINI_API_KEY", "").strip()
    if gemini_env_key:
        return _extraer_con_gemini(image_bytes, gemini_env_key, media_type, condicion_fiscal)

    # Rutear según el provider BYOK del cliente
    if provider == "google":
        return _extraer_con_gemini(image_bytes, api_key, media_type, condicion_fiscal)
    elif provider in ("anthropic", "openai"):
        return _extraer_con_claude(image_bytes, api_key, media_type, condicion_fiscal)
    else:
        raise ExtraccionError(f"Provider '{provider}' no soportado para extracción de facturas.")


def _extraer_con_gemini(image_bytes: bytes, api_key: str, media_type: str, condicion_fiscal: str = "monotributo") -> FacturaExtraida:
    import google.generativeai as genai
    from google.api_core.exceptions import ResourceExhausted, PermissionDenied
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(GEMINI_MODEL)
    prompt = _load_prompt(condicion_fiscal)

    try:
        response = model.generate_content([
            {"mime_type": media_type, "data": image_bytes},
            prompt,
        ])
    except ResourceExhausted:
        raise ExtraccionError(
            "Quota de Gemini agotada o key sin free tier. "
            "Creá la key desde aistudio.google.com o activá MOCK_CLAUDE=true."
        )
    except PermissionDenied:
        raise ExtraccionError("GEMINI_API_KEY inválida o sin permisos para el modelo.")
    except Exception as e:
        raise ExtraccionError(f"Error llamando a Gemini: {e}")

    text = response.text.strip()
    logger.debug("Respuesta Gemini (%s): %s", GEMINI_MODEL, text[:500])
    return _parse_response(text)


def _extraer_con_claude(image_bytes: bytes, api_key: str, media_type: str, condicion_fiscal: str = "monotributo") -> FacturaExtraida:
    from anthropic import Anthropic
    if not api_key:
        raise ExtraccionError("api_key vacía")

    client = Anthropic(api_key=api_key)
    prompt = _load_prompt(condicion_fiscal)
    data_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    # PDFs se envían como documento; imágenes como image block
    if media_type == "application/pdf":
        content_block: dict = {
            "type": "document",
            "source": {
                "type": "base64",
                "media_type": "application/pdf",
                "data": data_b64,
            },
        }
    else:
        content_block = {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": media_type,
                "data": data_b64,
            },
        }

    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=2048,
        messages=[
            {
                "role": "user",
                "content": [
                    content_block,
                    {"type": "text", "text": prompt},
                ],
            }
        ],
    )

    text = "".join(block.text for block in response.content if block.type == "text").strip()
    logger.debug("Respuesta Claude: %s", text[:500])
    return _parse_response(text)


def validar_matematica(data: FacturaExtraida, tolerancia: float = 1.0) -> bool:
    """subtotal + impuestos ≈ total (tolerancia $1 por default)."""
    suma = data.subtotal + data.iva_21 + data.iva_10_5 + data.iva_27 + data.otros_impuestos
    return abs(suma - data.total) <= tolerancia


def to_db_dict(data: FacturaExtraida) -> dict[str, Any]:
    """Convierte el modelo Pydantic a dict para insertar en tabla `facturas`."""
    return data.model_dump(by_alias=True)
