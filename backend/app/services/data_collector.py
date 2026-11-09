"""APScheduler-based background data collection service for AERIS."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.core.config import settings
from app.core.database import async_session_factory
from app.models.location import Location
from app.models.reading import AqiReading
from app.services.aqi_calculator import calculate_aqi
from app.services.open_meteo import fetch_current_air_quality

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def collect_for_location(
    session: AsyncSession,
    location: Location,
    standard: str = "us_epa",
) -> AqiReading | None:
    """Fetch current air quality for a single location and persist to database."""
    try:
        raw_data = await fetch_current_air_quality(location.latitude, location.longitude)
        current = raw_data.get("current", {})
        if not current:
            logger.warning("No current reading returned for location %s", location.id)
            return None

        # Determine standard based on country if not explicitly given
        loc_standard = standard
        if location.country_code and location.country_code.upper() == "IN":
            loc_standard = "cpcb_naqi"

        # Build pollutant concentration dict using standard-specific units
        calc_units = (
            raw_data.get("cpcb_units", {})
            if loc_standard == "cpcb_naqi"
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

        aqi_result = calculate_aqi(pollutants_for_calc, standard=loc_standard)

        # Raw concentrations in µg/m³
        raw_units = raw_data.get("raw", {})
        pollutants: dict[str, float] = {}
        for pol in ("pm25", "pm10", "co", "no2", "so2", "o3"):
            val = raw_units.get(pol)
            if val is not None:
                try:
                    pollutants[pol] = float(val)
                except (ValueError, TypeError):
                    pass

        measured_at_str = current.get("measured_at")
        if measured_at_str:
            try:
                measured_at = datetime.fromisoformat(str(measured_at_str)).replace(tzinfo=timezone.utc)
            except (ValueError, TypeError):
                measured_at = datetime.now(timezone.utc)
        else:
            measured_at = datetime.now(timezone.utc)

        reading = AqiReading(
            location_id=location.id,
            station_id=None,
            source="open_meteo",
            measurement_type="model_estimate",
            aqi_value=aqi_result.value,
            aqi_standard=loc_standard,
            primary_pollutant=aqi_result.primary_pollutant,
            pm25=pollutants.get("pm25"),
            pm10=pollutants.get("pm10"),
            co=pollutants.get("co"),
            no2=pollutants.get("no2"),
            so2=pollutants.get("so2"),
            o3=pollutants.get("o3"),
            measured_at=measured_at,
        )

        # Check if already exists
        chk = select(AqiReading.id).where(
            AqiReading.location_id == reading.location_id,
            AqiReading.source == reading.source,
            AqiReading.measured_at == reading.measured_at,
        )
        if (await session.execute(chk)).scalar_one_or_none() is None:
            session.add(reading)
            await session.commit()
        return reading

    except Exception:
        logger.exception("Failed collecting data for location %s", location.id)
        await session.rollback()
        return None


async def collect_all_active_locations() -> None:
    """Periodic job to collect AQI readings for all tracked locations."""
    logger.info("Starting scheduled air quality collection run")
    async with async_session_factory() as session:
        try:
            result = await session.execute(select(Location))
            locations = result.scalars().all()
            for loc in locations:
                await collect_for_location(session, loc)
            logger.info("Completed scheduled collection for %d locations", len(locations))
        except Exception:
            logger.exception("Error during scheduled collection run")


def start_scheduler() -> None:
    """Initialize and start the background scheduler."""
    if not scheduler.running:
        scheduler.add_job(
            collect_all_active_locations,
            "interval",
            minutes=settings.DATA_COLLECTION_INTERVAL_MINUTES,
            id="aqi_data_collector",
            replace_existing=True,
        )
        scheduler.start()
        logger.info(
            "Scheduler started with interval %d minutes",
            settings.DATA_COLLECTION_INTERVAL_MINUTES,
        )


def stop_scheduler() -> None:
    """Shut down the background scheduler cleanly."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
