"""APScheduler-based background data collection service for AERIS."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.core.config import settings
from app.core.database import async_session_factory
from app.models.location import Location
from app.models.reading import AqiReading
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

        raw_us_aqi = raw_data.get("us_aqi_openmeteo")
        epa_subs = raw_data.get("epa_sub_indexes", {})

        aqi_val = float(raw_us_aqi) if raw_us_aqi is not None else None
        primary_pol = None
        if epa_subs:
            valid_subs = {k: v for k, v in epa_subs.items() if v is not None}
            if valid_subs:
                matching = [k for k, v in valid_subs.items() if aqi_val is not None and v == aqi_val]
                primary_pol = matching[0] if matching else max(valid_subs, key=valid_subs.get)
        if not primary_pol and aqi_val is not None:
            primary_pol = "pm25"

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
            aqi_value=aqi_val,
            aqi_standard="us_epa",
            primary_pollutant=primary_pol,
            pm25=pollutants.get("pm25"),
            pm10=pollutants.get("pm10"),
            co=pollutants.get("co"),
            no2=pollutants.get("no2"),
            so2=pollutants.get("so2"),
            o3=pollutants.get("o3"),
            measured_at=measured_at,
        )

        # Check if already exists for this standard
        chk = select(AqiReading).where(
            AqiReading.location_id == reading.location_id,
            AqiReading.source == reading.source,
            AqiReading.measured_at == reading.measured_at,
            AqiReading.aqi_standard == reading.aqi_standard,
        )
        existing = (await session.execute(chk)).scalar_one_or_none()
        if existing is not None:
            existing.aqi_value = reading.aqi_value
            existing.primary_pollutant = reading.primary_pollutant
        else:
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
        from app.services.notification_service import (
            send_daily_notifications,
            send_high_pollution_alerts,
        )

        scheduler.add_job(
            collect_all_active_locations,
            "interval",
            minutes=settings.DATA_COLLECTION_INTERVAL_MINUTES,
            id="aqi_data_collector",
            replace_existing=True,
        )
        scheduler.add_job(
            send_daily_notifications,
            "interval",
            minutes=1,
            id="daily_notifications_job",
            replace_existing=True,
        )
        scheduler.add_job(
            send_high_pollution_alerts,
            "interval",
            minutes=15,
            id="high_pollution_alerts_job",
            replace_existing=True,
        )
        scheduler.start()
        logger.info(
            "Scheduler started: data collection (every %d mins), daily notifications (every 1 min), pollution alerts (every 15 min)",
            settings.DATA_COLLECTION_INTERVAL_MINUTES,
        )


def stop_scheduler() -> None:
    """Shut down the background scheduler cleanly."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
