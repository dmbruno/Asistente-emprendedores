"""Consulta de padrón AFIP por CUIT.

Modo stub si no hay certificado configurado: devuelve un objeto vacío con
validado=False. Se activa el modo real cuando AFIP_CERT_PATH y AFIP_KEY_PATH
están definidos en el .env.
"""

from __future__ import annotations

import logging
from typing import TypedDict

from app.config import get_settings
from app.utils.cuit import is_valid as cuit_is_valid

logger = logging.getLogger(__name__)


class PadronAfip(TypedDict, total=False):
    cuit: str
    razon_social: str | None
    condicion_iva: str | None
    estado: str | None
    domicilio: str | None
    validado: bool
    fuente: str  # "afip" | "stub" | "cache"


def consultar_padron(cuit: str) -> PadronAfip:
    """Consulta el padrón AFIP. Devuelve stub si no hay cert."""
    settings = get_settings()

    if not cuit_is_valid(cuit):
        return {"cuit": cuit, "validado": False, "fuente": "stub"}

    if not settings.afip_configured:
        logger.info("AFIP no configurado, devolviendo stub para CUIT %s", cuit)
        return {
            "cuit": cuit,
            "razon_social": None,
            "condicion_iva": None,
            "estado": None,
            "validado": False,
            "fuente": "stub",
        }

    # TODO: implementar consulta real con pyafipws / afip.ws.
    # 1. autenticarse con WSAA (usa AFIP_CERT_PATH + AFIP_KEY_PATH)
    # 2. consultar webservice ws_sr_constancia_inscripcion
    # 3. cachear en tabla cache_afip por 30 días
    raise NotImplementedError("Modo AFIP real aún no implementado")
