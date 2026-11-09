"""AQI endpoints for current data, historical records, and extremes."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_or_create_location
from app.core.database import get_db
from app.models.location import Location
from app.models.reading import AqiReading
from app.schemas.aqi import (
    AqiCurrentResponse,
    AqiExtremesResponse,
    AqiHistoryPoint,
    AqiHistoryResponse,
    PollutantData,
    PollutantsResponse,
)
from app.services.aqi_calculator import calculate_aqi, get_health_recommendation
from app.services.open_meteo import fetch_current_air_quality, fetch_historical_air_quality

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/aqi", tags=["AQI"])


@router.get("/current", response_model=AqiCurrentResponse)
async def get_current_aqi(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude"),
    standard: str = Query("us_epa", pattern="^(us_epa|cpcb_naqi)$"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve current AQI for given coordinates from Open-Meteo and calculate index."""
    # Find or create location
    location = await get_or_create_location(lat, lon, db)

    # If country is India and standard wasn't explicitly changed, prefer CPCB NAQI
    if location.country_code and location.country_code.upper() == "IN" and standard == "us_epa":
        standard = "cpcb_naqi"

    # Fetch live data from Open-Meteo
    raw_data = await fetch_current_air_quality(lat, lon)
    current = raw_data.get("current", {})

    if not current:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Current air quality data is temporarily unavailable from the provider.",
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
    health_rec = get_health_recommendation(aqi_res.value, standard=standard) if aqi_res.value is not None else None

    # Raw concentrations in µg/m³ for storage and display
    raw_units = raw_data.get("raw", {})
    pollutants_map: dict[str, float] = {}
    for pol in ("pm25", "pm10", "co", "no2", "so2", "o3"):
        val = raw_units.get(pol)
        if val is not None:
            try:
                pollutants_map[pol] = float(val)
            except (ValueError, TypeError):
                pass

    # Parse measurement timestamp
    measured_at_str = current.get("measured_at")
    if measured_at_str:
        try:
            measured_at = datetime.fromisoformat(str(measured_at_str)).replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            measured_at = datetime.now(timezone.utc)
    else:
        measured_at = datetime.now(timezone.utc)

    # Persist the reading to the database
    reading = AqiReading(
        location_id=location.id,
        source="open_meteo",
        measurement_type="model_estimate",
        aqi_value=aqi_res.value,
        aqi_standard=standard,
        primary_pollutant=aqi_res.primary_pollutant,
        pm25=pollutants_map.get("pm25"),
        pm10=pollutants_map.get("pm10"),
        co=pollutants_map.get("co"),
        no2=pollutants_map.get("no2"),
        so2=pollutants_map.get("so2"),
        o3=pollutants_map.get("o3"),
        measured_at=measured_at,
    )

    try:
        stmt_check = select(AqiReading.id).where(
            AqiReading.location_id == reading.location_id,
            AqiReading.source == reading.source,
            AqiReading.measured_at == reading.measured_at,
        )
        if (await db.execute(stmt_check)).scalar_one_or_none() is None:
            db.add(reading)
            await db.commit()
    except Exception:
        logger.exception("Failed to store AQI reading")
        await db.rollback()

    # Build pollutant response
    pollutant_items = []
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

    for key, display_name in display_names.items():
        conc = pollutants_map.get(key)
        pollutant_items.append(
            PollutantData(
                name=key,
                display_name=display_name,
                concentration=conc,
                unit=units.get(key, "µg/m³"),
                aqi_contribution=aqi_res.sub_indexes.get(key),
                available=conc is not None,
            )
        )

    pollutants_resp = PollutantsResponse(
        location_id=location.id,
        pollutants=pollutant_items,
        measured_at=measured_at,
        source="open_meteo",
    )

    return AqiCurrentResponse(
        aqi_value=aqi_res.value,
        aqi_standard=standard,
        category=aqi_res.category,
        color=aqi_res.color,
        primary_pollutant=aqi_res.primary_pollutant,
        measurement_type="model_estimate",
        source="open_meteo",
        measured_at=measured_at,
        location_id=location.id,
        location_name=location.name,
        latitude=location.latitude,
        longitude=location.longitude,
        pollutants=pollutants_resp,
        health_recommendation=health_rec,
    )


