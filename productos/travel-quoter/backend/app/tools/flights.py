"""Búsqueda de vuelos vía SerpAPI (Google Flights) con price hunter ±3 días."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from typing import Optional

import httpx

SERPAPI_BASE = "https://serpapi.com/search"

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

_CABIN_MAP = {"economy": 1, "premium_economy": 2, "business": 3, "first": 4}


async def search_flights(serpapi_key: str, **params) -> dict:
    if not serpapi_key:
        return _mock_results(params)

    mode = params.get("search_mode", "price_hunter")

    if mode == "exact":
        result = await _serp_flights(serpapi_key, params)
        if result.get("error") == "past_date":
            return {
                "error": "fecha_pasada",
                "message": (
                    f"La fecha {params['departure_date']} ya pasó. "
                    "Por favor indicá una fecha de salida futura."
                ),
            }
        result["mode"] = "exact"
        return result

    # Price hunter: 7 llamadas paralelas (fecha -3 a +3)
    base = datetime.strptime(params["departure_date"], "%Y-%m-%d")
    dates = [(base + timedelta(days=d)).strftime("%Y-%m-%d") for d in range(-3, 4)]
    tasks = [_serp_flights(serpapi_key, {**params, "departure_date": d}) for d in dates]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return _build_price_hunter(results, params, dates)


async def _serp_flights(serpapi_key: str, params: dict) -> dict:
    dep = params["departure_date"]
    ret = params.get("return_date")
    query: dict = {
        "engine": "google_flights",
        "departure_id": params["origin"],
        "arrival_id": params["destination"],
        "outbound_date": dep,
        "adults": params.get("passengers", 1),
        "currency": "USD",
        "hl": "es",
        "type": 1 if ret else 2,  # 1=roundtrip, 2=oneway
        "travel_class": _CABIN_MAP.get(params.get("cabin_class", "economy"), 1),
        "api_key": serpapi_key,
    }
    if ret:
        query["return_date"] = ret

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(SERPAPI_BASE, params=query)
            resp.raise_for_status()
            return _normalize(resp.json(), params)
    except httpx.HTTPStatusError as e:
        body = ""
        try:
            body = e.response.text.lower()
        except Exception:
            pass
        if e.response.status_code == 400 and ("past" in body or "outbound_date" in body):
            return {"flights": [], "source": "google_flights", "error": "past_date", "search_date": dep}
        return {"flights": [], "source": "google_flights", "error": f"SerpAPI {e.response.status_code}", "search_date": dep}
    except Exception as e:
        return {"flights": [], "source": "google_flights", "error": str(e)[:120], "search_date": dep}


def _google_flights_url(origin: str, destination: str, departure_date: str, return_date: str | None = None) -> str:
    dep = departure_date.replace("-", "")
    if return_date:
        ret = return_date.replace("-", "")
        path = f"{origin}.{destination}.{dep}*{destination}.{origin}.{ret}"
    else:
        path = f"{origin}.{destination}.{dep}"
    return f"https://www.google.com/flights#flt={path};c:USD;e:1"


def _normalize(data: dict, params: dict) -> dict:
    offers = (data.get("best_flights") or []) + (data.get("other_flights") or [])
    flights = []
    for offer in offers[:5]:
        legs = offer.get("flights") or []
        if not legs:
            continue
        first, last = legs[0], legs[-1]
        dur = offer.get("total_duration", 0)
        flights.append({
            "id": (offer.get("booking_token") or "")[:20],
            "total_amount": str(offer.get("price", 0)),
            "total_currency": "USD",
            "airline": first.get("airline", "?"),
            "departure_date": params.get("departure_date"),
            "slices": [{
                "duration": f"PT{dur // 60}H{dur % 60}M",
                "stops": max(0, len(legs) - 1),
                "departure": first.get("departure_airport", {}).get("time"),
                "arrival": last.get("arrival_airport", {}).get("time"),
                "flight_number": first.get("flight_number"),
            }],
        })

    pi = data.get("price_insights") or {}
    return {
        "flights": flights,
        "source": "google_flights",
        "search_date": params.get("departure_date"),
        "google_flights_url": _google_flights_url(
            params.get("origin", ""),
            params.get("destination", ""),
            params.get("departure_date", ""),
            params.get("return_date"),
        ),
        "price_insights": {
            "lowest_price": pi.get("lowest_price"),
            "price_level": pi.get("price_level"),
            "typical_range": pi.get("typical_price_range"),
        } if pi else None,
    }


def _build_price_hunter(results, params: dict, dates: list) -> dict:
    exact_date = params["departure_date"]
    options: list[dict] = []
    has_past_date_error = False

    for i, r in enumerate(results):
        if isinstance(r, Exception) or not isinstance(r, dict):
            continue
        if r.get("error") == "past_date":
            has_past_date_error = True
            continue
        if r.get("error"):
            continue
        flights = r.get("flights") or []
        if not flights:
            continue
        min_price = min(_parse(f.get("total_amount", "9999")) for f in flights)
        options.append({"date": dates[i], "price": min_price, "flights": flights, "insights": r.get("price_insights")})

    if not options:
        if has_past_date_error:
            return {
                "error": "fecha_pasada",
                "message": (
                    f"La fecha {exact_date} ya pasó. "
                    "Por favor indicá una fecha de salida futura."
                ),
            }
        return _mock_results(params)

    options.sort(key=lambda x: x["price"])
    best = options[0]
    exact = next((o for o in options if o["date"] == exact_date), None)
    exact_price = exact["price"] if exact else None
    savings = round(exact_price - best["price"], 2) if exact_price and best["date"] != exact_date and exact_price > best["price"] else None

    return {
        "mode": "price_hunter",
        "requested_date": exact_date,
        "origin": params["origin"],
        "destination": params["destination"],
        "passengers": params.get("passengers", 1),
        "exact_date_flights": (exact or {}).get("flights", [])[:3],
        "exact_date_price_usd": exact_price,
        "exact_date_source": "google_flights",
        "cheapest_date": best["date"],
        "cheapest_price_usd": best["price"],
        "flexible_flights": best["flights"][:3],
        "flexible_source": "google_flights",
        "savings_usd": savings,
        "all_dates_prices": [{"date": o["date"], "price": o["price"]} for o in sorted(options, key=lambda x: x["date"])],
        "price_insights": (exact or best).get("insights"),
        "google_flights_url": _google_flights_url(
            params.get("origin", ""),
            params.get("destination", ""),
            best["date"],
            params.get("return_date"),
        ),
    }


def _parse(value) -> float:
    try:
        return float(str(value).replace(",", ""))
    except (ValueError, TypeError):
        return 9999.0


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
