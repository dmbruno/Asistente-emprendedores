"""Búsqueda de hoteles vía SerpAPI (Google Hotels)."""

from __future__ import annotations

import httpx

SERPAPI_BASE = "https://serpapi.com/search"

TOOL_DEFINITION = {
    "name": "search_hotels",
    "description": (
        "Busca hoteles disponibles en el destino usando Google Hotels. "
        "Devuelve opciones con precio por noche, estrellas, rating, amenities y ofertas especiales."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "destination_city": {
                "type": "string",
                "description": "Ciudad de destino (ej: Miami, Nueva York, París, Cancún)",
            },
            "check_in": {
                "type": "string",
                "description": "Fecha de check-in en formato YYYY-MM-DD",
            },
            "check_out": {
                "type": "string",
                "description": "Fecha de check-out en formato YYYY-MM-DD",
            },
            "guests": {
                "type": "integer",
                "description": "Cantidad de huéspedes",
                "default": 1,
            },
            "max_price_per_night_usd": {
                "type": "number",
                "description": "Precio máximo por noche en USD (opcional)",
            },
            "stars": {
                "type": "integer",
                "description": "Mínimo de estrellas requerido (1-5)",
                "minimum": 1,
                "maximum": 5,
            },
        },
        "required": ["destination_city", "check_in", "check_out"],
    },
}


async def search_hotels(serpapi_key: str, allow_real_data: bool = True, **params) -> dict:
    if not allow_real_data:
        result = _mock_results(params)
        result["note"] = "Plan free: alcanzaste el límite de 3 cotizaciones reales este mes. Estos son datos de ejemplo. Suscribite al plan Pro para cotizaciones reales ilimitadas."
        return result
    if not serpapi_key:
        return _mock_results(params)

    city = params.get("destination_city", "")
    query: dict = {
        "engine": "google_hotels",
        "q": f"hotels in {city}",
        "check_in_date": params.get("check_in"),
        "check_out_date": params.get("check_out"),
        "adults": params.get("guests", 1),
        "currency": "USD",
        "hl": "es",
        "api_key": serpapi_key,
    }
    if params.get("stars"):
        query["hotel_class"] = params["stars"]
    if params.get("max_price_per_night_usd"):
        query["max_price"] = int(params["max_price_per_night_usd"])

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(SERPAPI_BASE, params=query)
            resp.raise_for_status()
            return _normalize(resp.json(), params)
    except httpx.HTTPStatusError as e:
        return {"hotels": [], "source": "google_hotels", "error": f"SerpAPI {e.response.status_code}"}
    except Exception as e:
        return {"hotels": [], "source": "google_hotels", "error": str(e)[:120]}


def _normalize(data: dict, params: dict) -> dict:
    properties = (data.get("properties") or [])[:8]
    hotels = []
    for p in properties:
        rate = p.get("rate_per_night") or {}
        price = rate.get("extracted_lowest") or 0
        hotels.append({
            "id": (p.get("property_token") or "")[:20],
            "name": p.get("name", ""),
            "stars": p.get("extracted_hotel_class") or 0,
            "price_per_night_usd": price,
            "rating": p.get("overall_rating"),
            "reviews": p.get("reviews"),
            "location": p.get("neighborhood") or p.get("type", ""),
            "amenities": (p.get("amenities") or [])[:6],
            "deal": p.get("deal_description"),
            "link": p.get("link", ""),
        })
    return {
        "hotels": hotels,
        "source": "google_hotels",
        "destination": params.get("destination_city"),
        "check_in": params.get("check_in"),
        "check_out": params.get("check_out"),
    }


def _mock_results(params: dict) -> dict:
    city = params.get("destination_city", "destino")
    return {
        "hotels": [
            {"id": "mock-h1", "name": f"Hotel Grand {city}", "stars": 4, "price_per_night_usd": 120,
             "rating": 4.3, "reviews": 1847, "location": f"Centro, {city}",
             "amenities": ["WiFi", "Desayuno incluido", "Piscina"], "deal": None, "link": ""},
            {"id": "mock-h2", "name": f"Hostel Backpacker {city}", "stars": 2, "price_per_night_usd": 35,
             "rating": 4.0, "reviews": 523, "location": f"Barrio turístico, {city}",
             "amenities": ["WiFi", "Cocina compartida"], "deal": None, "link": ""},
            {"id": "mock-h3", "name": f"Boutique Suite {city}", "stars": 5, "price_per_night_usd": 280,
             "rating": 4.8, "reviews": 312, "location": f"Zona exclusiva, {city}",
             "amenities": ["WiFi", "Spa", "Restaurante", "Gym"], "deal": "OFERTA ESPECIAL", "link": ""},
        ],
        "source": "mock",
        "destination": city,
        "check_in": params.get("check_in"),
        "check_out": params.get("check_out"),
        "note": "Datos de ejemplo — configurá tu SerpAPI key para resultados reales de Google Hotels",
    }
