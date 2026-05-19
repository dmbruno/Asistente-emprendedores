"""Construye un resumen de cotización estructurado para mostrar en UI y generar PDF."""

from __future__ import annotations

from datetime import datetime

TOOL_DEFINITION = {
    "name": "build_quote",
    "description": (
        "Genera un resumen estructurado de cotización de viaje con vuelo Y hotel en una sola llamada. "
        "IMPORTANTE: llamar UNA SOLA VEZ pasando tanto flight_option como hotel_option juntos. "
        "Nunca llamar dos veces separando vuelo y hotel. "
        "Llamar cuando el usuario confirmó las opciones elegidas."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "trip_name": {
                "type": "string",
                "description": "Nombre descriptivo del viaje (ej: 'Viaje a Miami – Mar 2025')",
            },
            "passenger_name": {
                "type": "string",
                "description": "Nombre del pasajero principal",
            },
            "flight_option": {
                "type": "object",
                "description": "Opción de vuelo seleccionada (del resultado de search_flights)",
                "properties": {
                    "airline": {"type": "string"},
                    "total_amount": {"type": "string"},
                    "total_currency": {"type": "string"},
                    "slices": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "duration": {"type": "string"},
                                "stops": {"type": "integer"},
                                "departure": {"type": "string"},
                                "arrival": {"type": "string"},
                            },
                        },
                    },
                },
            },
            "hotel_option": {
                "type": "object",
                "description": "Opción de hotel seleccionada (del resultado de search_hotels)",
                "properties": {
                    "name": {"type": "string"},
                    "stars": {"type": "integer"},
                    "price_per_night_usd": {"type": "number"},
                    "location": {"type": "string"},
                },
            },
            "nights": {
                "type": "integer",
                "description": "Cantidad de noches de hospedaje",
            },
            "currency": {
                "type": "string",
                "description": "Moneda para mostrar el total (USD, ARS, EUR)",
                "default": "USD",
            },
            "notes": {
                "type": "string",
                "description": "Notas adicionales o servicios extra incluidos",
            },
        },
        "required": ["trip_name", "passenger_name"],
    },
}


def build_quote(**params) -> dict:
    """Arma el objeto de cotización. No llama a APIs externas."""
    flight = params.get("flight_option") or {}
    hotel = params.get("hotel_option") or {}
    nights = params.get("nights", 0)
    currency = params.get("currency", "USD")

    flight_cost = _parse_amount(flight.get("total_amount", "0"))
    hotel_cost = float(hotel.get("price_per_night_usd", 0)) * nights
    total = flight_cost + hotel_cost

    quote = {
        "quote_id": f"TQ-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        "created_at": datetime.utcnow().isoformat(),
        "trip_name": params.get("trip_name"),
        "passenger_name": params.get("passenger_name"),
        "currency": currency,
        "breakdown": {
            "flight": {
                "airline": flight.get("airline", "—"),
                "amount": flight_cost,
                "slices": flight.get("slices", []),
            },
            "hotel": {
                "name": hotel.get("name", "—"),
                "stars": hotel.get("stars"),
                "location": hotel.get("location"),
                "nights": nights,
                "price_per_night": float(hotel.get("price_per_night_usd", 0)),
                "amount": hotel_cost,
            },
        },
        "total": total,
        "notes": params.get("notes", ""),
    }
    return {"quote": quote, "ready_to_send": True}


def _parse_amount(value) -> float:
    try:
        return float(str(value).replace(",", ""))
    except (ValueError, TypeError):
        return 0.0
