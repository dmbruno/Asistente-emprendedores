"""Búsqueda web general vía SerpAPI — para consultar Despegar, OLA Mayorista, etc."""

from __future__ import annotations

import httpx

SERPAPI_BASE = "https://serpapi.com/search"

TOOL_DEFINITION = {
    "name": "search_web",
    "description": (
        "Realiza una búsqueda web para obtener precios de proveedores específicos como Despegar, "
        "Almundo, OLA Mayorista, Avantrip, u otras agencias o mayoristas de viajes. "
        "Útil para comparar con fuentes específicas o encontrar paquetes combinados. "
        "Siempre incluir el destino, fechas y cantidad de pasajeros en la query."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": (
                    "Consulta de búsqueda específica. Ejemplos: "
                    "'vuelos EZE MIA 15 agosto 2 personas despegar precio', "
                    "'paquete Miami agosto 2025 OLA mayorista', "
                    "'hotel Miami agosto 2025 almundo precio'"
                ),
            },
            "num_results": {
                "type": "integer",
                "description": "Cantidad de resultados a devolver (máximo 8)",
                "default": 5,
            },
        },
        "required": ["query"],
    },
}


async def search_web(serpapi_key: str, **params) -> dict:
    if not serpapi_key:
        return {"results": [], "query": params.get("query", ""), "note": "SerpAPI key no configurada"}

    query = params.get("query", "")
    num = min(params.get("num_results", 5), 8)

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                SERPAPI_BASE,
                params={
                    "engine": "google",
                    "q": query,
                    "num": num,
                    "hl": "es",
                    "gl": "ar",
                    "api_key": serpapi_key,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        results = []
        for r in (data.get("organic_results") or [])[:num]:
            results.append({
                "title": r.get("title"),
                "link": r.get("link"),
                "snippet": r.get("snippet"),
                "source": r.get("source"),
            })

        return {"results": results, "query": query}
    except httpx.HTTPStatusError as e:
        return {"results": [], "query": query, "error": f"SerpAPI {e.response.status_code}"}
    except Exception as e:
        return {"results": [], "query": query, "error": str(e)[:120]}
