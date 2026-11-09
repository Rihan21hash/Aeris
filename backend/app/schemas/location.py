"""Pydantic schemas for location-related API endpoints."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class LocationSearchResult(BaseModel):
    """A single geocoding search result."""

    name: str
    city: str | None = None
    state: str | None = None
    country: str | None = None
    country_code: str | None = None
    latitude: float
    longitude: float
    display_name: str


class LocationSearchResponse(BaseModel):
    """List of location search results."""

    results: list[LocationSearchResult] = []
    query: str = ""


class LocationDetail(BaseModel):
    """Full location record as stored in the database."""

    id: int
    name: str
    city: str | None = None
    state: str | None = None
    country: str | None = None
    country_code: str | None = None
    latitude: float
    longitude: float
    timezone: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class SavedLocationRequest(BaseModel):
    """Request body to save a location for the authenticated user."""

    location_id: int
    is_default: bool = Field(False, description="Set this as the default location.")


class SavedLocationResponse(BaseModel):
    """A saved-location entry with embedded location details."""

    id: int
    location: LocationDetail
    is_default: bool = False
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
