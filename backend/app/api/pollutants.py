"""Endpoints for direct pollutant concentration data."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_or_create_location
from app.core.database import get_db
from app.schemas.aqi import PollutantData, PollutantsResponse
from app.services.aqi_calculator import calculate_aqi
from app.services.open_meteo import fetch_current_air_quality

router = APIRouter(prefix="/api/pollutants", tags=["Pollutants"])


@router.get("/current", response_model=PollutantsResponse)
async def get_current_pollutants(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude"),
    standard: str = Query("us_epa", pattern="^(us_epa|cpcb_naqi)$"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve raw pollutant concentrations and sub-indices for coordinates."""
    location = await get_or_create_location(lat, lon, db)
    raw_data = await fetch_current_air_quality(lat, lon)
    current = raw_data.get("current", {})

    if not current:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Pollutant data currently unavailable.",
        )

    # Extract concentrations for calculation using standard-specific units
    calc_units = (
        raw_data.get("cpcb_units", {})
        if standard == "cpcb_naqi"
        else raw_data.get("epa_units", {})
    )
    pollutants_for_calc: dict[str, float] = {}
    for pol in ("pm25", "pm10", "co", "no2", "so2", "o3"):
        val = calc_units.get(pol)
        if val is not None:
            try:
                pollutants_for_calc[pol] = float(val)
            except (ValueError, TypeError):
                pass

    aqi_res = calculate_aqi(pollutants_for_calc, standard=standard)

    # Raw concentrations in µg/m³ for display
    raw_units = raw_data.get("raw", {})
    pollutants_map: dict[str, float] = {}
    for pol in ("pm25", "pm10", "co", "no2", "so2", "o3"):
        val = raw_units.get(pol)
        if val is not None:
            try:
                pollutants_map[pol] = float(val)
            except (ValueError, TypeError):
                pass

    display_names = {
        "pm25": "PM2.5 (Fine Particles)",
        "pm10": "PM10 (Coarse Particles)",
        "co": "Carbon Monoxide (CO)",
        "no2": "Nitrogen Dioxide (NO2)",
        "so2": "Sulphur Dioxide (SO2)",
        "o3": "Ozone (O3)",
    }
    units = {
        "pm25": "µg/m³",
        "pm10": "µg/m³",
        "co": "µg/m³",
        "no2": "µg/m³",
        "so2": "µg/m³",
        "o3": "µg/m³",
    }

    items = []
    for key, display_name in display_names.items():
        conc = pollutants_map.get(key)
        items.append(
            PollutantData(
                name=key,
                display_name=display_name,
                concentration=conc,
                unit=units.get(key, "µg/m³"),
                aqi_contribution=aqi_res.sub_indexes.get(key),
                available=conc is not None,
            )
        )

    measured_at_str = current.get("measured_at")
    try:
        measured_at = (
            datetime.fromisoformat(str(measured_at_str)).replace(tzinfo=timezone.utc)
            if measured_at_str
            else datetime.now(timezone.utc)
        )
    except Exception:
        measured_at = datetime.now(timezone.utc)

    return PollutantsResponse(
        location_id=location.id,
        pollutants=items,
        measured_at=measured_at,
        source="open_meteo",
    )
