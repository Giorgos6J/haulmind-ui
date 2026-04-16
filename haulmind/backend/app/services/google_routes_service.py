import os
import httpx
from fastapi import HTTPException

GOOGLE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"


async def compute_google_route(origin_address: str, destination_address: str) -> dict:
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GOOGLE_MAPS_API_KEY is not configured")

    payload = {
        "origin": {
            "address": {
                "addressLines": [origin_address]
            }
        },
        "destination": {
            "address": {
                "addressLines": [destination_address]
            }
        },
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE",
        "computeAlternativeRoutes": False,
        "languageCode": "en-US",
        "units": "METRIC",
    }

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(GOOGLE_ROUTES_URL, json=payload, headers=headers)

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Google Routes API error: {response.text}"
        )

    data = response.json()
    routes = data.get("routes", [])

    if not routes:
        raise HTTPException(status_code=404, detail="No route found for the provided addresses")

    route = routes[0]

    distance_meters = route.get("distanceMeters")
    duration_str = route.get("duration", "0s")

    if distance_meters is None:
        raise HTTPException(status_code=502, detail="Google response missing distance")

    duration_seconds = 0
    if duration_str.endswith("s"):
        try:
            duration_seconds = float(duration_str[:-1])
        except ValueError:
            duration_seconds = 0

    return {
        "origin_address": origin_address,
        "destination_address": destination_address,
        "distance_km": round(distance_meters / 1000, 2),
        "eta_minutes": round(duration_seconds / 60, 2),
    }