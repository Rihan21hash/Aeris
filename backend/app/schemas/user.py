"""Pydantic schemas for user-related endpoints."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class UserResponse(BaseModel):
    """Public representation of a user."""

    id: int
    firebase_uid: str | None = None
    email: str | None = None
    display_name: str | None = None
    photo_url: str | None = None
    timezone: str | None = "UTC"
    preferred_aqi_standard: str = "us_epa"
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    """Fields the user is allowed to update."""

    display_name: str | None = Field(None, max_length=255)
    timezone: str | None = Field(None, max_length=64)
    preferred_aqi_standard: str | None = Field(None, pattern=r"^(us_epa|cpcb_naqi)$")
