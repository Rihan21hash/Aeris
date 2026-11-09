"""Push notifications subscription and preference management."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_db_user_optional, get_current_db_user
from app.core.database import get_db
from app.models.location import Location
from app.models.notification import NotificationHistory, NotificationPreference, NotificationSubscription
from app.models.user import User
from app.schemas.notification import (
    NotificationHistoryResponse,
    NotificationPreferenceRequest,
    NotificationPreferenceResponse,
    PushSubscriptionRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("/vapid-public-key")
async def get_vapid_public_key() -> dict[str, str]:
    """Return the application's VAPID public key for Web Push subscription."""
    from app.core.config import settings

    return {"public_key": settings.VAPID_PUBLIC_KEY}


class TestNotificationRequest(BaseModel):
    endpoint: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    location_name: str | None = None


@router.post("/test")
async def send_test_notification_endpoint(
    body: TestNotificationRequest,
    user: User | None = Depends(get_current_db_user_optional),
):
    """Dispatch an immediate Web Push notification to test browser notification delivery."""
    from app.services.notification_service import send_test_push

    try:
        return await send_test_push(
            endpoint=body.endpoint,
            lat=body.latitude,
            lon=body.longitude,
            location_name=body.location_name,
            user_id=user.id if user else None,
        )
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as exc:
        logger.exception("Failed sending test notification: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not deliver test notification: {exc}",
        )


class UnsubscribeRequest(BaseModel):
    endpoint: str


@router.post("/subscribe", status_code=status.HTTP_201_CREATED)
async def subscribe_push(
    body: PushSubscriptionRequest,
    user: User | None = Depends(get_current_db_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Register or re-activate a Web Push subscription."""
    user_id = user.id if user else None

    # Find existing subscription or create new
    stmt = select(NotificationSubscription).where(
        NotificationSubscription.endpoint == body.endpoint
    )
    sub = (await db.execute(stmt)).scalars().first()
    if not sub:
        sub = NotificationSubscription(
            user_id=user_id,
            endpoint=body.endpoint,
            p256dh_key=body.keys.p256dh,
            auth_key=body.keys.auth,
            enabled=True,
        )
        db.add(sub)
    else:
        sub.user_id = user_id
        sub.p256dh_key = body.keys.p256dh
        sub.auth_key = body.keys.auth
        sub.enabled = True

    await db.commit()
    await db.refresh(sub)

    # Ensure default preference exists for this subscription
    if sub:
        pref_res = await db.execute(
            select(NotificationPreference).where(NotificationPreference.subscription_id == sub.id)
        )
        pref = pref_res.scalars().first()
        if not pref:
            new_pref = NotificationPreference(
                user_id=user_id,
                subscription_id=sub.id,
                enabled=True,
                preferred_time="08:00",
                timezone="UTC",
                frequency="daily",
            )
            db.add(new_pref)

    await db.commit()
    return {"status": "subscribed", "subscription_id": sub.id if sub else None}


@router.delete("/subscribe", status_code=status.HTTP_200_OK)
async def unsubscribe_push(
    body: UnsubscribeRequest,
    db: AsyncSession = Depends(get_db),
):
    """Remove a push subscription by its endpoint."""
    await db.execute(
        delete(NotificationSubscription).where(NotificationSubscription.endpoint == body.endpoint)
    )
    await db.commit()
    return {"status": "unsubscribed"}


@router.get("/preferences", response_model=list[NotificationPreferenceResponse])
async def get_notification_preferences(
    user: User = Depends(get_current_db_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve notification preferences for the authenticated user."""
    stmt = (
        select(NotificationPreference)
        .where(NotificationPreference.user_id == user.id)
        .options(selectinload(NotificationPreference.location))
    )
    result = await db.execute(stmt)
    prefs = result.scalars().all()

    return [
        NotificationPreferenceResponse(
            id=p.id,
            subscription_id=p.subscription_id,
            location_id=p.location_id,
            location_name=p.location.name if p.location else None,
            enabled=p.enabled,
            preferred_time=p.preferred_time,
            timezone=p.timezone,
            frequency=p.frequency,
            created_at=p.created_at,
        )
        for p in prefs
    ]


@router.put("/preferences", response_model=NotificationPreferenceResponse)
async def update_notification_preferences(
    body: NotificationPreferenceRequest,
    subscription_id: int = Query(..., description="Target subscription ID"),
    user: User | None = Depends(get_current_db_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Update notification preferences for a subscription."""
    sub = await db.get(NotificationSubscription, subscription_id)
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")

    if user and sub.user_id and sub.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    stmt = select(NotificationPreference).where(
        NotificationPreference.subscription_id == subscription_id
    )
    pref = (await db.execute(stmt)).scalars().first()

    if body.location_id:
        loc = await db.get(Location, body.location_id)
        if not loc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    if not pref:
        pref = NotificationPreference(
            user_id=user.id if user else None,
            subscription_id=subscription_id,
            location_id=body.location_id,
            enabled=body.enabled,
            preferred_time=body.preferred_time,
            timezone=body.timezone,
            frequency=body.frequency,
        )
        db.add(pref)
    else:
        pref.location_id = body.location_id
        pref.enabled = body.enabled
        pref.preferred_time = body.preferred_time
        pref.timezone = body.timezone
        pref.frequency = body.frequency

    await db.commit()
    await db.refresh(pref)

    loc_name = None
    if pref.location_id:
        loc = await db.get(Location, pref.location_id)
        loc_name = loc.name if loc else None

    return NotificationPreferenceResponse(
        id=pref.id,
        subscription_id=pref.subscription_id,
        location_id=pref.location_id,
        location_name=loc_name,
        enabled=pref.enabled,
        preferred_time=pref.preferred_time,
        timezone=pref.timezone,
        frequency=pref.frequency,
        created_at=pref.created_at,
    )



@router.get("/history", response_model=list[NotificationHistoryResponse])
async def get_notification_history(
    user: User = Depends(get_current_db_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
):
    """Return the authenticated user's notification history, newest first."""
    stmt = (
        select(NotificationHistory)
        .where(NotificationHistory.user_id == user.id)
        .order_by(NotificationHistory.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    return [
        NotificationHistoryResponse(
            id=r.id,
            notification_type=r.notification_type,
            aqi_value=r.aqi_value,
            aqi_category=r.aqi_category,
            aqi_standard=r.aqi_standard,
            primary_pollutant=r.primary_pollutant,
            data_source=r.data_source,
            data_timestamp=r.data_timestamp,
            message_title=r.message_title,
            message_body=r.message_body,
            delivery_status=r.delivery_status,
            location_name=r.location.name if r.location else None,
            created_at=r.created_at,
        )
        for r in records
    ]
