"""Service for fetching monitoring station data from the OpenAQ v3 API.

All readings produced by this service carry ``measurement_type="station"``
and ``source="openaq"``.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(20.0, connect=10.0)


def _headers() -> dict[str, str]:
    """Build request headers, optionally including the API key."""
    h: dict[str, str] = {
        "Accept": "application/json",
        "User-Agent": "AERIS/1.0",
    }
    if settings.OPENAQ_API_KEY:
        h["X-API-Key"] = settings.OPENAQ_API_KEY
    return h


async def fetch_nearby_stations(
    lat: float,
    lon: float,
    radius_km: int = 50,
) -> list[dict]:
    """Find monitoring stations near the given coordinates.

    Uses the OpenAQ v3 ``/locations`` endpoint with coordinate + radius
    filtering.  Returns a simplified list of station dicts.
    """
    url = f"{settings.OPENAQ_BASE_URL}/locations"
    params = {
        "coordinates": f"{lat},{lon}",
        "radius": radius_km * 1000,  # API expects metres
        "limit": 20,
        "order_by": "distance",
    }

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(url, params=params, headers=_headers())
            if resp.status_code == 401:
                logger.info("OpenAQ API key required or unauthorized. To include physical ground stations, configure OPENAQ_API_KEY in .env.")
                return []
            if resp.status_code == 429:
                logger.warning("OpenAQ rate limit reached; backing off.")
                return []
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as exc:
        logger.error("OpenAQ /locations HTTP error: %s", exc.response.status_code)
        return []
    except httpx.RequestError as exc:
        logger.error("OpenAQ /locations request error: %s", exc)
        return []

    results: list[dict] = []
    for loc in data.get("results", []):
        coords = loc.get("coordinates", {})
        station = {
            "external_station_id": str(loc.get("id", "")),
            "station_name": loc.get("name", "Unknown"),
            "latitude": coords.get("latitude"),
            "longitude": coords.get("longitude"),
            "country_code": loc.get("country", {}).get("code"),
            "source": "openaq",
            "is_active": not loc.get("isMobile", False),
            "last_seen_at": _parse_ts(loc.get("datetimeLast", {}).get("utc")),
            "sensors": _parse_sensors(loc.get("sensors", [])),
        }
        results.append(station)
    return results


def _parse_sensors(sensors: list) -> list[dict]:
    """Extract sensor info from the OpenAQ v3 sensor list."""
    parsed: list[dict] = []
    for s in sensors:
        param = s.get("parameter", {})
        parsed.append({
            "sensor_id": s.get("id"),
            "parameter_name": param.get("name", ""),
            "parameter_display_name": param.get("displayName", ""),
            "unit": param.get("units", ""),
            "last_value": s.get("latest", {}).get("value"),
            "last_datetime": _parse_ts(s.get("latest", {}).get("datetime", {}).get("utc") if isinstance(s.get("latest", {}).get("datetime"), dict) else s.get("latest", {}).get("datetime")),
        })
    return parsed


async def fetch_station_measurements(station_id: int) -> dict:
    """Get the latest measurements from a specific OpenAQ station.

    Fetches the station's sensors and their most recent readings.
    Returns a normalised dict compatible with the AQI calculator.
    """
    url = f"{settings.OPENAQ_BASE_URL}/locations/{station_id}"

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(url, headers=_headers())
            if resp.status_code == 429:
                logger.warning("OpenAQ rate limit reached.")
                return {}
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as exc:
        logger.error("OpenAQ station %s HTTP error: %s", station_id, exc.response.status_code)
        return {}
    except httpx.RequestError as exc:
        logger.error("OpenAQ station %s request error: %s", station_id, exc)
        return {}

    location_data = data.get("results", [{}])
    if isinstance(location_data, list):
        location_data = location_data[0] if location_data else {}

    sensors = location_data.get("sensors", [])
    pollutants: dict[str, float] = {}
    latest_ts: datetime | None = None

    _PARAM_MAP = {
        "pm25": "pm25",
        "pm2.5": "pm25",
        "pm10": "pm10",
        "o3": "o3",
        "ozone": "o3",
        "co": "co",
        "no2": "no2",
        "so2": "so2",
    }

    for sensor in sensors:
        param = sensor.get("parameter", {})
        param_name = param.get("name", "").lower()
        canonical = _PARAM_MAP.get(param_name)
        if canonical is None:
            continue

        latest = sensor.get("latest", {})
        value = latest.get("value")
        if value is None:
            continue

        pollutants[canonical] = float(value)

        ts_raw = latest.get("datetime")
        if isinstance(ts_raw, dict):
            ts_raw = ts_raw.get("utc")
        ts = _parse_ts(ts_raw)
        if ts and (latest_ts is None or ts > latest_ts):
            latest_ts = ts

    return {
        "station_id": station_id,
        "source": "openaq",
        "measurement_type": "station",
        "pollutants": pollutants,
        "measured_at": latest_ts,
    }


def _parse_ts(raw: str | None) -> datetime | None:
    """Attempt to parse an ISO-8601 timestamp string."""
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, AttributeError):
        return None
