"""Notification template library for AERIS (US EPA AQI Standard).

Provides at least 5 unique message templates per AQI category for the US EPA
AQI standard (6 categories: Good, Moderate, Unhealthy for Sensitive Groups,
Unhealthy, Very Unhealthy, Hazardous). Templates use dynamic fields that are
filled at delivery time.

Dynamic fields
--------------
{location}          – User's saved location name
{aqi}               – Current AQI value
{category}          – AQI category label
{timestamp}         – Human-readable measurement time
{primary_pollutant} – Dominant pollutant (e.g. PM2.5)
{health_advice}     – Official health guidance for the category
"""

from __future__ import annotations

import random
from dataclasses import dataclass

# ──────────────────────────────────────────────────────────────────────
# Template data structure
# ──────────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class NotificationTemplate:
    """A single notification template."""

    title: str
    body: str


# ──────────────────────────────────────────────────────────────────────
# US EPA AQI Templates (30 total — 5 per category)
# ──────────────────────────────────────────────────────────────────────

EPA_TEMPLATES: dict[str, list[NotificationTemplate]] = {
    "Good": [
        NotificationTemplate(
            title="AERIS — Good Air Quality in {location}",
            body="AQI is {aqi} (Good) in {location}. Air quality is satisfactory and poses little or no risk. Enjoy your outdoor activities.",
        ),
        NotificationTemplate(
            title="AERIS — {location} Air Quality Update",
            body="Current AQI in {location}: {aqi} (Good). The air is clean today. Enjoy outdoor exercise and activities.",
        ),
        NotificationTemplate(
            title="AERIS — Clean Air in {location}",
            body="{location} reports an AQI of {aqi}. Air quality is good. It is a great time to be active outside.",
        ),
        NotificationTemplate(
            title="AERIS — Daily Briefing for {location}",
            body="AQI is {aqi} (Good) in {location}. Air quality poses little or no health risk. Primary pollutant: {primary_pollutant}.",
        ),
        NotificationTemplate(
            title="AERIS — {location} AQI {aqi}",
            body="Air quality in {location} is Good (AQI {aqi}) as of {timestamp}. {health_advice}",
        ),
    ],
    "Moderate": [
        NotificationTemplate(
            title="AERIS — Moderate Air Quality in {location}",
            body="AQI is {aqi} (Moderate) in {location}. Air quality is acceptable. Unusually sensitive individuals should consider limiting prolonged outdoor exertion.",
        ),
        NotificationTemplate(
            title="AERIS — {location} Air Quality Advisory",
            body="Current AQI: {aqi} (Moderate) in {location}. People unusually sensitive to ozone or particle pollution should consider reducing outdoor exertion.",
        ),
        NotificationTemplate(
            title="AERIS — {location} Daily Briefing",
            body="{location} has moderate air quality with an AQI of {aqi}. Most people can continue normal activities. Primary pollutant: {primary_pollutant}.",
        ),
        NotificationTemplate(
            title="AERIS — Moderate Air Quality Notice",
            body="AQI in {location}: {aqi} (Moderate) as of {timestamp}. {health_advice}",
        ),
        NotificationTemplate(
            title="AERIS — {location} AQI {aqi}",
            body="Air quality in {location} is Moderate. Sensitive individuals should consider taking it easier if working or exercising outdoors.",
        ),
    ],
    "Unhealthy for Sensitive Groups": [
        NotificationTemplate(
            title="AERIS — Air Quality Advisory for {location}",
            body="AQI has reached {aqi} (Unhealthy for Sensitive Groups) in {location}. Children, older adults, and individuals with heart or lung disease should reduce prolonged outdoor exertion.",
        ),
        NotificationTemplate(
            title="AERIS — Sensitive Groups Advisory — {location}",
            body="Current AQI: {aqi} in {location}. Sensitive groups should limit heavy outdoor exertion. The general public is not likely to be affected. Primary pollutant: {primary_pollutant}.",
        ),
        NotificationTemplate(
            title="AERIS — {location} Air Quality Alert",
            body="AQI is {aqi} (Unhealthy for Sensitive Groups) in {location}. Take precautions if you have asthma or cardiovascular conditions.",
        ),
        NotificationTemplate(
            title="AERIS — {location} Daily Briefing",
            body="AQI in {location} stands at {aqi} (Unhealthy for Sensitive Groups) as of {timestamp}. {health_advice}",
        ),
        NotificationTemplate(
            title="AERIS — {location} AQI {aqi}",
            body="Air quality in {location} is unhealthy for sensitive groups. Reduce prolonged outdoor exertion if you are in a sensitive group.",
        ),
    ],
    "Unhealthy": [
        NotificationTemplate(
            title="AERIS — Unhealthy Air Quality in {location}",
            body="AQI is {aqi} (Unhealthy) in {location}. Everyone may begin to experience health effects. Reduce prolonged outdoor exertion. Primary pollutant: {primary_pollutant}.",
        ),
        NotificationTemplate(
            title="AERIS — {location} Air Quality Warning",
            body="Air quality in {location}: AQI {aqi} (Unhealthy). Members of sensitive groups may experience more serious health effects. Limit outdoor activities.",
        ),
        NotificationTemplate(
            title="AERIS — Unhealthy Air Quality Alert",
            body="{location} AQI has reached {aqi} (Unhealthy). Everyone should reduce prolonged outdoor exertion.",
        ),
        NotificationTemplate(
            title="AERIS — {location} Daily Briefing",
            body="AQI in {location}: {aqi} (Unhealthy) as of {timestamp}. {health_advice}",
        ),
        NotificationTemplate(
            title="AERIS — {location} AQI {aqi}",
            body="Unhealthy air quality in {location}. Active children and adults, and people with respiratory disease, should avoid prolonged outdoor exertion.",
        ),
    ],
    "Very Unhealthy": [
        NotificationTemplate(
            title="AERIS — Very Unhealthy Air Quality in {location}",
            body="AQI is {aqi} (Very Unhealthy) in {location}. Health alert: risk of health effects is increased for everyone. Avoid prolonged outdoor exertion. Primary pollutant: {primary_pollutant}.",
        ),
        NotificationTemplate(
            title="AERIS — Health Alert for {location}",
            body="Air quality in {location}: AQI {aqi} (Very Unhealthy). Everyone should avoid prolonged outdoor exertion. Active children and adults should avoid all outdoor exertion.",
        ),
        NotificationTemplate(
            title="AERIS — {location} Serious Air Quality Warning",
            body="{location} AQI is {aqi} (Very Unhealthy). The risk of health effects is increased for everyone. Stay indoors where possible.",
        ),
        NotificationTemplate(
            title="AERIS — Very Unhealthy Air Quality Alert",
            body="AQI in {location}: {aqi} (Very Unhealthy) as of {timestamp}. {health_advice}",
        ),
        NotificationTemplate(
            title="AERIS — {location} AQI {aqi}",
            body="Very unhealthy air quality in {location}. Avoid all outdoor physical activity. Keep windows closed and use air purifiers if available.",
        ),
    ],
    "Hazardous": [
        NotificationTemplate(
            title="AERIS — Hazardous Air Quality Alert for {location}",
            body="{location} is experiencing hazardous air quality with an AQI of {aqi}. Health warning of emergency conditions. Avoid all outdoor exertion and stay indoors.",
        ),
        NotificationTemplate(
            title="AERIS — Emergency Air Quality Warning — {location}",
            body="Air quality in {location} has reached AQI {aqi} (Hazardous). Everyone is likely to be affected. Remain indoors and avoid all outdoor exertion. Primary pollutant: {primary_pollutant}.",
        ),
        NotificationTemplate(
            title="AERIS — {location} Hazardous Pollution Alert",
            body="Hazardous air quality conditions in {location}. AQI: {aqi}. Do not engage in outdoor activities. Keep windows and doors closed.",
        ),
        NotificationTemplate(
            title="AERIS — Hazardous Air Quality in {location}",
            body="AQI in {location}: {aqi} (Hazardous) as of {timestamp}. {health_advice}",
        ),
        NotificationTemplate(
            title="AERIS — {location} AQI {aqi} — Hazardous",
            body="Hazardous air pollution in {location}. AQI is {aqi}. Everyone is more likely to be affected. Avoid all outdoor exertion and stay indoors.",
        ),
    ],
}

