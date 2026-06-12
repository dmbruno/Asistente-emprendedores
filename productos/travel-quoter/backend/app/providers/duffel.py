"""Provider Duffel — vuelos reales y bookables.

Implementa FlightProvider del base.py.
Devuelve el mismo dict legacy que espera la tool search_flights.

La diferencia clave con SerpAPI:
- Los resultados son bookables (el agente podrá reservar en una sesión futura).
- El precio es neto/real, sin markup de Google.
- La moneda depende de la configuración de la cuenta Duffel (puede ser EUR o USD).

NOTA: no existe HotelProvider para Duffel — hoteles quedan 100% en SerpAPI.
"""

from __future__ import annotations

import asyncio
import time
from datetime import datetime, timedelta

import httpx

# ---------------------------------------------------------------------------
# Conversión de moneda (cache en memoria, TTL 1 hora)
# ---------------------------------------------------------------------------

_fx_cache: dict = {}  # {(base, target): (rate, timestamp)}
_FX_TTL = 3600  # segundos


async def _get_rate(base: str, target: str) -> float:
    """Devuelve el tipo de cambio base→target. Cache 1h. Si falla, devuelve 1.0."""
    if base == target:
        return 1.0
    key = (base, target)
    cached = _fx_cache.get(key)
    if cached and time.time() - cached[1] < _FX_TTL:
        return cached[0]
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(f"https://open.er-api.com/v6/latest/{base}")
            rate = r.json()["rates"][target]
        _fx_cache[key] = (rate, time.time())
        return rate
    except Exception:
        return 1.0


def _convert(amount_str: str, rate: float) -> str:
    try:
        return f"{float(amount_str) * rate:.2f}"
    except (ValueError, TypeError):
        return amount_str

_BASE = "https://api.duffel.com/air"
_CABIN_MAP = {
    "economy": "economy",
    "premium_economy": "premium_economy",
    "business": "business",
    "first": "first",
}


def _headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Duffel-Version": "v2",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


class DuffelFlightProvider:
    name = "duffel"
    cost_tier = 0

    async def search_flights(self, token: str, **params) -> dict:
        mode = params.get("search_mode", "price_hunter")

        if mode == "exact":
            result = await _duffel_single(token, params)
            if result.get("error") == "past_date":
                return {
                    "error": "fecha_pasada",
                    "message": (
                        f"La fecha {params['departure_date']} ya pasó. "
                        "Por favor indicá una fecha de salida futura."
                    ),
                }
            if result.get("error"):
                return {}
            result["mode"] = "exact"
            return result

        # price_hunter: ±3 días (7 fechas — menos que SerpAPI para no agotar cuota Duffel)
        base = datetime.strptime(params["departure_date"], "%Y-%m-%d")
        dates = [(base + timedelta(days=d)).strftime("%Y-%m-%d") for d in range(-3, 4)]
        tasks = [_duffel_single(token, {**params, "departure_date": d}) for d in dates]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return _build_price_hunter(results, params, dates)


# ---------------------------------------------------------------------------
# Lógica interna
# ---------------------------------------------------------------------------

async def _duffel_single(token: str, params: dict) -> dict:
    """Busca vuelos para una sola fecha vía Duffel. Devuelve dict legacy."""
    dep = params["departure_date"]
    passengers_count = max(1, int(params.get("passengers", 1)))
    cabin = _CABIN_MAP.get(params.get("cabin_class", "economy"), "economy")

    slices = [
        {
            "origin": params["origin"],
            "destination": params["destination"],
            "departure_date": dep,
        }
    ]
    if params.get("return_date"):
        slices.append({
            "origin": params["destination"],
            "destination": params["origin"],
            "departure_date": params["return_date"],
        })

    payload = {
        "data": {
            "slices": slices,
            "passengers": [{"type": "adult"} for _ in range(passengers_count)],
            "cabin_class": cabin,
        }
    }

    try:
        async with httpx.AsyncClient(timeout=45) as client:
            r = await client.post(
                f"{_BASE}/offer_requests",
                json=payload,
                headers=_headers(token),
                params={"return_offers": "true"},
            )
            r.raise_for_status()
            offers = r.json().get("data", {}).get("offers", [])[:15]
            # Convertir a USD si la cuenta Duffel usa otra moneda
            native_currency = offers[0].get("total_currency", "USD") if offers else "USD"
            fx_rate = await _get_rate(native_currency, "USD") if native_currency != "USD" else 1.0
            return _normalize(offers, params, fx_rate=fx_rate, native_currency=native_currency)
    except httpx.HTTPStatusError as e:
        body = ""
        try:
            body = e.response.text.lower()
        except Exception:
            pass
        if e.response.status_code in (400, 422) and ("past" in body or "future" in body or "departure_date" in body):
            return {"flights": [], "source": "duffel", "error": "past_date", "search_date": dep}
        return {"flights": [], "source": "duffel", "error": f"Duffel {e.response.status_code}", "search_date": dep}
    except Exception as e:
        return {"flights": [], "source": "duffel", "error": str(e)[:120], "search_date": dep}


