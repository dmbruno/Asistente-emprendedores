"""Búsqueda de hoteles — delega en app/providers/router.py."""

from __future__ import annotations

from app.providers import router

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

    result = await router.search_hotels(serpapi_key, **params)

    # Si el provider devuelve lista vacía sin error explícito, caemos al mock.
    if not result.get("hotels") and not result.get("error"):
        return _mock_results(params)

    return result


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
