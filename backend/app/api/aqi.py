"""AQI endpoints for current data, historical records, and extremes (US EPA standard only)."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
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
from app.services.aqi_calculator import (
    calculate_aqi,
    get_aqi_category,
    get_health_recommendation,
)
from app.services.open_meteo import fetch_current_air_quality, fetch_historical_air_quality

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/aqi", tags=["AQI"])


@router.get("/current", response_model=AqiCurrentResponse)
async def get_current_aqi(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve current US EPA AQI for given coordinates from Open-Meteo."""
    # Find or create location
    location = await get_or_create_location(lat, lon, db)

    # Fetch live data from Open-Meteo
    raw_data = await fetch_current_air_quality(lat, lon)
    current = raw_data.get("current", {})

    if not current:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Current air quality data is temporarily unavailable from the provider.",
        )

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

    raw_us_aqi = raw_data.get("us_aqi_openmeteo")
    epa_subs = raw_data.get("epa_sub_indexes", {})

    # US EPA AQI: use Open-Meteo's raw current.us_aqi directly
    aqi_value = float(raw_us_aqi) if raw_us_aqi is not None else None

    # Determine primary pollutant from provider EPA sub-indices
    primary_pollutant = None
    if epa_subs:
        valid_subs = {k: v for k, v in epa_subs.items() if v is not None}
        if valid_subs:
            matching = [k for k, v in valid_subs.items() if aqi_value is not None and v == aqi_value]
            primary_pollutant = matching[0] if matching else max(valid_subs, key=valid_subs.get)

    if not primary_pollutant and aqi_value is not None:
        primary_pollutant = "pm25"

    cat, color = get_aqi_category(aqi_value) if aqi_value is not None else ("Unavailable", "#6B7280")
    health_rec = get_health_recommendation(aqi_value) if aqi_value is not None else None
    active_sub_indexes = epa_subs

    # Parse measurement timestamp
    measured_at_str = current.get("measured_at")
    if measured_at_str:
        try:
            measured_at = datetime.fromisoformat(str(measured_at_str)).replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            measured_at = datetime.now(timezone.utc)
    else:
        measured_at = datetime.now(timezone.utc)

    # Persist or update the reading in the database under US EPA standard
    try:
        stmt_check = select(AqiReading).where(
            AqiReading.location_id == location.id,
            AqiReading.source == "open_meteo",
            AqiReading.measured_at == measured_at,
            AqiReading.aqi_standard == "us_epa",
        )
        existing_reading = (await db.execute(stmt_check)).scalar_one_or_none()
        if existing_reading is not None:
            existing_reading.aqi_value = aqi_value
            existing_reading.primary_pollutant = primary_pollutant
            existing_reading.pm25 = pollutants_map.get("pm25")
            existing_reading.pm10 = pollutants_map.get("pm10")
            existing_reading.co = pollutants_map.get("co")
            existing_reading.no2 = pollutants_map.get("no2")
            existing_reading.so2 = pollutants_map.get("so2")
            existing_reading.o3 = pollutants_map.get("o3")
        else:
            reading = AqiReading(
                location_id=location.id,
                source="open_meteo",
                measurement_type="model_estimate",
                aqi_value=aqi_value,
                aqi_standard="us_epa",
                primary_pollutant=primary_pollutant,
                pm25=pollutants_map.get("pm25"),
                pm10=pollutants_map.get("pm10"),
                co=pollutants_map.get("co"),
                no2=pollutants_map.get("no2"),
                so2=pollutants_map.get("so2"),
                o3=pollutants_map.get("o3"),
                measured_at=measured_at,
            )
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
                aqi_contribution=active_sub_indexes.get(key),
                available=conc is not None,
            )
        )

    pollutants_resp = PollutantsResponse(
        location_id=location.id,
        pollutants=pollutant_items,
        measured_at=measured_at,
        source="open_meteo",
    )

    diagnostics = {
        "raw_us_aqi": raw_us_aqi,
        "backend_aqi": aqi_value,
        "selected_standard": "us_epa",
        "source_timestamp": str(raw_data.get("raw_provider_current", {}).get("time") or current.get("measured_at")),
        "requested_coordinates": {
            "latitude": lat,
            "longitude": lon,
        },
        "resolved_location": {
            "id": location.id,
            "name": location.name,
            "country_code": location.country_code,
            "latitude": location.latitude,
            "longitude": location.longitude,
        },
        "data_source": "Open-Meteo Air Quality API",
        "provider_underlying_model": "Copernicus Atmosphere Monitoring Service (CAMS) / ECMWF (11km-40km grid)",
        "measurement_type": "model_estimate",
        "provider_timestamp": str(raw_data.get("raw_provider_current", {}).get("time") or current.get("measured_at")),
        "data_retrieval_timestamp": datetime.now(timezone.utc).isoformat(),
        "selected_pollutant_values_ug_m3": {
            "pm2_5": pollutants_map.get("pm25"),
            "pm10": pollutants_map.get("pm10"),
            "carbon_monoxide": pollutants_map.get("co"),
            "nitrogen_dioxide": pollutants_map.get("no2"),
            "sulphur_dioxide": pollutants_map.get("so2"),
            "ozone": pollutants_map.get("o3"),
        },
        "raw_api_response": raw_data.get("raw_provider_current", {}),
        "raw_api_units": raw_data.get("raw_provider_units", {}),
    }

    return AqiCurrentResponse(
        aqi_value=aqi_value,
        raw_us_aqi=raw_us_aqi,
        aqi_standard="us_epa",
        category=cat,
        color=color,
        primary_pollutant=primary_pollutant,
        measurement_type="model_estimate",
        source="open_meteo",
        measured_at=measured_at,
        location_id=location.id,
        location_name=location.name,
        latitude=location.latitude,
        longitude=location.longitude,
        pollutants=pollutants_resp,
        health_recommendation=health_rec,
        diagnostics=diagnostics,
    )