def _normalize(offers: list, params: dict, fx_rate: float = 1.0, native_currency: str = "USD") -> dict:
    dep_date = params.get("departure_date", "")
    flights = []
    converting = native_currency != "USD" and fx_rate != 1.0

    for offer in offers:
        slices = offer.get("slices") or []
        if not slices:
            continue
        first_slice = slices[0]
        segs = first_slice.get("segments") or []
        if not segs:
            continue

        first_seg = segs[0]
        last_seg = segs[-1]
        carrier = first_seg.get("marketing_carrier") or {}
        iata = carrier.get("iata_code", "")
        flight_num = first_seg.get("marketing_carrier_flight_number", "")
        native_amount = str(offer.get("total_amount", 0))
        usd_amount = _convert(native_amount, fx_rate) if converting else native_amount

        flights.append({
            "id": offer.get("id", "")[:20],
            "total_amount": usd_amount,
            "total_currency": "USD",
            # Precio original de Duffel para referencia (puede ser EUR, GBP, etc.)
            "native_amount": native_amount if converting else None,
            "native_currency": native_currency if converting else None,
            "airline": offer.get("owner", {}).get("name", carrier.get("name", "?")),
            "departure_date": dep_date,
            "google_flights_url": _google_flights_url(
                params.get("origin", ""),
                params.get("destination", ""),
                dep_date,
                params.get("return_date"),
            ),
            "bookable": True,
            "booking_token": offer.get("id"),
            "slices": [{
                "duration": first_slice.get("duration", ""),
                "stops": len(segs) - 1,
                "departure": first_seg.get("departing_at"),
                "arrival": last_seg.get("arriving_at"),
                "flight_number": f"{iata} {flight_num}".strip() if iata else flight_num,
            }],
        })

    flights.sort(key=lambda f: _parse(f["total_amount"]))

    return {
        "flights": flights,
        "source": "duffel",
        "search_date": dep_date,
        "google_flights_url": _google_flights_url(
            params.get("origin", ""),
            params.get("destination", ""),
            dep_date,
            params.get("return_date"),
        ),
        "price_insights": None,
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
        options.append({"date": dates[i], "price": min_price, "flights": flights, "insights": None, "currency": flights[0].get("total_currency", "USD")})

    if not options:
        if has_past_date_error:
            return {
                "error": "fecha_pasada",
                "message": (
                    f"La fecha {exact_date} ya pasó. "
                    "Por favor indicá una fecha de salida futura."
                ),
            }
        return {}  # el router cae a SerpAPI

    options.sort(key=lambda x: x["price"])
    best = options[0]
    exact = next((o for o in options if o["date"] == exact_date), None)
    exact_price = exact["price"] if exact else None
    savings = round(exact_price - best["price"], 2) if exact_price and best["date"] != exact_date and exact_price > best["price"] else None
    currency = best["currency"]

    return {
        "mode": "price_hunter",
        "requested_date": exact_date,
        "origin": params["origin"],
        "destination": params["destination"],
        "passengers": params.get("passengers", 1),
        "exact_date_flights": sorted((exact or {}).get("flights", []), key=lambda f: _parse(f.get("total_amount", "9999"))),
        "exact_date_price_usd": exact_price,
        "exact_date_source": "duffel",
        "cheapest_date": best["date"],
        "cheapest_price_usd": best["price"],
        "flexible_flights": sorted(best["flights"], key=lambda f: _parse(f.get("total_amount", "9999"))),
        "flexible_source": "duffel",
        "savings_usd": savings,
        "currency": currency,
        "all_dates_prices": [{"date": o["date"], "price": o["price"]} for o in sorted(options, key=lambda x: x["date"])],
        "price_insights": None,
        "google_flights_url": _google_flights_url(
            params.get("origin", ""),
            params.get("destination", ""),
            best["date"],
            params.get("return_date"),
        ),
    }


def _google_flights_url(origin: str, destination: str, departure_date: str, return_date: str | None = None) -> str:
    dep = departure_date.replace("-", "")
    if return_date:
        ret = return_date.replace("-", "")
        path = f"{origin}.{destination}.{dep}*{destination}.{origin}.{ret}"
    else:
        path = f"{origin}.{destination}.{dep}"
    return f"https://www.google.com/flights#flt={path};c:USD;e:1"


def _parse(value) -> float:
    try:
        return float(str(value).replace(",", ""))
    except (ValueError, TypeError):
        return 9999.0
