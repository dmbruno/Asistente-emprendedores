"""Alertas de tope de monotributo: cron que corre 1 vez al día.

Para cada cliente con plan='monotributo', calcula la facturación acumulada
del cuatrimestre y compara con el tope de su categoría. Si supera 75%,
dispara mensaje de WhatsApp.
"""

from __future__ import annotations

import logging
from datetime import date

logger = logging.getLogger(__name__)

# Topes anuales (recategorización cuatrimestral suma 12 meses).
# Actualizar al inicio de cada año fiscal o cuando AFIP los modifique.
# Fuente: AFIP — Resolución General de actualización anual.
TOPES_MONOTRIBUTO_2026: dict[str, float] = {
    "A": 8_992_597.87,
    "B": 13_175_201.52,
    "C": 18_473_166.15,
    "D": 22_934_610.37,
    "E": 26_977_793.46,
    "F": 33_809_379.57,
    "G": 40_671_103.50,
    "H": 61_344_853.64,
    "I": 68_664_555.25,
    "J": 78_625_472.66,
    "K": 94_805_682.90,
}

UMBRAL_ALERTA = 0.75


def porcentaje_uso(facturado: float, categoria: str) -> float | None:
    tope = TOPES_MONOTRIBUTO_2026.get(categoria)
    if not tope:
        return None
    return facturado / tope


def debe_alertar(facturado: float, categoria: str) -> bool:
    pct = porcentaje_uso(facturado, categoria)
    return pct is not None and pct >= UMBRAL_ALERTA


def correr_alertas_diarias(hoy: date | None = None) -> int:
    """Itera clientes monotributistas y dispara alertas. Devuelve cantidad enviada."""
    _ = hoy or date.today()
    # TODO:
    # 1. SELECT id, categoria_monotributo, whatsapp FROM clientes
    #    WHERE condicion_fiscal='monotributo' AND activo=true
    # 2. para cada uno:
    #    - sumar total de facturas tipo='venta' del cuatrimestre actual
    #    - si debe_alertar() → enviar mensaje WhatsApp vía Baileys
    # 3. registrar en tabla auxiliar para no repetir alerta el mismo día
    return 0
