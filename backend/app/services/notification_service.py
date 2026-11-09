"""Web Push notification service for AERIS."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from pywebpush import WebPushException, webpush
from sqlalchemy import select, update

from app.core.config import settings
from app.core.database import async_session_factory
from app.models.location import Location
from app.models.notification import NotificationPreference, NotificationSubscription
from app.services.aqi_calculator import calculate_aqi, get_health_recommendation
from app.services.open_meteo import fetch_current_air_quality

logger = logging.getLogger(__name__)


def send_push_notification(subscription_info: dict, payload: dict) -> bool:
    """Send a Web Push notification to a single browser subscription."""
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_PUBLIC_KEY:
        logger.warning("VAPID keys not configured; cannot send push notification")
        return False

    try:
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_CLAIM_EMAIL or "mailto:admin@aeris.app"},
        )
        return True
    except WebPushException as exc:
        logger.warning("WebPush failed: %s", exc)
        # 404 or 410 Gone means the subscription expired or was removed by user
        if exc.response and exc.response.status_code in (404, 410):
            return False
        return False
    except Exception:
        logger.exception("Unexpected error sending push notification")
        return False


async def send_daily_notifications() -> None:
    """Check all active notification preferences and send daily updates.

    Matches against the user's preferred delivery time (HH:MM) in their timezone.
    """
    logger.info("Running daily push notification delivery check")
    now_utc = datetime.now(timezone.utc)

    async with async_session_factory() as session:
        try:
            stmt = (
                select(NotificationPreference, NotificationSubscription, Location)
                .join(
                    NotificationSubscription,
                    NotificationPreference.subscription_id == NotificationSubscription.id,
                )
                .outerjoin(Location, NotificationPreference.location_id == Location.id)
                .where(
                    NotificationPreference.enabled.is_(True),
                    NotificationSubscription.enabled.is_(True),
                )
            )
            results = (await session.execute(stmt)).all()

            for pref, sub, loc in results:
                if not loc:
                    continue

                # Check if current UTC hour matches roughly preferred time
                pref_hour = int(pref.preferred_time.split(":")[0])
                if now_utc.hour != pref_hour:
                    continue

                # Fetch fresh AQI
                raw = await fetch_current_air_quality(loc.latitude, loc.longitude)
                curr = raw.get("current", {})
                pollutants = {
                    k: float(curr[k])
                    for k in ("pm25", "pm10", "co", "no2", "so2", "o3")
                    if curr.get(k) is not None
                }
                std = "cpcb_naqi" if loc.country_code == "IN" else "us_epa"
                res = calculate_aqi(pollutants, standard=std)

                if res.value is None:
                    continue  # Do not send fabricated or missing notifications

                recommendation = get_health_recommendation(res.value, standard=std)

                payload = {
                    "title": "AERIS — Air Quality Update",
                    "body": f"{loc.name}: AQI {int(res.value)} ({res.category}). {recommendation}",
                    "icon": "/favicon.svg",
                    "badge": "/favicon.svg",
                    "data": {
                        "url": f"/?lat={loc.latitude}&lon={loc.longitude}",
                        "aqi": res.value,
                        "category": res.category,
                        "location": loc.name,
                    },
                }

                sub_info = {
                    "endpoint": sub.endpoint,
                    "keys": {
                        "p256dh": sub.p256dh_key,
                        "auth": sub.auth_key,
                    },
                }

                success = send_push_notification(sub_info, payload)
                if not success:
                    # Deactivate bad subscription
                    await session.execute(
                        update(NotificationSubscription)
                        .where(NotificationSubscription.id == sub.id)
                        .values(enabled=False)
                    )
                    await session.commit()

        except Exception:
            logger.exception("Error during daily push notifications job")
