import os
import requests

TOKEN = os.environ["DUFFEL_TOKEN"]  # lo seteás en la terminal, no hardcodeado

BASE = "https://api.duffel.com/air"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Duffel-Version": "v2",
    "Content-Type": "application/json",
}

# PASO 1: crear la offer request (la búsqueda)
payload = {
    "data": {
        "slices": [
            {"origin": "EZE", "destination": "MIA", "departure_date": "2026-08-15"}
        ],
        "passengers": [{"type": "adult"}],
        "cabin_class": "economy",
    }
}

r = requests.post(f"{BASE}/offer_requests", json=payload, headers=HEADERS)
r.raise_for_status()
request_id = r.json()["data"]["id"]
print("Offer request creada:", request_id)

# PASO 2: traer las offers (los resultados)
r2 = requests.get(f"{BASE}/offers", params={"offer_request_id": request_id}, headers=HEADERS)
r2.raise_for_status()
offers = r2.json()["data"]

print(f"\n{len(offers)} vuelos encontrados:\n")
for o in offers[:5]:
    print(f"  {o['owner']['name']:25} {o['total_amount']} {o['total_currency']}")