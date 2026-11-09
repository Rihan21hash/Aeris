"""FastAPI route dependencies."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_optional, get_current_user_required
from app.models.location import Location
from app.models.user import User
from app.services.geocoding import reverse_geocode

logger = logging.getLogger(__name__)


async def get_db_session() -> AsyncSession:
    """Re-export get_db."""
    async for session in get_db():
        yield session


async def get_or_create_location(
    lat: float,
    lon: float,
    session: AsyncSession,
) -> Location:
    """Find an existing location within ~1km or reverse-geocode and create one."""
    # Round to 2 decimal places (~1.1 km) for grouping nearby requests
    lat_rounded = round(lat, 2)
    lon_rounded = round(lon, 2)

    stmt = select(Location).where(
        Location.latitude.between(lat_rounded - 0.02, lat_rounded + 0.02),
        Location.longitude.between(lon_rounded - 0.02, lon_rounded + 0.02),
    )
    result = await session.execute(stmt)
    location = result.scalars().first()

    if location is not None:
        return location

    # Reverse geocode via Nominatim
    geo_data = await reverse_geocode(lat, lon)
    name = geo_data.get("display_name", f"{lat:.4f}, {lon:.4f}")
    if len(name) > 255:
        name = name[:252] + "..."

    city = geo_data.get("city")
    state = geo_data.get("state")
    country = geo_data.get("country")
    country_code = geo_data.get("country_code")

    location = Location(
        name=city or name.split(",")[0] or "Unknown Location",
        city=city,
        state=state,
        country=country,
        country_code=country_code,
        latitude=lat,
        longitude=lon,
    )
    session.add(location)
    await session.commit()
    await session.refresh(location)
    return location


async def get_current_db_user(
    claims: dict[str, Any] = Depends(get_current_user_required),
    session: AsyncSession = Depends(get_db),
) -> User:
    """Fetch or raise 404 for the authenticated user from the database."""
    uid = claims.get("uid")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not present in token.",
        )

    stmt = select(User).where(User.firebase_uid == uid)
    result = await session.execute(stmt)
    user = result.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not synced to database yet. Call /api/auth/sync first.",
        )
    return user


async def get_current_db_user_optional(
    claims: dict[str, Any] | None = Depends(get_current_user_optional),
    session: AsyncSession = Depends(get_db),
) -> User | None:
    """Return User or None if anonymous or not synced."""
    if not claims or not claims.get("uid"):
        return None

    uid = claims.get("uid")
    stmt = select(User).where(User.firebase_uid == uid)
    result = await session.execute(stmt)
    return result.scalars().first()

