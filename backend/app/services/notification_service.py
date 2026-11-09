"""Web Push notification service for AERIS."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any
from zoneinfo import ZoneInfo

from pywebpush import WebPushException, webpush
from sqlalchemy import select, update

from app.core.config import settings
from app.core.database import async_session_factory
from app.models.location import Location
from app.models.notification import NotificationPreference, NotificationSubscription
from app.services.aqi_calculator import calculate_aqi, get_health_recommendation
from app.services.open_meteo import fetch_current_air_quality

logger = logging.getLogger(__name__)

# In-memory deduplication tracker: {preference_id: "YYYY-MM-DD"}
_daily_sent_tracker: dict[int, str] = {}


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
        logger.info("WebPush dispatched successfully to endpoint: %s...", subscription_info.get("endpoint", "")[:40])
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


async def send_test_push(
    endpoint: str | None = None,
    lat: float | None = None,
    lon: float | None = None,
    location_name: str | None = None,
    user_id: int | None = None,
) -> dict[str, Any]:
    """Send an immediate test push notification to verify browser notification delivery."""
    async with async_session_factory() as session:
        sub = None
        if endpoint:
            stmt = select(NotificationSubscription).where(
                NotificationSubscription.endpoint == endpoint,
                NotificationSubscription.enabled.is_(True),
            )
            sub = (await session.execute(stmt)).scalars().first()

        if not sub and user_id:
            stmt = (
                select(NotificationSubscription)
                .where(
                    NotificationSubscription.user_id == user_id,
                    NotificationSubscription.enabled.is_(True),
                )
                .order_by(NotificationSubscription.id.desc())
            )
            sub = (await session.execute(stmt)).scalars().first()

        if not sub:
            # Fallback to the latest active subscription
            stmt = (
                select(NotificationSubscription)
                .where(NotificationSubscription.enabled.is_(True))
                .order_by(NotificationSubscription.id.desc())
            )
            sub = (await session.execute(stmt)).scalars().first()

        if not sub:
            raise ValueError(
                "No active notification subscription found. Please click 'Enable Daily Notifications' first."
            )

        # Build payload with real AQI data
        latitude = lat if lat is not None else 28.6139
        longitude = lon if lon is not None else 77.2090
        city = location_name or "Your Monitored City"

        try:
            raw = await fetch_current_air_quality(latitude, longitude)
            curr = raw.get("current", {})
            pollutants = {
                k: float(curr[k])
                for k in ("pm25", "pm10", "co", "no2", "so2", "o3")
                if curr.get(k) is not None
            }
            std = "cpcb_naqi"
            res = calculate_aqi(pollutants, standard=std)
            aqi_val = int(res.value) if res.value is not None else 85
            category = res.category if res.category else "Moderate"
            recommendation = get_health_recommendation(aqi_val, standard=std)
        except Exception as exc:
            logger.warning("Could not fetch live AQI for test push: %s", exc)
            aqi_val = 74
            category = "Moderate"
            recommendation = "Air quality is acceptable for most individuals."

        payload = {
            "title": f"AERIS — {city}",
            "body": f"Current AQI: {aqi_val} ({category}). {recommendation}",
            "icon": "/favicon.svg",
            "badge": "/favicon.svg",
            "tag": "aeris-notification",
            "data": {
                "url": f"/?lat={latitude}&lon={longitude}",
                "aqi": aqi_val,
                "category": category,
                "location": city,
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
            raise RuntimeError(
                "Push dispatch was rejected by the browser push service. Please ensure notification permissions are allowed."
            )

        return {
            "status": "delivered",
            "detail": f"Push notification delivered: AQI {aqi_val} ({category}) for {city}",
            "payload": payload,
        }


async def send_daily_notifications() -> None:
    """Periodic job checking active notification preferences and delivering daily briefings.

    Evaluates user timezone and preferred delivery time.
    """
    logger.debug("Running daily push notification delivery check")

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
                # 1. Resolve user timezone and local time
                tz_str = pref.timezone or "UTC"
                try:
                    user_tz = ZoneInfo(tz_str)
                except Exception:
                    user_tz = timezone.utc

                now_local = datetime.now(user_tz)
                today_str = now_local.strftime("%Y-%m-%d")

                # 2. Check if already dispatched today
                if _daily_sent_tracker.get(pref.id) == today_str:
                    continue

                # 3. Check if local time matches preferred time (HH:MM within 3-minute window)
                try:
                    pref_parts = pref.preferred_time.split(":")
                    pref_h = int(pref_parts[0])
                    pref_m = int(pref_parts[1]) if len(pref_parts) > 1 else 0
                except Exception:
                    pref_h, pref_m = 8, 0

                minute_diff = abs((now_local.hour * 60 + now_local.minute) - (pref_h * 60 + pref_m))
                if minute_diff > 3:
                    continue

                # 4. Resolve location coordinates
                lat = loc.latitude if loc else 28.6139
                lon = loc.longitude if loc else 77.2090
                loc_name = loc.name if loc else "Monitored Region"
                country_code = loc.country_code if loc else "IN"

                # 5. Fetch fresh real-time AQI
                try:
                    raw = await fetch_current_air_quality(lat, lon)
                    curr = raw.get("current", {})
                    pollutants = {
                        k: float(curr[k])
                        for k in ("pm25", "pm10", "co", "no2", "so2", "o3")
                        if curr.get(k) is not None
                    }
                    std = "cpcb_naqi" if country_code == "IN" else "us_epa"
                    res = calculate_aqi(pollutants, standard=std)

                    if res.value is None:
                        continue

                    recommendation = get_health_recommendation(res.value, standard=std)
                    payload = {
                        "title": f"AERIS Daily Briefing — {loc_name}",
                        "body": f"Current AQI: {int(res.value)} ({res.category}). {recommendation}",
                        "icon": "/favicon.svg",
                        "badge": "/favicon.svg",
                        "tag": "aeris-daily-briefing",
                        "data": {
                            "url": f"/?lat={lat}&lon={lon}",
                            "aqi": res.value,
                            "category": res.category,
                            "location": loc_name,
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
                    if success:
                        _daily_sent_tracker[pref.id] = today_str
                        logger.info("Sent daily briefing to subscription %d (%s)", sub.id, loc_name)
                    else:
                        # Deactivate invalid/expired endpoint
                        await session.execute(
                            update(NotificationSubscription)
                            .where(NotificationSubscription.id == sub.id)
                            .values(enabled=False)
                        )
                        await session.commit()

                except Exception as exc:
                    logger.warning("Could not dispatch daily notification for pref %d: %s", pref.id, exc)

        except Exception:
            logger.exception("Error during daily push notifications job")
