"""Pydantic schemas for push-notification endpoints."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class PushSubscriptionKeys(BaseModel):
    """Web Push subscription keys."""

    p256dh: str
    auth: str


class PushSubscriptionRequest(BaseModel):
    """Request body to register a push subscription."""

    endpoint: str
    keys: PushSubscriptionKeys


class NotificationPreferenceRequest(BaseModel):
    """Request body to create / update a notification preference."""

    location_id: int | None = None
    enabled: bool = True
    preferred_time: str = Field("08:00", pattern=r"^\d{2}:\d{2}$")
    timezone: str = "UTC"
    frequency: str = Field("daily", pattern=r"^(daily|weekly)$")


class NotificationPreferenceResponse(BaseModel):
    """Full notification preference data returned from the API."""

    id: int
    subscription_id: int
    location_id: int | None = None
    location_name: str | None = None
    enabled: bool = True
    preferred_time: str = "08:00"
    timezone: str = "UTC"
    frequency: str = "daily"
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
