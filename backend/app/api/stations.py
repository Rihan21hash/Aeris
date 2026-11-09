"""Monitoring stations endpoints."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.station import MonitoringStation
from app.services.openaq import fetch_nearby_stations

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/stations", tags=["Monitoring Stations"])


@router.get("/nearby")
async def get_nearby_stations(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude"),
    radius_km: int = Query(50, ge=1, le=200, description="Search radius in kilometres"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve nearby physical air quality monitoring stations.

    Fetches real station metadata and readings from the OpenAQ v3 network.
    """
    # 1. Fetch live from OpenAQ
    stations = await fetch_nearby_stations(lat, lon, radius_km=radius_km)

    # 2. Also check our cached stations table
    try:
        # Simple bounding box approximation
        deg_lat = radius_km / 111.0
        deg_lon = radius_km / (111.0 * max(0.1, abs(lat) * 0.01745))

        stmt = select(MonitoringStation).where(
            MonitoringStation.latitude.between(lat - deg_lat, lat + deg_lat),
            MonitoringStation.longitude.between(lon - deg_lon, lon + deg_lon),
        )
        cached = (await db.execute(stmt)).scalars().all()

        cached_dict = {
            c.external_station_id: {
                "id": c.id,
                "name": c.station_name,
                "latitude": c.latitude,
                "longitude": c.longitude,
                "source": c.source,
                "measurement_type": "station",
            }
            for c in cached
        }

        # Merge results, preferring fresh OpenAQ data
        merged = []
        seen_ids = set()
        for s in stations:
            s_id = str(s.get("id"))
            seen_ids.add(s_id)
            merged.append(s)

        for c_id, c_data in cached_dict.items():
            if c_id not in seen_ids:
                merged.append(c_data)

        return {"stations": merged, "count": len(merged)}

    except Exception:
        logger.exception("Failed querying cached monitoring stations")
        return {"stations": stations, "count": len(stations)}
