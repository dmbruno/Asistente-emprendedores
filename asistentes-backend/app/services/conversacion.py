"""Máquina de estados finitos para conversaciones de WhatsApp.

Estados (tabla conversaciones_wpp.estado):
- libre: no hay nada pendiente.
- esperando_confirmacion: el cliente acaba de mandar una factura, esperamos sí/no.
- esperando_correccion: el cliente dijo que algo está mal, esperamos qué corregir.
"""

from __future__ import annotations

from enum import Enum


class EstadoConversacion(str, Enum):
    LIBRE = "libre"
    ESPERANDO_CONFIRMACION = "esperando_confirmacion"
    ESPERANDO_CORRECCION = "esperando_correccion"


# Tiempo en segundos antes de que una conversación pendiente expire y se libere.
TTL_CONVERSACION_SEG = 60 * 60  # 1 hora


def interpretar_respuesta(texto: str) -> str:
    """Clasifica la respuesta del usuario en una conversación con confirmación pendiente.

    Devuelve: 'si' | 'no' | 'correccion' | 'desconocido'
    """
    t = (texto or "").strip().lower()
    if t in {"si", "sí", "ok", "dale", "confirmo", "confirmar", "👍"}:
        return "si"
    if t in {"no", "incorrecto", "mal", "rechazar", "👎"}:
        return "no"
    if t:
        return "correccion"
    return "desconocido"
