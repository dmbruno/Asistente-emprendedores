"""Router de providers.

Estrategia de cascada por disponibilidad:
  1. Vuelos: Duffel primero (datos reales, bookables). Si no hay token o devuelve
     vacío, cae a SerpAPI (Google Flights, informacional).
  2. Hoteles: SerpAPI únicamente (Duffel no ofrece hoteles).

TODO: cuando haya ≥2 providers del mismo tipo, ordenar por cost_tier e implementar
cascada automática (consultar el más barato primero, escalar si no hay resultados).
"""

from __future__ import annotations

from .duffel import DuffelFlightProvider
from .serpapi import SerpapiFlightProvider, SerpapiHotelProvider

_duffel = DuffelFlightProvider()
_serpapi_flights = SerpapiFlightProvider()
_serpapi_hotels = SerpapiHotelProvider()


def _has_results(result: dict) -> bool:
    """True si el resultado del provider tiene vuelos válidos (no vacío, no error)."""
    if not result or result.get("error"):
        return False
    if result.get("mode") == "price_hunter":
        return bool(result.get("exact_date_flights") or result.get("flexible_flights"))
    # modo exact o dict genérico con flights
    return bool(result.get("flights"))


async def search_flights(serpapi_key: str, **params) -> dict:
    from app.config import settings

    if settings.duffel_token:
        try:
            result = await _duffel.search_flights(settings.duffel_token, **params)
            if _has_results(result):
                return result
            # Si Duffel devolvió fecha_pasada, propagamos el error directamente
            if result.get("error") == "fecha_pasada":
                return result
        except Exception:
            pass  # cualquier falla de Duffel → caemos a SerpAPI

    return await _serpapi_flights.search_flights(serpapi_key, **params)


async def search_hotels(serpapi_key: str, **params) -> dict:
    return await _serpapi_hotels.search_hotels(serpapi_key, **params)
