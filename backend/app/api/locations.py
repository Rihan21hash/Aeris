"""Locations endpoints: search, retrieval, and user saved locations."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_db_user
from app.core.database import get_db
from app.models.location import Location, SavedLocation
from app.models.user import User
from app.schemas.location import (
    LocationDetail,
    LocationSearchResponse,
    LocationSearchResult,
    SavedLocationRequest,
    SavedLocationResponse,
)
from app.services.geocoding import search_location

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/locations", tags=["Locations"])


@router.get("/search", response_model=LocationSearchResponse)
async def search_locations(
    q: str = Query(..., min_length=2, description="Location search query"),
    limit: int = Query(5, ge=1, le=20),
):
    """Search for locations worldwide using Nominatim geocoding."""
    results = await search_location(q, limit=limit)
    items = [
        LocationSearchResult(
            name=r.get("name", ""),
            city=r.get("city"),
            state=r.get("state"),
            country=r.get("country"),
            country_code=r.get("country_code"),
            latitude=r.get("latitude", 0.0),
            longitude=r.get("longitude", 0.0),
            display_name=r.get("display_name", ""),
        )
        for r in results
    ]
    return LocationSearchResponse(results=items, query=q)


@router.get("/saved", response_model=list[SavedLocationResponse])
async def get_saved_locations(
    user: User = Depends(get_current_db_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve saved locations for the authenticated user."""
    stmt = (
        select(SavedLocation)
        .where(SavedLocation.user_id == user.id)
        .options(selectinload(SavedLocation.location))
        .order_by(SavedLocation.created_at.desc())
    )
    result = await db.execute(stmt)
    saved = result.scalars().all()
    return saved


@router.post("/saved", response_model=SavedLocationResponse, status_code=status.HTTP_201_CREATED)
async def save_location(
    body: SavedLocationRequest,
    user: User = Depends(get_current_db_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a location to the authenticated user's saved list."""
    location = await db.get(Location, body.location_id)
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    # Check if already saved
    stmt = select(SavedLocation).where(
        SavedLocation.user_id == user.id,
        SavedLocation.location_id == body.location_id,
    )
    existing = (await db.execute(stmt)).scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Location is already in your saved locations.",
        )

    if body.is_default:
        # Clear default flag on existing saved locations
        await db.execute(
            update(SavedLocation)
            .where(SavedLocation.user_id == user.id)
            .values(is_default=False)
        )

    saved_loc = SavedLocation(
        user_id=user.id,
        location_id=body.location_id,
        is_default=body.is_default,
    )
    db.add(saved_loc)
    await db.commit()
    await db.refresh(saved_loc)

    # Reload with location relationship
    stmt_reload = (
        select(SavedLocation)
        .where(SavedLocation.id == saved_loc.id)
        .options(selectinload(SavedLocation.location))
    )
    res = (await db.execute(stmt_reload)).scalars().first()
    return res


@router.delete("/saved/{saved_location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved_location(
    saved_location_id: int,
    user: User = Depends(get_current_db_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a location from the user's saved list."""
    saved = await db.get(SavedLocation, saved_location_id)
    if not saved or saved.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved location not found or access denied.",
        )
    await db.delete(saved)
    await db.commit()
    return None


@router.put("/saved/{saved_location_id}/default", response_model=SavedLocationResponse)
async def set_default_location(
    saved_location_id: int,
    user: User = Depends(get_current_db_user),
    db: AsyncSession = Depends(get_db),
):
    """Set a saved location as the default for the authenticated user."""
    saved = await db.get(SavedLocation, saved_location_id)
    if not saved or saved.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved location not found.")

    # Unset all other defaults
    await db.execute(
        update(SavedLocation)
        .where(SavedLocation.user_id == user.id)
        .values(is_default=False)
    )

    saved.is_default = True
    await db.commit()
    await db.refresh(saved)

    stmt = (
        select(SavedLocation)
        .where(SavedLocation.id == saved.id)
        .options(selectinload(SavedLocation.location))
    )
    return (await db.execute(stmt)).scalars().first()


@router.get("/{location_id}", response_model=LocationDetail)
async def get_location(
    location_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full location details by ID."""
    location = await db.get(Location, location_id)
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    return location
