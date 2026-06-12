"""Búsqueda de vuelos — delega en app/providers/router.py."""

from __future__ import annotations

from datetime import datetime, timedelta

from app.providers import router

TOOL_DEFINITION = {
    "name": "search_flights",
    "description": (
        "Busca vuelos en Google Flights para la ruta y fechas indicadas. "
        "En modo 'price_hunter' (por defecto) busca también ±3 días y muestra cuánto "
        "se ahorra cambiando la fecha. Devuelve aerolínea, precio, escalas y duración."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "origin": {
                "type": "string",
                "description": "Código IATA del aeropuerto de origen (ej: EZE, AEP, COR)",
            },
            "destination": {
                "type": "string",
                "description": "Código IATA del aeropuerto de destino (ej: MIA, JFK, MAD, BCN)",
            },
            "departure_date": {
                "type": "string",
                "description": "Fecha de salida en formato YYYY-MM-DD",
            },
            "return_date": {
                "type": "string",
                "description": "Fecha de regreso en formato YYYY-MM-DD (omitir si es solo ida)",
            },
            "passengers": {
                "type": "integer",
                "description": "Cantidad de pasajeros adultos",
                "default": 1,
            },
            "cabin_class": {
                "type": "string",
                "enum": ["economy", "premium_economy", "business", "first"],
                "description": "Clase de cabina solicitada",
                "default": "economy",
            },
            "search_mode": {
                "type": "string",
                "enum": ["exact", "price_hunter"],
                "description": (
                    "exact: busca solo la fecha pedida. "
                    "price_hunter: busca ±3 días y muestra la tarifa más barata vs la fecha pedida."
                ),
                "default": "price_hunter",
            },
        },
        "required": ["origin", "destination", "departure_date"],
    },
}


async def search_flights(serpapi_key: str, allow_real_data: bool = True, **params) -> dict:
    if not allow_real_data:
        result = _mock_results(params)
        result["note"] = "Plan free: alcanzaste el límite de 3 cotizaciones reales este mes. Estos son datos de ejemplo. Suscribite al plan Pro para cotizaciones reales ilimitadas."
        return result
    if not serpapi_key:
        return _mock_results(params)

    result = await router.search_flights(serpapi_key, **params)

    # El router devuelve {} cuando no hay resultados (todas las fechas fallaron sin
    # error de fecha pasada). En ese caso caemos al mock local.
    if not result:
        return _mock_results(params)

    return result


def _mock_results(params: dict) -> dict:
    dep = params.get("departure_date", "2025-01-01")
    base = datetime.strptime(dep, "%Y-%m-%d")
    cheaper = (base - timedelta(days=2)).strftime("%Y-%m-%d")
    return {
        "mode": "price_hunter",
        "requested_date": dep,
        "origin": params.get("origin"),
        "destination": params.get("destination"),
        "passengers": params.get("passengers", 1),
        "exact_date_flights": [
            {"id": "mock-1", "total_amount": "850.00", "total_currency": "USD", "airline": "Aerolíneas Argentinas", "departure_date": dep,
             "slices": [{"duration": "PT10H30M", "stops": 0, "departure": f"{dep}T08:00:00", "arrival": f"{dep}T18:30:00", "flight_number": "AR 1234"}]},
            {"id": "mock-2", "total_amount": "620.00", "total_currency": "USD", "airline": "LATAM Airlines", "departure_date": dep,
             "slices": [{"duration": "PT14H15M", "stops": 1, "departure": f"{dep}T06:00:00", "arrival": f"{dep}T20:15:00", "flight_number": "LA 500"}]},
        ],
        "exact_date_price_usd": 620.0,
        "exact_date_source": "mock",
        "cheapest_date": cheaper,
        "cheapest_price_usd": 490.0,
        "flexible_flights": [
            {"id": "mock-flex-1", "total_amount": "490.00", "total_currency": "USD", "airline": "LATAM Airlines", "departure_date": cheaper,
             "slices": [{"duration": "PT14H15M", "stops": 1, "departure": f"{cheaper}T06:00:00", "arrival": f"{cheaper}T20:15:00", "flight_number": "LA 500"}]},
        ],
        "flexible_source": "mock",
        "savings_usd": 130.0,
        "all_dates_prices": [{"date": cheaper, "price": 490.0}, {"date": dep, "price": 620.0}],
        "price_insights": {"lowest_price": 490, "price_level": "low", "typical_range": [490, 850]},
        "note": "Datos de ejemplo — configurá tu SerpAPI key para resultados reales de Google Flights",
    }
