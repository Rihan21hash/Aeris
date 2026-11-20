"""Web Push notification service for AERIS.

Delivers notifications:
- **Daily briefings**: Sent once per day at the user's preferred local time.
- **High-pollution alerts**: Sent when the AQI category at a user's default
  location worsens compared to the last recorded category.
- **AQI improvement notifications**: Sent when the AQI category improves significantly.
- **Test notifications**: Sent on demand to verify browser push delivery.

All notifications use real AQI data fetched live from the configured data
provider. No hardcoded or fabricated AQI values are used in production.
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

import requests
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
from app.services.aqi_calculator import (
    calculate_aqi,
    get_aqi_category,
    get_health_recommendation,
)
from app.services.notification_templates import (
    category_improved,
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

def _sync_webpush(subscription_info: dict, payload: dict) -> dict[str, Any]:
    """Execute synchronous webpush call with detailed status reporting."""
    if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_PUBLIC_KEY:
        logger.warning("VAPID keys not configured; cannot send push notification")
        return {
            "success": False,
            "status_code": None,
            "error_type": "unconfigured",
            "error_message": "VAPID keys are not configured on the server",
        }

    try:
        resp = webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_CLAIM_EMAIL or "mailto:admin@aeris.app"},
            timeout=10.0,
        )
        status_code = getattr(resp, "status_code", 200)
        logger.info("WebPush dispatched successfully (HTTP %s) to %s...", status_code, subscription_info.get("endpoint", "")[:45])
        return {
            "success": True,
            "status_code": status_code,
            "error_type": None,
            "error_message": None,
        }
    except WebPushException as exc:
        status_code = getattr(exc.response, "status_code", None) if hasattr(exc, "response") and exc.response is not None else None
        resp_text = getattr(exc.response, "text", str(exc)) if hasattr(exc, "response") and exc.response is not None else str(exc)
        is_expired = status_code in (404, 410)
        logger.warning("WebPush failed (HTTP %s): %s", status_code, resp_text)
        return {
            "success": False,
            "status_code": status_code,
            "error_type": "expired" if is_expired else "rejected",
            "error_message": f"Push service rejected delivery (HTTP {status_code}): {resp_text}",
        }
    except requests.exceptions.RequestException as req_err:
        logger.warning("WebPush network/connection error: %s", req_err)
        return {
            "success": False,
            "status_code": None,
            "error_type": "network_error",
            "error_message": f"Network error contacting browser push service: {req_err}",
        }
    except Exception as exc:
        logger.exception("Unexpected error sending push notification: %s", exc)
        return {
            "success": False,
            "status_code": None,
            "error_type": "unexpected",
            "error_message": f"Unexpected push error: {exc}",
        }


async def send_push_notification_async(subscription_info: dict, payload: dict) -> dict[str, Any]:
    """Asynchronously send push notification without blocking event loop."""
    return await asyncio.to_thread(_sync_webpush, subscription_info, payload)


def send_push_notification(subscription_info: dict, payload: dict) -> bool:
    """Synchronous backwards-compatible wrapper returning bool."""
    res = _sync_webpush(subscription_info, payload)
    return res["success"]


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
    standard: str = "us_epa",
) -> dict[str, Any] | None:
    """Fetch live AQI data under US EPA AQI standard.

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

    raw_us_aqi = raw.get("us_aqi_openmeteo")
    if raw_us_aqi is not None:
        aqi_val = int(round(float(raw_us_aqi)))
    else:
        # Fall back to US EPA calculation from pollutant concentrations if raw_us_aqi not present
        raw_pol = raw.get("raw", {})
        pollutants: dict[str, float] = {}
        for p in ("pm25", "pm10", "o3", "co", "so2", "no2"):
            if p in raw_pol and raw_pol[p] is not None:
                try:
                    pollutants[p] = float(raw_pol[p])
                except (ValueError, TypeError):
                    pass
        calc_res = calculate_aqi(pollutants)
        if calc_res.value is None:
            return None
        aqi_val = int(round(calc_res.value))

    cat, col = get_aqi_category(aqi_val)
    epa_subs = raw.get("epa_sub_indexes", {})
    primary = "pm25"
    if epa_subs:
        v_subs = {k: v for k, v in epa_subs.items() if v is not None}
        if v_subs:
            primary = max(v_subs, key=v_subs.get)
    health_advice = get_health_recommendation(aqi_val)

    return {
        "aqi": aqi_val,
        "category": cat,
        "primary_pollutant": primary,
        "health_advice": health_advice,
        "standard": "us_epa",
        "timestamp": measured_at_str or datetime.now(timezone.utc).isoformat(),
        "pollutants": raw.get("raw", {}),
        "sub_indexes": epa_subs,
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
    """
    logger.debug("Running daily push notification delivery check")

    async with async_session_factory() as session:
        try:
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

    # 2. Check in-memory tracker
    if _daily_sent_tracker.get(pref.id) == today_str:
        return

    # Check database deduplication key to survive server restarts
    dedup_key = f"daily:{pref.id}:{today_str}"
    hist_check = select(NotificationHistory.id).where(
        NotificationHistory.deduplication_key == dedup_key,
        NotificationHistory.delivery_status == "delivered",
    )
    existing_sent = (await session.execute(hist_check)).scalar_one_or_none()
    if existing_sent is not None:
        _daily_sent_tracker[pref.id] = today_str
        return

    # 3. Check if local time matches preferred time (HH:MM within 4-minute window)
    try:
        parts = pref.preferred_time.split(":")
        pref_h, pref_m = int(parts[0]), int(parts[1]) if len(parts) > 1 else 0
    except Exception:
        pref_h, pref_m = 8, 0

    current_mins = now_local.hour * 60 + now_local.minute
    pref_mins = pref_h * 60 + pref_m
    if abs(current_mins - pref_mins) > 4:
        return

    # 4. Resolve the user's saved default location
    user_id = pref.user_id or sub.user_id
    loc = None
    loc_id = None

    if user_id:
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

    # Fallback 1: location linked to preference
    if not loc and pref.location_id:
        loc = await session.get(Location, pref.location_id)
        loc_id = pref.location_id

    # Fallback 2: first location in database
    if not loc:
        loc_stmt = select(Location).order_by(Location.id.asc()).limit(1)
        loc = (await session.execute(loc_stmt)).scalars().first()
        if loc:
            loc_id = loc.id

    if not loc:
        logger.debug("No location found in database for pref %d, skipping daily briefing", pref.id)
        return

    # 5. Live AQI using US EPA standard
    aqi_data = await _fetch_live_aqi(loc.latitude, loc.longitude, "us_epa")
    if not aqi_data:
        logger.info("No valid AQI data for %s, skipping daily briefing", loc.name)
        return

    # 6. Select and render template
    template, tpl_idx = select_template(
        category=aqi_data["category"],
        standard="us_epa",
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
    push_res = await send_push_notification_async(sub_info, payload)
    success = push_res["success"]

    if success:
        _daily_sent_tracker[pref.id] = today_str
        delivery_status = "delivered"
        logger.info("Sent daily briefing to sub %d (%s, AQI %d)", sub.id, loc.name, aqi_data["aqi"])
    elif push_res.get("error_type") == "expired":
        delivery_status = "expired"
        await session.execute(
            update(NotificationSubscription)
            .where(NotificationSubscription.id == sub.id)
            .values(enabled=False)
        )
        await session.commit()
    else:
        delivery_status = "failed"

    # 9. Record in history
    await _record_history(
        session,
        user_id=user_id,
        location_id=loc_id,
        notification_type="daily_briefing",
        aqi_data=aqi_data,
        title=rendered["title"],
        body=rendered["body"],
        delivery_status=delivery_status,
        dedup_key=dedup_key,
        template_index=tpl_idx,
    )


# ──────────────────────────────────────────────────────────────────────
# High-pollution & Improvement alerts
# ──────────────────────────────────────────────────────────────────────

async def send_high_pollution_alerts() -> None:
    """Periodic job: check each user's default location and send an alert
    when the AQI category has worsened or significantly improved.
    """
    logger.debug("Running high-pollution alert check")

    async with async_session_factory() as session:
        try:
            stmt = (
                select(User, NotificationSubscription)
                .join(
                    NotificationSubscription,
                    NotificationSubscription.user_id == User.id,
                )
                .where(NotificationSubscription.enabled.is_(True))
            )
            results = (await session.execute(stmt)).all()

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
    """Handle a single user for high-pollution and air improvement alerts."""
    # 1. Find user's default saved location
    default_stmt = (
        select(SavedLocation)
        .where(
            SavedLocation.user_id == user.id,
            SavedLocation.is_default.is_(True),
        )
    )
    saved = (await session.execute(default_stmt)).scalars().first()
    loc = None
    if saved:
        loc = await session.get(Location, saved.location_id)

    # Fallback to any location linked in preferences
    if not loc:
        pref_stmt = select(NotificationPreference.location_id).where(
            NotificationPreference.user_id == user.id,
            NotificationPreference.location_id.is_not(None),
        )
        pref_loc_id = (await session.execute(pref_stmt)).scalars().first()
        if pref_loc_id:
            loc = await session.get(Location, pref_loc_id)

    if not loc:
        return

    # 2. Fetch live AQI (US EPA)
    aqi_data = await _fetch_live_aqi(loc.latitude, loc.longitude, "us_epa")
    if not aqi_data:
        return

    new_category = aqi_data["category"]

    # 3. Compare with last known category
    last = _alert_tracker.get(user.id)
    if last:
        old_category = last["category"]

        # Check cooldown
        last_alert_time = last.get("last_alert_at")
        if last_alert_time:
            elapsed = datetime.now(timezone.utc) - last_alert_time
            if elapsed < timedelta(hours=ALERT_COOLDOWN_HOURS):
                _alert_tracker[user.id]["category"] = new_category
                return

        should_send = False
        alert_type = "high_pollution_alert"
        tag = "aeris-high-pollution"

        if category_worsened(old_category, new_category, "us_epa"):
            should_send = True
            alert_type = "high_pollution_alert"
            tag = "aeris-high-pollution"
        elif category_improved(old_category, new_category, "us_epa"):
            should_send = True
            alert_type = "aqi_improvement"
            tag = "aeris-aqi-improvement"

        if should_send:
            template, tpl_idx = select_template(
                category=new_category,
                standard="us_epa",
                notification_type=alert_type,
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
                "tag": tag,
                "data": {
                    "url": f"/?lat={loc.latitude}&lon={loc.longitude}",
                    "aqi": aqi_data["aqi"],
                    "category": new_category,
                    "location": loc.name,
                },
            }

            sub_info = _build_sub_info(sub)
            push_res = await send_push_notification_async(sub_info, payload)
            success = push_res["success"]

            _alert_tracker[user.id] = {
                "category": new_category,
                "last_alert_at": datetime.now(timezone.utc),
            }

            dedup_key = f"{alert_type}:{user.id}:{datetime.now(timezone.utc).strftime('%Y-%m-%dT%H')}"

            if push_res.get("error_type") == "expired":
                delivery_status = "expired"
                await session.execute(
                    update(NotificationSubscription)
                    .where(NotificationSubscription.id == sub.id)
                    .values(enabled=False)
                )
                await session.commit()
            elif success:
                delivery_status = "delivered"
            else:
                delivery_status = "failed"

            await _record_history(
                session,
                user_id=user.id,
                location_id=loc.id,
                notification_type=alert_type,
                aqi_data=aqi_data,
                title=rendered["title"],
                body=rendered["body"],
                delivery_status=delivery_status,
                dedup_key=dedup_key,
                template_index=tpl_idx,
            )

            if success:
                logger.info(
                    "Sent %s to user %d (%s: %s -> %s, AQI %d)",
                    alert_type, user.id, loc.name, old_category, new_category, aqi_data["aqi"],
                )
        else:
            _alert_tracker[user.id]["category"] = new_category
    else:
        # First observation — store baseline
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
    standard: str | None = None,
) -> dict[str, Any]:
    """Send an immediate [TEST] push notification to verify delivery."""
    async with async_session_factory() as session:
        sub = None
        if endpoint:
            stmt = select(NotificationSubscription).where(
                NotificationSubscription.endpoint == endpoint
            )
            candidate = (await session.execute(stmt)).scalars().first()
            if candidate:
                if not candidate.enabled:
                    raise ValueError(
                        "This push subscription has expired or was disabled. Please click 'Re-enable Notifications' to register a fresh subscription."
                    )
                sub = candidate
            else:
                raise ValueError(
                    "This browser subscription is not registered on the server. Please click 'Enable Daily Notifications' to register it."
                )

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

        # Fetch real AQI data (US EPA standard)
        latitude = lat if lat is not None else 28.6139
        longitude = lon if lon is not None else 77.2090
        city = location_name or "Your Monitored City"

        aqi_data = await _fetch_live_aqi(latitude, longitude, "us_epa")

        if not aqi_data:
            raise RuntimeError(
                "Could not fetch live AQI data for the test notification. "
                "Please check your network connection and try again."
            )

        aqi_val = aqi_data["aqi"]
        category = aqi_data["category"]
        recommendation = aqi_data["health_advice"]

        payload = {
            "title": f"[TEST] AERIS — {city}",
            "body": f"Current AQI: {aqi_val} ({category}) [US EPA AQI]. {recommendation}",
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
        push_res = await send_push_notification_async(sub_info, payload)
        success = push_res["success"]

        if push_res.get("error_type") == "expired":
            sub.enabled = False
            await session.commit()
            delivery_status = "expired"
        elif success:
            delivery_status = "delivered"
        else:
            delivery_status = "failed"

        # Record test in history
        await _record_history(
            session,
            user_id=user_id,
            location_id=None,
            notification_type="test",
            aqi_data=aqi_data,
            title=payload["title"],
            body=payload["body"],
            delivery_status=delivery_status,
        )

        if not success:
            err_msg = push_res.get("error_message") or "Push delivery was rejected."
            raise RuntimeError(err_msg)

        return {
            "status": "delivered",
            "detail": f"[TEST] Push notification delivered: AQI {aqi_val} ({category}) [US EPA AQI] for {city}",
            "payload": payload,
        }
