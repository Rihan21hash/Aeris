"""Nominatim geocoding service with simple in-memory caching.

All requests include a ``User-Agent: AERIS/1.0`` header as required by
the Nominatim usage policy.
"""

from __future__ import annotations

import logging
import time
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
_HEADERS = {
    "User-Agent": "AERIS/1.0",
    "Accept-Language": "en",
}

# ── Simple TTL Cache ─────────────────────────────────────────────────
_CACHE_TTL_SECONDS = 3600  # 1 hour
_cache: dict[str, tuple[float, Any]] = {}


def _cache_get(key: str) -> Any | None:
    entry = _cache.get(key)
    if entry is None:
        return None
    ts, value = entry
    if time.monotonic() - ts > _CACHE_TTL_SECONDS:
        del _cache[key]
        return None
    return value


def _cache_set(key: str, value: Any) -> None:
    _cache[key] = (time.monotonic(), value)


# ── Public API ────────────────────────────────────────────────────────


async def search_location(query: str, limit: int = 5) -> list[dict]:
    """Search for locations by free-text query via Nominatim.

    Returns a list of simplified result dicts.
    """
    cache_key = f"search:{query}:{limit}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    url = f"{settings.NOMINATIM_BASE_URL}/search"
    params = {
        "q": query,
        "format": "jsonv2",
        "limit": limit,
        "addressdetails": 1,
    }

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(url, params=params, headers=_HEADERS)
            resp.raise_for_status()
            raw_results = resp.json()
    except httpx.HTTPStatusError as exc:
        logger.error("Nominatim search HTTP error: %s", exc.response.status_code)
        return []
    except httpx.RequestError as exc:
        logger.error("Nominatim search request error: %s", exc)
        return []

    results: list[dict] = []
    for item in raw_results:
        addr = item.get("address", {})
        results.append({
            "name": item.get("name") or item.get("display_name", "").split(",")[0],
            "display_name": item.get("display_name", ""),
            "city": addr.get("city") or addr.get("town") or addr.get("village"),
            "state": addr.get("state"),
            "country": addr.get("country"),
            "country_code": (addr.get("country_code") or "").upper(),
            "latitude": float(item.get("lat", 0)),
            "longitude": float(item.get("lon", 0)),
        })

    _cache_set(cache_key, results)
    return results


async def reverse_geocode(lat: float, lon: float) -> dict:
    """Get location info from coordinates via Nominatim reverse geocoding.

    Returns a single dict with name, city, state, country, etc.
    """
    cache_key = f"reverse:{round(lat, 4)}:{round(lon, 4)}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    url = f"{settings.NOMINATIM_BASE_URL}/reverse"
    params = {
        "lat": lat,
        "lon": lon,
        "format": "jsonv2",
        "addressdetails": 1,
    }

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(url, params=params, headers=_HEADERS)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as exc:
        logger.error("Nominatim reverse HTTP error: %s", exc.response.status_code)
        return _fallback_result(lat, lon)
    except httpx.RequestError as exc:
        logger.error("Nominatim reverse request error: %s", exc)
        return _fallback_result(lat, lon)

    addr = data.get("address", {})
    result = {
        "name": data.get("name") or data.get("display_name", "").split(",")[0],
        "display_name": data.get("display_name", ""),
        "city": addr.get("city") or addr.get("town") or addr.get("village"),
        "state": addr.get("state"),
        "country": addr.get("country"),
        "country_code": (addr.get("country_code") or "").upper(),
        "latitude": lat,
        "longitude": lon,
    }

    _cache_set(cache_key, result)
    return result


def _fallback_result(lat: float, lon: float) -> dict:
    """Return a minimal result when geocoding fails."""
    return {
        "name": f"{lat:.4f}, {lon:.4f}",
        "display_name": f"{lat:.4f}, {lon:.4f}",
        "city": None,
        "state": None,
        "country": None,
        "country_code": None,
        "latitude": lat,
        "longitude": lon,
    }
