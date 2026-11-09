"""Web Push notification service for AERIS.

Delivers two types of notifications:
- **Daily briefings**: Sent once per day at the user's preferred local time.
- **High-pollution alerts**: Sent when the AQI category at a user's default
  location worsens compared to the last recorded category.

All notifications use real AQI data fetched live from the configured data
provider.  No hardcoded or fabricated AQI values are used in production.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

from pywebpush import WebPushException, webpush
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import async_session_factory
from app.models.location import Location, SavedLocation
from app.models.notification import (
    NotificationHistory,
    NotificationPreference,
    NotificationSubscription,
)
from app.models.user import User
from app.services.aqi_calculator import calculate_aqi, get_aqi_category, get_health_recommendation
from app.services.notification_templates import (
    category_worsened,
    render_template,
    select_template,
)
from app.services.open_meteo import fetch_current_air_quality

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────
# In-memory trackers
# ──────────────────────────────────────────────────────────────────────

# Daily deduplication: {preference_id: "YYYY-MM-DD"}
_daily_sent_tracker: dict[int, str] = {}

# High-pollution alert: {user_id: {"category": str, "last_alert_at": datetime}}
_alert_tracker: dict[int, dict[str, Any]] = {}

# Alert cooldown (hours)
ALERT_COOLDOWN_HOURS = 3

# Maximum age of provider data before we skip the notification
MAX_DATA_AGE_HOURS = 2


# ──────────────────────────────────────────────────────────────────────
# Low-level push delivery
# ──────────────────────────────────────────────────────────────────────

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
        logger.info("WebPush dispatched to endpoint: %s...", subscription_info.get("endpoint", "")[:40])
        return True
    except WebPushException as exc:
        logger.warning("WebPush failed: %s", exc)
        return False
    except Exception:
        logger.exception("Unexpected error sending push notification")
        return False


def _build_sub_info(sub: NotificationSubscription) -> dict:
    return {
        "endpoint": sub.endpoint,
        "keys": {
            "p256dh": sub.p256dh_key,
            "auth": sub.auth_key,
        },
    }


# ──────────────────────────────────────────────────────────────────────
# Shared AQI fetch + calculate helper
# ──────────────────────────────────────────────────────────────────────

async def _fetch_live_aqi(
    lat: float,
    lon: float,
    standard: str,
) -> dict[str, Any] | None:
    """Fetch live AQI data and return a dict with all needed fields.

    Returns ``None`` if data is unavailable, stale, or insufficient.
    """
    try:
        raw = await fetch_current_air_quality(lat, lon)
    except Exception as exc:
        logger.warning("Failed to fetch AQI for (%.4f, %.4f): %s", lat, lon, exc)
        return None

    curr = raw.get("current", {})
    if not curr:
        return None

    # Check data staleness
    measured_at_str = curr.get("measured_at")
    if measured_at_str:
        try:
            measured_at = datetime.fromisoformat(str(measured_at_str))
            if measured_at.tzinfo is None:
                measured_at = measured_at.replace(tzinfo=timezone.utc)
            age = datetime.now(timezone.utc) - measured_at
            if age > timedelta(hours=MAX_DATA_AGE_HOURS):
                logger.info("Skipping notification: data is %.1f hours old", age.total_seconds() / 3600)
                return None
        except (ValueError, TypeError):
            pass

    # Use the correct unit set for the standard
    if standard == "cpcb_naqi":
        calc_units = raw.get("cpcb_units", {})
    else:
        calc_units = raw.get("epa_units", {})

    pollutants: dict[str, float] = {}
    for pol in ("pm25", "pm10", "co", "no2", "so2", "o3"):
        val = calc_units.get(pol)
        if val is not None:
            try:
                pollutants[pol] = float(val)
            except (ValueError, TypeError):
                pass

    aqi_result = calculate_aqi(pollutants, standard=standard)
    if aqi_result.value is None:
        return None

    aqi_val = int(aqi_result.value)
    category = aqi_result.category
    health_advice = get_health_recommendation(aqi_val, standard=standard)
    timestamp_str = measured_at_str or datetime.now(timezone.utc).isoformat()

    return {
        "aqi": aqi_val,
        "category": category,
        "primary_pollutant": aqi_result.primary_pollutant or "PM2.5",
        "health_advice": health_advice,
        "standard": standard,
        "timestamp": timestamp_str,
        "pollutants": pollutants,
        "sub_indexes": aqi_result.sub_indexes,
    }


# ──────────────────────────────────────────────────────────────────────
# Record notification history
# ──────────────────────────────────────────────────────────────────────

async def _record_history(
    session: AsyncSession,
    *,
    user_id: int | None,
    location_id: int | None,
    notification_type: str,
    aqi_data: dict[str, Any] | None,
    title: str,
    body: str,
    delivery_status: str,
    dedup_key: str | None = None,
    template_index: int | None = None,
) -> None:
    """Persist a notification delivery attempt to the database."""
    try:
        record = NotificationHistory(
            user_id=user_id,
            location_id=location_id,
            notification_type=notification_type,
            aqi_value=aqi_data["aqi"] if aqi_data else None,
            aqi_category=aqi_data["category"] if aqi_data else None,
            aqi_standard=aqi_data["standard"] if aqi_data else None,
            primary_pollutant=aqi_data.get("primary_pollutant") if aqi_data else None,
            pollutant_values=json.dumps(aqi_data.get("pollutants", {})) if aqi_data else None,
            data_source="open_meteo",
            data_timestamp=aqi_data.get("timestamp") if aqi_data else None,
            message_title=title,
            message_body=body,
            delivery_status=delivery_status,
            deduplication_key=dedup_key,
            template_index=template_index,
        )
        session.add(record)
        await session.commit()
    except Exception:
        logger.exception("Failed to record notification history")
        await session.rollback()


# ──────────────────────────────────────────────────────────────────────
# Daily briefing notifications
# ──────────────────────────────────────────────────────────────────────

async def send_daily_notifications() -> None:
    """Periodic job: check each active notification preference and deliver
    a daily briefing at the user's preferred local time.

    For each user, looks up their saved default location, fetches live AQI,
    selects a template from the library, and sends via Web Push.
    """
    logger.debug("Running daily push notification delivery check")

    async with async_session_factory() as session:
        try:
            # Load all active preferences with their subscriptions
            stmt = (
                select(NotificationPreference, NotificationSubscription)
                .join(
                    NotificationSubscription,
                    NotificationPreference.subscription_id == NotificationSubscription.id,
                )
                .where(
                    NotificationPreference.enabled.is_(True),
                    NotificationSubscription.enabled.is_(True),
                )
            )
            results = (await session.execute(stmt)).all()

            for pref, sub in results:
                try:
                    await _process_daily_briefing(session, pref, sub)
                except Exception as exc:
                    logger.warning("Daily briefing failed for pref %d: %s", pref.id, exc)

        except Exception:
            logger.exception("Error during daily push notifications job")


async def _process_daily_briefing(
    session: AsyncSession,
    pref: NotificationPreference,
    sub: NotificationSubscription,
) -> None:
    """Handle a single preference for daily briefing delivery."""
    # 1. Resolve user timezone and local time
    tz_str = pref.timezone or "UTC"
    try:
        user_tz = ZoneInfo(tz_str)
    except Exception:
        user_tz = ZoneInfo("UTC")

    now_local = datetime.now(user_tz)
    today_str = now_local.strftime("%Y-%m-%d")

    # 2. Check if already dispatched today
    if _daily_sent_tracker.get(pref.id) == today_str:
        return

    # 3. Check if local time matches preferred time (HH:MM within 3-minute window)
    try:
        parts = pref.preferred_time.split(":")
        pref_h, pref_m = int(parts[0]), int(parts[1]) if len(parts) > 1 else 0
    except Exception:
        pref_h, pref_m = 8, 0

    current_mins = now_local.hour * 60 + now_local.minute
    pref_mins = pref_h * 60 + pref_m
    if abs(current_mins - pref_mins) > 3:
        return

    # 4. Resolve the user's saved default location
    user_id = pref.user_id or sub.user_id
    loc = None
    loc_id = None

    if user_id:
        # First try: user's default saved location
        default_stmt = (
            select(SavedLocation)
            .where(
                SavedLocation.user_id == user_id,
                SavedLocation.is_default.is_(True),
            )
        )
        saved = (await session.execute(default_stmt)).scalars().first()
        if saved:
            loc = await session.get(Location, saved.location_id)
            loc_id = saved.location_id

    # Fallback: location linked to the preference
    if not loc and pref.location_id:
        loc = await session.get(Location, pref.location_id)
        loc_id = pref.location_id

    if not loc:
        logger.debug("No location found for pref %d, skipping daily briefing", pref.id)
        return

    # 5. Determine AQI standard from user preference or country
    standard = "us_epa"
    if user_id:
        user = await session.get(User, user_id)
        if user and user.preferred_aqi_standard:
            standard = user.preferred_aqi_standard
    if standard == "us_epa" and loc.country_code and loc.country_code.upper() == "IN":
        standard = "cpcb_naqi"

    # 6. Fetch live AQI
    aqi_data = await _fetch_live_aqi(loc.latitude, loc.longitude, standard)
    if not aqi_data:
        logger.info("No valid AQI data for %s, skipping daily briefing", loc.name)
        return

    # 7. Select and render template
    template, tpl_idx = select_template(
        category=aqi_data["category"],
        standard=standard,
        notification_type="daily_briefing",
        user_id=user_id or 0,
    )
    rendered = render_template(
        template=template,
        location=loc.name,
        aqi=aqi_data["aqi"],
        category=aqi_data["category"],
        timestamp=aqi_data["timestamp"],
        primary_pollutant=aqi_data["primary_pollutant"],
        health_advice=aqi_data["health_advice"],
    )

    # 8. Build and send push notification
    payload = {
        "title": rendered["title"],
        "body": rendered["body"],
        "icon": "/favicon.svg",
        "badge": "/favicon.svg",
        "tag": "aeris-daily-briefing",
        "data": {
            "url": f"/?lat={loc.latitude}&lon={loc.longitude}",
            "aqi": aqi_data["aqi"],
            "category": aqi_data["category"],
            "location": loc.name,
        },
    }

    sub_info = _build_sub_info(sub)
    success = send_push_notification(sub_info, payload)

    dedup_key = f"daily:{pref.id}:{today_str}"

    if success:
        _daily_sent_tracker[pref.id] = today_str
        logger.info("Sent daily briefing to sub %d (%s, AQI %d)", sub.id, loc.name, aqi_data["aqi"])
    else:
        # Deactivate expired/invalid endpoint
        await session.execute(
            update(NotificationSubscription)
            .where(NotificationSubscription.id == sub.id)
            .values(enabled=False)
        )
        await session.commit()

    # 9. Record in history
    await _record_history(
        session,
        user_id=user_id,
        location_id=loc_id,
        notification_type="daily_briefing",
        aqi_data=aqi_data,
        title=rendered["title"],
        body=rendered["body"],
        delivery_status="delivered" if success else "failed",
        dedup_key=dedup_key,
        template_index=tpl_idx,
    )


# ──────────────────────────────────────────────────────────────────────
# High-pollution alerts
# ──────────────────────────────────────────────────────────────────────

async def send_high_pollution_alerts() -> None:
    """Periodic job: check each user's default location and send an alert
    when the AQI category has worsened since the last check.

    Implements a cooldown of ``ALERT_COOLDOWN_HOURS`` between alerts
    per user to avoid notification spam.
    """
    logger.debug("Running high-pollution alert check")

    async with async_session_factory() as session:
        try:
            # Get all users who have notification subscriptions
            stmt = (
                select(User, NotificationSubscription)
                .join(
                    NotificationSubscription,
                    NotificationSubscription.user_id == User.id,
                )
                .where(NotificationSubscription.enabled.is_(True))
            )
            results = (await session.execute(stmt)).all()

            # Deduplicate by user (a user may have multiple subscriptions)
            seen_users: set[int] = set()
            for user, sub in results:
                if user.id in seen_users:
                    continue
                seen_users.add(user.id)
                try:
                    await _process_pollution_alert(session, user, sub)
                except Exception as exc:
                    logger.warning("Pollution alert failed for user %d: %s", user.id, exc)

        except Exception:
            logger.exception("Error during high-pollution alerts job")


async def _process_pollution_alert(
    session: AsyncSession,
    user: User,
    sub: NotificationSubscription,
) -> None:
    """Handle a single user for high-pollution alerts."""
    # 1. Find user's default saved location
    default_stmt = (
        select(SavedLocation)
        .where(
            SavedLocation.user_id == user.id,
            SavedLocation.is_default.is_(True),
        )
    )
    saved = (await session.execute(default_stmt)).scalars().first()
    if not saved:
        return

    loc = await session.get(Location, saved.location_id)
    if not loc:
        return

    # 2. Determine standard
    standard = user.preferred_aqi_standard or "us_epa"
    if standard == "us_epa" and loc.country_code and loc.country_code.upper() == "IN":
        standard = "cpcb_naqi"

    # 3. Fetch live AQI
    aqi_data = await _fetch_live_aqi(loc.latitude, loc.longitude, standard)
    if not aqi_data:
        return

    new_category = aqi_data["category"]

    # 4. Compare with last known category
    last = _alert_tracker.get(user.id)
    if last:
        old_category = last["category"]
        # Check cooldown
        last_alert_time = last.get("last_alert_at")
        if last_alert_time:
            elapsed = datetime.now(timezone.utc) - last_alert_time
            if elapsed < timedelta(hours=ALERT_COOLDOWN_HOURS):
                # Update the tracked category but don't send another alert yet
                _alert_tracker[user.id]["category"] = new_category
                return

        if category_worsened(old_category, new_category, standard):
            # Category worsened — send alert
            template, tpl_idx = select_template(
                category=new_category,
                standard=standard,
                notification_type="high_pollution_alert",
                user_id=user.id,
            )
            rendered = render_template(
                template=template,
                location=loc.name,
                aqi=aqi_data["aqi"],
                category=new_category,
                timestamp=aqi_data["timestamp"],
                primary_pollutant=aqi_data["primary_pollutant"],
                health_advice=aqi_data["health_advice"],
            )

            payload = {
                "title": rendered["title"],
                "body": rendered["body"],
                "icon": "/favicon.svg",
                "badge": "/favicon.svg",
                "tag": "aeris-high-pollution",
                "data": {
                    "url": f"/?lat={loc.latitude}&lon={loc.longitude}",
                    "aqi": aqi_data["aqi"],
                    "category": new_category,
                    "location": loc.name,
                },
            }

            sub_info = _build_sub_info(sub)
            success = send_push_notification(sub_info, payload)

            _alert_tracker[user.id] = {
                "category": new_category,
                "last_alert_at": datetime.now(timezone.utc),
            }

            dedup_key = f"alert:{user.id}:{datetime.now(timezone.utc).strftime('%Y-%m-%dT%H')}"

            await _record_history(
                session,
                user_id=user.id,
                location_id=loc.id,
                notification_type="high_pollution_alert",
                aqi_data=aqi_data,
                title=rendered["title"],
                body=rendered["body"],
                delivery_status="delivered" if success else "failed",
                dedup_key=dedup_key,
                template_index=tpl_idx,
            )

            if success:
                logger.info(
                    "Sent high-pollution alert to user %d (%s: %s -> %s, AQI %d)",
                    user.id, loc.name, old_category, new_category, aqi_data["aqi"],
                )
        else:
            # Category did not worsen — just update tracker
            _alert_tracker[user.id]["category"] = new_category
    else:
        # First observation — store baseline, no alert
        _alert_tracker[user.id] = {
            "category": new_category,
            "last_alert_at": None,
        }


# ──────────────────────────────────────────────────────────────────────
# Test push notification (clearly labeled [TEST])
# ──────────────────────────────────────────────────────────────────────

async def send_test_push(
    endpoint: str | None = None,
    lat: float | None = None,
    lon: float | None = None,
    location_name: str | None = None,
    user_id: int | None = None,
) -> dict[str, Any]:
    """Send an immediate [TEST] push notification to verify delivery."""
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

        # Fetch real AQI data
        latitude = lat if lat is not None else 28.6139
        longitude = lon if lon is not None else 77.2090
        city = location_name or "Your Monitored City"

        aqi_data = await _fetch_live_aqi(latitude, longitude, "cpcb_naqi")

        if aqi_data:
            aqi_val = aqi_data["aqi"]
            category = aqi_data["category"]
            recommendation = aqi_data["health_advice"]
        else:
            # If live data is unavailable, indicate this in the test
            raise RuntimeError(
                "Could not fetch live AQI data for the test notification. "
                "Please check your network connection and try again."
            )

        payload = {
            "title": f"[TEST] AERIS — {city}",
            "body": f"Current AQI: {aqi_val} ({category}). {recommendation}",
            "icon": "/favicon.svg",
            "badge": "/favicon.svg",
            "tag": "aeris-test-notification",
            "data": {
                "url": f"/?lat={latitude}&lon={longitude}",
                "aqi": aqi_val,
                "category": category,
                "location": city,
            },
        }

        sub_info = _build_sub_info(sub)
        success = send_push_notification(sub_info, payload)

        # Record test in history
        await _record_history(
            session,
            user_id=user_id,
            location_id=None,
            notification_type="test",
            aqi_data=aqi_data,
            title=payload["title"],
            body=payload["body"],
            delivery_status="delivered" if success else "failed",
        )

        if not success:
            raise RuntimeError(
                "Push dispatch was rejected by the browser push service. "
                "Please ensure notification permissions are allowed."
            )

        return {
            "status": "delivered",
            "detail": f"[TEST] Push notification delivered: AQI {aqi_val} ({category}) for {city}",
            "payload": payload,
        }
