"""Provider SerpAPI (Google Flights + Google Hotels).

Implementa FlightProvider y HotelProvider del base.py.

NOTA: en esta etapa los métodos devuelven el mismo dict legacy que devolvían
las tools directamente. La migración a NormalizedFlight/NormalizedHotel
se hará en la sesión de Duffel, cuando necesitemos un formato común entre
providers para hacer la cascada por cost_tier.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta

import httpx

SERPAPI_BASE = "https://serpapi.com/search"

_CABIN_MAP = {"economy": 1, "premium_economy": 2, "business": 3, "first": 4}


# ---------------------------------------------------------------------------
# SerpapiFlightProvider
# ---------------------------------------------------------------------------

class SerpapiFlightProvider:
    name = "serpapi"
    cost_tier = 0  # el más barato de llamar

    async def search_flights(self, serpapi_key: str, **params) -> dict:
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

        # Price hunter: 11 llamadas paralelas (fecha -5 a +5)
        base = datetime.strptime(params["departure_date"], "%Y-%m-%d")
        dates = [(base + timedelta(days=d)).strftime("%Y-%m-%d") for d in range(-5, 6)]
        tasks = [_serp_flights(serpapi_key, {**params, "departure_date": d}) for d in dates]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return _build_price_hunter(results, params, dates)


# ---------------------------------------------------------------------------
# SerpapiHotelProvider
# ---------------------------------------------------------------------------

class SerpapiHotelProvider:
    name = "serpapi"
    cost_tier = 0

    async def search_hotels(self, serpapi_key: str, **params) -> dict:
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
                return _normalize_hotel(resp.json(), params)
        except httpx.HTTPStatusError as e:
            return {"hotels": [], "source": "google_hotels", "error": f"SerpAPI {e.response.status_code}"}
        except Exception as e:
            return {"hotels": [], "source": "google_hotels", "error": str(e)[:120]}


# ---------------------------------------------------------------------------
# Helpers internos — vuelos
# ---------------------------------------------------------------------------

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
        "type": 1 if ret else 2,
        "travel_class": _CABIN_MAP.get(params.get("cabin_class", "economy"), 1),
        "api_key": serpapi_key,
    }
    if ret:
        query["return_date"] = ret

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(SERPAPI_BASE, params=query)
            resp.raise_for_status()
            return _normalize_flight(resp.json(), params)
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


def _normalize_flight(data: dict, params: dict) -> dict:
    offers = (data.get("best_flights") or []) + (data.get("other_flights") or [])
    flights = []
    for offer in offers:
        legs = offer.get("flights") or []
        if not legs:
            continue
        first, last = legs[0], legs[-1]
        dur = offer.get("total_duration", 0)
        dep_date = params.get("departure_date", "")
        flights.append({
            "id": (offer.get("booking_token") or "")[:20],
            "total_amount": str(offer.get("price", 0)),
            "total_currency": "USD",
            "airline": first.get("airline", "?"),
            "departure_date": dep_date,
            "google_flights_url": _google_flights_url(
                params.get("origin", ""),
                params.get("destination", ""),
                dep_date,
                params.get("return_date"),
            ),
            "slices": [{
                "duration": f"PT{dur // 60}H{dur % 60}M",
                "stops": max(0, len(legs) - 1),
                "departure": first.get("departure_airport", {}).get("time"),
                "arrival": last.get("arrival_airport", {}).get("time"),
                "flight_number": first.get("flight_number"),
            }],
        })
    flights.sort(key=lambda f: _parse(f["total_amount"]))

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
        return {}  # el caller (router) se encarga del fallback a mock

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
        "exact_date_flights": sorted((exact or {}).get("flights", []), key=lambda f: _parse(f.get("total_amount", "9999"))),
        "exact_date_price_usd": exact_price,
        "exact_date_source": "google_flights",
        "cheapest_date": best["date"],
        "cheapest_price_usd": best["price"],
        "flexible_flights": sorted(best["flights"], key=lambda f: _parse(f.get("total_amount", "9999"))),
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


# ---------------------------------------------------------------------------
# Helpers internos — hoteles
# ---------------------------------------------------------------------------

def _normalize_hotel(data: dict, params: dict) -> dict:
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


def _parse(value) -> float:
    try:
        return float(str(value).replace(",", ""))
    except (ValueError, TypeError):
        return 9999.0