@router.get("/history", response_model=AqiHistoryResponse)
async def get_aqi_history(
    location_id: int = Query(..., description="Location ID"),
    range: str = Query("24h", pattern="^(24h|7d)$", description="History window"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve historical US EPA AQI records (excluding legacy records)."""
    location = await db.get(Location, location_id)
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    now = datetime.now(timezone.utc)
    delta = timedelta(hours=24) if range == "24h" else timedelta(days=7)
    start_time = now - delta

    # Query existing database readings matching US EPA standard only
    stmt = (
        select(AqiReading)
        .where(
            AqiReading.location_id == location_id,
            AqiReading.aqi_standard == "us_epa",
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

        for item in historical_raw:
            m_time = item.get("measured_at")
            if not m_time or m_time < start_time:
                continue

            raw_dict = item.get("raw", {})
            h_val = float(item["us_aqi_openmeteo"]) if item.get("us_aqi_openmeteo") is not None else None
            h_primary = "pm25"

            chk = select(AqiReading).where(
                AqiReading.location_id == location.id,
                AqiReading.source == "open_meteo",
                AqiReading.measured_at == m_time,
                AqiReading.aqi_standard == "us_epa",
            )
            existing_h = (await db.execute(chk)).scalar_one_or_none()
            if existing_h is not None:
                existing_h.aqi_value = h_val
                existing_h.primary_pollutant = h_primary
            else:
                r_entry = AqiReading(
                    location_id=location.id,
                    station_id=None,
                    source="open_meteo",
                    measurement_type="model_estimate",
                    aqi_value=h_val,
                    aqi_standard="us_epa",
                    primary_pollutant=h_primary,
                    pm25=raw_dict.get("pm25"),
                    pm10=raw_dict.get("pm10"),
                    co=raw_dict.get("co"),
                    no2=raw_dict.get("no2"),
                    so2=raw_dict.get("so2"),
                    o3=raw_dict.get("o3"),
                    measured_at=m_time,
                )
                db.add(r_entry)

        await db.commit()

        # Re-query
        stmt = (
            select(AqiReading)
            .where(
                AqiReading.location_id == location_id,
                AqiReading.aqi_standard == "us_epa",
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
    """Retrieve maximum, minimum, and average US EPA AQI over the given time range."""
    location = await db.get(Location, location_id)
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    now = datetime.now(timezone.utc)
    delta = timedelta(hours=24) if range == "24h" else timedelta(days=7)
    start_time = now - delta

    stmt = select(AqiReading).where(
        AqiReading.location_id == location_id,
        AqiReading.aqi_standard == "us_epa",
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
