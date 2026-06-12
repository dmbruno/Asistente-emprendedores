"""Contratos base del sistema de providers.

NormalizedFlight y NormalizedHotel son los tipos canónicos a los que
migraremos cuando sumemos Duffel / RateHawk. Por ahora los providers
devuelven el mismo dict legacy que devolvían las tools directamente;
estos dataclasses están definidos pero aún no se usan en producción.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable


# ---------------------------------------------------------------------------
# Tipos canónicos (pendientes de adopción — usarlos en la sesión de Duffel)
# ---------------------------------------------------------------------------

@dataclass
class NormalizedFlight:
    source: str
    airline: str
    net_amount: float
    sell_amount: float
    currency: str
    slices: list[dict[str, Any]]
    bookable: bool
    booking_token: str | None = None


@dataclass
class NormalizedHotel:
    source: str
    name: str
    stars: int
    net_price_per_night: float
    sell_price_per_night: float
    currency: str
    rating: float | None
    location: str
    amenities: list[str] = field(default_factory=list)
    link: str = ""
    bookable: bool = False


# ---------------------------------------------------------------------------
# Protocols
# ---------------------------------------------------------------------------

@runtime_checkable
class FlightProvider(Protocol):
    name: str
    cost_tier: int  # 0 = más barato de llamar; escalar por tier ascendente

    async def search_flights(self, serpapi_key: str, **params) -> dict:
        """Devuelve el dict legacy compatible con la tool search_flights."""
        ...


@runtime_checkable
class HotelProvider(Protocol):
    name: str
    cost_tier: int

    async def search_hotels(self, serpapi_key: str, **params) -> dict:
        """Devuelve el dict legacy compatible con la tool search_hotels."""
        ...