# ──────────────────────────────────────────────────────────────────────
# High-Pollution Alert Templates (category-worsened alerts)
# ──────────────────────────────────────────────────────────────────────

EPA_ALERT_TEMPLATES: dict[str, list[NotificationTemplate]] = {
    "Moderate": [
        NotificationTemplate(
            title="AERIS — Air Quality Advisory in {location}",
            body="Air quality in {location} has shifted to Moderate (AQI {aqi}). Sensitive groups should monitor their symptoms. Primary pollutant: {primary_pollutant}.",
        ),
    ],
    "Unhealthy for Sensitive Groups": [
        NotificationTemplate(
            title="AERIS — Air Quality Deteriorated in {location}",
            body="Air quality in {location} has worsened to Unhealthy for Sensitive Groups (AQI {aqi}). Sensitive groups should reduce outdoor exertion. Primary pollutant: {primary_pollutant}.",
        ),
    ],
    "Unhealthy": [
        NotificationTemplate(
            title="AERIS — Air Quality Warning for {location}",
            body="Air quality in {location} has reached Unhealthy levels (AQI {aqi}). Everyone should reduce prolonged outdoor exertion. Primary pollutant: {primary_pollutant}.",
        ),
    ],
    "Very Unhealthy": [
        NotificationTemplate(
            title="AERIS — Health Alert for {location}",
            body="Air quality in {location} has deteriorated to Very Unhealthy (AQI {aqi}). Avoid prolonged outdoor exertion. Primary pollutant: {primary_pollutant}.",
        ),
    ],
    "Hazardous": [
        NotificationTemplate(
            title="AERIS — Emergency Warning for {location}",
            body="Hazardous air quality emergency in {location} (AQI {aqi}). Avoid all outdoor activities and remain indoors. Primary pollutant: {primary_pollutant}.",
        ),
    ],
}

