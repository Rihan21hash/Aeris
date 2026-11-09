"""Service for fetching air quality data from the Open-Meteo Air Quality API.

Open-Meteo is free, requires no API key, and returns model-estimated data
on an hourly grid.  All readings produced by this service carry
``measurement_type="model_estimate"`` and ``source="open_meteo"``.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Open-Meteo returns gas concentrations in µg/m³.
# For US EPA AQI we need: CO in ppm, O3 in ppm, NO2 in ppb, SO2 in ppb.
# Conversion factors at STP (25 °C, 1 atm):
_CO_UGM3_TO_PPM = 1 / 1145.0
_NO2_UGM3_TO_PPB = 1000.0 / 1880.0  # µg/m³ → ppb
_SO2_UGM3_TO_PPB = 1000.0 / 2620.0
_O3_UGM3_TO_PPM = 1 / 1960.0

_HOURLY_PARAMS = (
    "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,"
    "us_aqi,us_aqi_pm2_5,us_aqi_pm10,us_aqi_nitrogen_dioxide,"
    "us_aqi_carbon_monoxide,us_aqi_ozone,us_aqi_sulphur_dioxide"
)
_CURRENT_PARAMS = (
    "us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone"
)

_TIMEOUT = httpx.Timeout(15.0, connect=10.0)


def _normalise_current(data: dict) -> dict:
    """Normalise the ``current`` block returned by Open-Meteo.

    Returns a dict keyed by canonical pollutant name with:
      - raw µg/m³ concentrations
      - pre-computed EPA-unit concentrations (for the AQI calculator)
      - the Open-Meteo US AQI value (informational)
    """
    current = data.get("current", {})
    measured_at_str = current.get("time")
    interval = current.get("interval")  # seconds
    measured_at = None
    if measured_at_str:
        try:
            measured_at = datetime.fromisoformat(measured_at_str).replace(tzinfo=timezone.utc)
        except ValueError:
            measured_at = None

    pm25_raw = current.get("pm2_5")
    pm10_raw = current.get("pm10")
    co_raw = current.get("carbon_monoxide")  # µg/m³
    no2_raw = current.get("nitrogen_dioxide")  # µg/m³
    so2_raw = current.get("sulphur_dioxide")  # µg/m³
    o3_raw = current.get("ozone")  # µg/m³
    us_aqi = current.get("us_aqi")

    result: dict = {
        "measured_at": measured_at,
        "interval_seconds": interval,
        "us_aqi_openmeteo": us_aqi,
        "source": "open_meteo",
        "measurement_type": "model_estimate",
        "current": {
            "pm25": pm25_raw,
            "pm10": pm10_raw,
            "co": co_raw,
            "no2": no2_raw,
            "so2": so2_raw,
            "o3": o3_raw,
            "measured_at": measured_at,
        },
        # Raw concentrations in µg/m³
        "raw": {
            "pm25": pm25_raw,
            "pm10": pm10_raw,
            "co": co_raw,
            "no2": no2_raw,
            "so2": so2_raw,
            "o3": o3_raw,
        },
        # EPA-unit concentrations (for aqi_calculator with standard="us_epa")
        "epa_units": {
            "pm25": pm25_raw,  # µg/m³ – same
            "pm10": pm10_raw,  # µg/m³ – same
            "co": round(co_raw * _CO_UGM3_TO_PPM, 4) if co_raw is not None else None,
            "no2": round(no2_raw * _NO2_UGM3_TO_PPB, 2) if no2_raw is not None else None,
            "so2": round(so2_raw * _SO2_UGM3_TO_PPB, 2) if so2_raw is not None else None,
            "o3": round(o3_raw * _O3_UGM3_TO_PPM, 6) if o3_raw is not None else None,
        },
        # CPCB-unit concentrations (µg/m³ for gases, mg/m³ for CO)
        "cpcb_units": {
            "pm25": pm25_raw,
            "pm10": pm10_raw,
            "co": round(co_raw / 1000.0, 3) if co_raw is not None else None,  # µg/m³ → mg/m³
            "no2": no2_raw,
            "so2": so2_raw,
            "o3": o3_raw,
        },
        # Full raw provider payload blocks for diagnostic transparency
        "raw_provider_current": data.get("current", {}),
        "raw_provider_units": data.get("current_units", {}),
    }
    return result


async def fetch_current_air_quality(lat: float, lon: float) -> dict:
    """Fetch the current air quality reading for the given coordinates.

    Returns a normalised dict with raw concentrations and converted values
    ready for both EPA and CPCB AQI calculation.
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": _CURRENT_PARAMS,
        "hourly": _HOURLY_PARAMS,
        "timezone": "UTC",
    }

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(settings.OPEN_METEO_BASE_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as exc:
        logger.error("Open-Meteo API HTTP error: %s – %s", exc.response.status_code, exc.response.text)
        raise
    except httpx.RequestError as exc:
        logger.error("Open-Meteo API request error: %s", exc)
        raise

    return _normalise_current(data)


def _parse_hourly(data: dict) -> list[dict]:
    """Parse the ``hourly`` block into a list of per-timestamp dicts."""
    hourly = data.get("hourly", {})
    times = hourly.get("time", [])
    records: list[dict] = []

    for idx, ts_str in enumerate(times):
        try:
            ts = datetime.fromisoformat(ts_str).replace(tzinfo=timezone.utc)
        except ValueError:
            continue

        pm25 = hourly.get("pm2_5", [None] * len(times))[idx] if idx < len(hourly.get("pm2_5", [])) else None
        pm10 = hourly.get("pm10", [None] * len(times))[idx] if idx < len(hourly.get("pm10", [])) else None
        co = hourly.get("carbon_monoxide", [None] * len(times))[idx] if idx < len(hourly.get("carbon_monoxide", [])) else None
        no2 = hourly.get("nitrogen_dioxide", [None] * len(times))[idx] if idx < len(hourly.get("nitrogen_dioxide", [])) else None
        so2 = hourly.get("sulphur_dioxide", [None] * len(times))[idx] if idx < len(hourly.get("sulphur_dioxide", [])) else None
        o3 = hourly.get("ozone", [None] * len(times))[idx] if idx < len(hourly.get("ozone", [])) else None
        us_aqi = hourly.get("us_aqi", [None] * len(times))[idx] if idx < len(hourly.get("us_aqi", [])) else None

        records.append({
            "measured_at": ts,
            "source": "open_meteo",
            "measurement_type": "model_estimate",
            "us_aqi_openmeteo": us_aqi,
            "raw": {
                "pm25": pm25,
                "pm10": pm10,
                "co": co,
                "no2": no2,
                "so2": so2,
                "o3": o3,
            },
            "epa_units": {
                "pm25": pm25,
                "pm10": pm10,
                "co": round(co * _CO_UGM3_TO_PPM, 4) if co is not None else None,
                "no2": round(no2 * _NO2_UGM3_TO_PPB, 2) if no2 is not None else None,
                "so2": round(so2 * _SO2_UGM3_TO_PPB, 2) if so2 is not None else None,
                "o3": round(o3 * _O3_UGM3_TO_PPM, 6) if o3 is not None else None,
            },
            "cpcb_units": {
                "pm25": pm25,
                "pm10": pm10,
                "co": round(co / 1000.0, 3) if co is not None else None,
                "no2": no2,
                "so2": so2,
                "o3": o3,
            },
        })

    return records


async def fetch_historical_air_quality(
    lat: float,
    lon: float,
    start_date: str,
    end_date: str,
) -> list[dict]:
    """Fetch historical hourly air quality data for a date range.

    Parameters
    ----------
    start_date, end_date:
        ISO-8601 date strings (YYYY-MM-DD).
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": _HOURLY_PARAMS,
        "start_date": start_date,
        "end_date": end_date,
        "timezone": "UTC",
    }

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(settings.OPEN_METEO_BASE_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as exc:
        logger.error("Open-Meteo historical API error: %s – %s", exc.response.status_code, exc.response.text)
        raise
    except httpx.RequestError as exc:
        logger.error("Open-Meteo historical API request error: %s", exc)
        raise

    return _parse_hourly(data)