@router.get("/history", response_model=AqiHistoryResponse)
async def get_aqi_history(
    location_id: int = Query(..., description="Location ID"),
    range: str = Query("24h", pattern="^(24h|7d)$", description="History window"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve historical AQI records (24h hourly or 7d daily aggregated)."""
    location = await db.get(Location, location_id)
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    now = datetime.now(timezone.utc)
    delta = timedelta(hours=24) if range == "24h" else timedelta(days=7)
    start_time = now - delta

    # Query existing database readings
    stmt = (
        select(AqiReading)
        .where(
            AqiReading.location_id == location_id,
            AqiReading.measured_at >= start_time,
        )
        .order_by(AqiReading.measured_at.asc())
    )
    result = await db.execute(stmt)
    readings = result.scalars().all()

    expected_points = 24 if range == "24h" else 7 * 24

    # If database lacks sufficient data, backfill from Open-Meteo
    if len(readings) < (12 if range == "24h" else 48):
        start_date_str = start_time.strftime("%Y-%m-%d")
        end_date_str = now.strftime("%Y-%m-%d")
        historical_raw = await fetch_historical_air_quality(
            location.latitude, location.longitude, start_date_str, end_date_str
        )

        std = "cpcb_naqi" if location.country_code == "IN" else "us_epa"
        for item in historical_raw:
            m_time = item.get("measured_at")
            if not m_time or m_time < start_time:
                continue

            # Skip if already exists
            chk = select(AqiReading.id).where(
                AqiReading.location_id == location.id,
                AqiReading.source == "open_meteo",
                AqiReading.measured_at == m_time,
            )
            if (await db.execute(chk)).scalar_one_or_none() is not None:
                continue

            p_map = {
                k: float(item[k])
                for k in ("pm25", "pm10", "co", "no2", "so2", "o3")
                if item.get(k) is not None
            }
            res = calculate_aqi(p_map, standard=std)

            r_entry = AqiReading(
                location_id=location.id,
                station_id=None,
                source="open_meteo",
                measurement_type="model_estimate",
                aqi_value=res.value,
                aqi_standard=std,
                primary_pollutant=res.primary_pollutant,
                pm25=p_map.get("pm25"),
                pm10=p_map.get("pm10"),
                co=p_map.get("co"),
                no2=p_map.get("no2"),
                so2=p_map.get("so2"),
                o3=p_map.get("o3"),
                measured_at=m_time,
            )
            db.add(r_entry)

        await db.commit()

        # Re-query
        stmt = (
            select(AqiReading)
            .where(
                AqiReading.location_id == location_id,
                AqiReading.measured_at >= start_time,
            )
            .order_by(AqiReading.measured_at.asc())
        )
        readings = (await db.execute(stmt)).scalars().all()

    # Format points
    points = [
        AqiHistoryPoint(
            timestamp=r.measured_at,
            aqi_value=r.aqi_value,
            measurement_type=r.measurement_type,
            source=r.source,
            primary_pollutant=r.primary_pollutant,
        )
        for r in readings
        if r.aqi_value is not None
    ]

    total = len(points)
    note = (
        f"Complete dataset ({total} records)."
        if total >= expected_points * 0.8
        else f"Partial data — {total} records available."
    )

    return AqiHistoryResponse(
        location_id=location_id,
        time_range=range,
        total_records=total,
        data_completeness_note=note,
        data=points,
    )


@router.get("/extremes", response_model=AqiExtremesResponse)
async def get_aqi_extremes(
    location_id: int = Query(..., description="Location ID"),
    range: str = Query("24h", pattern="^(24h|7d)$", description="History window"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve maximum, minimum, and average AQI over the given time range."""
    location = await db.get(Location, location_id)
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    now = datetime.now(timezone.utc)
    delta = timedelta(hours=24) if range == "24h" else timedelta(days=7)
    start_time = now - delta

    stmt = select(AqiReading).where(
        AqiReading.location_id == location_id,
        AqiReading.measured_at >= start_time,
        AqiReading.aqi_value.is_not(None),
    )
    result = await db.execute(stmt)
    readings = result.scalars().all()

    if not readings:
        return AqiExtremesResponse(location_id=location_id, time_range=range)

    max_reading = max(readings, key=lambda r: r.aqi_value or 0.0)
    min_reading = min(readings, key=lambda r: r.aqi_value or 9999.0)
    avg_val = sum(r.aqi_value for r in readings if r.aqi_value is not None) / len(readings)

    return AqiExtremesResponse(
        location_id=location_id,
        time_range=range,
        max_aqi=max_reading.aqi_value,
        max_aqi_timestamp=max_reading.measured_at,
        min_aqi=min_reading.aqi_value,
        min_aqi_timestamp=min_reading.measured_at,
        avg_aqi=round(avg_val, 1),
    )