# ──────────────────────────────────────────────────────────────────────
# AQI Improvement Notification Templates
# ──────────────────────────────────────────────────────────────────────

EPA_IMPROVEMENT_TEMPLATES: dict[str, list[NotificationTemplate]] = {
    "Good": [
        NotificationTemplate(
            title="AERIS — Air Quality Improved in {location}",
            body="Great news: Air quality in {location} has improved to Good (AQI {aqi}). It is a wonderful time to enjoy the outdoors.",
        ),
        NotificationTemplate(
            title="AERIS — Fresh Air Returns to {location}",
            body="Air quality in {location} has cleared up to Good (AQI {aqi}). Safe conditions for all outdoor physical activities.",
        ),
    ],
    "Moderate": [
        NotificationTemplate(
            title="AERIS — Air Quality Improving in {location}",
            body="Air quality in {location} has improved to Moderate (AQI {aqi}). Conditions have significantly improved from previous elevated pollution levels.",
        ),
    ],
}

# ──────────────────────────────────────────────────────────────────────
# Severity ordering for threshold comparison
# ──────────────────────────────────────────────────────────────────────

EPA_SEVERITY_ORDER: list[str] = [
    "Good",
    "Moderate",
    "Unhealthy for Sensitive Groups",
    "Unhealthy",
    "Very Unhealthy",
    "Hazardous",
]


def get_severity_index(category: str, standard: str = "us_epa") -> int:
    """Return 0-based severity index for the US EPA category, or -1 if unknown."""
    try:
        return EPA_SEVERITY_ORDER.index(category)
    except ValueError:
        return -1


def category_worsened(old_category: str, new_category: str, standard: str = "us_epa") -> bool:
    """Return ``True`` if *new_category* is strictly worse (higher index) than *old_category*."""
    old_idx = get_severity_index(old_category)
    new_idx = get_severity_index(new_category)
    if old_idx < 0 or new_idx < 0:
        return False
    return new_idx > old_idx


def category_improved(old_category: str, new_category: str, standard: str = "us_epa") -> bool:
    """Return ``True`` if *new_category* is strictly better (lower index) than *old_category*."""
    old_idx = get_severity_index(old_category)
    new_idx = get_severity_index(new_category)
    if old_idx < 0 or new_idx < 0:
        return False
    return new_idx < old_idx


# ──────────────────────────────────────────────────────────────────────
# Anti-repetition: track last template index per user per type
# ──────────────────────────────────────────────────────────────────────

_last_template_index: dict[tuple[int, str, str], int] = {}


def select_template(
    category: str,
    standard: str = "us_epa",
    notification_type: str = "daily_briefing",
    user_id: int = 0,
) -> tuple[NotificationTemplate, int]:
    """Pick a US EPA template for the given category, avoiding the last-used template.

    Parameters
    ----------
    category:
        AQI category string.
    standard:
        Ignored / always US EPA.
    notification_type:
        ``"daily_briefing"``, ``"high_pollution_alert"``, or ``"aqi_improvement"``.
    user_id:
        Used for anti-repetition tracking.

    Returns
    -------
    (template, index) — the selected template and its index in the list.
    """
    if notification_type == "high_pollution_alert":
        templates_map = EPA_ALERT_TEMPLATES
    elif notification_type == "aqi_improvement":
        templates_map = EPA_IMPROVEMENT_TEMPLATES
    else:
        templates_map = EPA_TEMPLATES

    templates = templates_map.get(category)
    if not templates:
        fallback = "Moderate"
        templates = templates_map.get(fallback, [])
    if not templates:
        return NotificationTemplate(
            title="AERIS — {location} Air Quality Update",
            body="Current AQI in {location}: {aqi} ({category}) [US EPA AQI]. {health_advice}",
        ), 0

    key = (user_id, notification_type, category)
    last_idx = _last_template_index.get(key, -1)

    available = [i for i in range(len(templates)) if i != last_idx]
    if not available:
        available = list(range(len(templates)))

    idx = random.choice(available)
    _last_template_index[key] = idx
    return templates[idx], idx


def render_template(
    template: NotificationTemplate,
    location: str,
    aqi: int,
    category: str,
    timestamp: str,
    primary_pollutant: str,
    health_advice: str,
) -> dict[str, str]:
    """Fill template fields and return ``{"title": ..., "body": ...}``."""
    fields = {
        "location": location,
        "aqi": str(aqi),
        "category": category,
        "timestamp": timestamp,
        "primary_pollutant": primary_pollutant or "PM2.5",
        "health_advice": health_advice,
    }
    title = template.title
    body = template.body
    for key, val in fields.items():
        title = title.replace("{" + key + "}", val)
        body = body.replace("{" + key + "}", val)
    return {"title": title, "body": body}
