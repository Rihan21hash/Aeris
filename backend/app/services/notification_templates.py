"""Notification template library for AERIS.

Provides at least 5 unique message templates per AQI category for both
CPCB NAQI (6 categories) and US EPA (6 categories).  Templates use
dynamic fields that are filled at delivery time.

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
# CPCB NAQI Templates  (30 total — 5 per category)
# ──────────────────────────────────────────────────────────────────────

CPCB_TEMPLATES: dict[str, list[NotificationTemplate]] = {
    "Good": [
        NotificationTemplate(
            title="AERIS — Good Air Quality in {location}",
            body="AQI is {aqi} (Good) in {location}. Air quality is excellent with minimal health impact. Enjoy your outdoor activities.",
        ),
        NotificationTemplate(
            title="AERIS — {location} Air Quality Update",
            body="Current AQI in {location}: {aqi} (Good). The air is clean and poses no health risk. A great day to be outdoors.",
        ),
        NotificationTemplate(
            title="AERIS — Fresh Air in {location}",
            body="{location} reports an AQI of {aqi}. Air quality is good. No precautions necessary for outdoor activities.",
        ),
        NotificationTemplate(
            title="AERIS — Daily Briefing for {location}",
            body="Good news for {location}: AQI is {aqi}. Air quality poses minimal impact on health. Primary pollutant: {primary_pollutant}.",
        ),
        NotificationTemplate(
            title="AERIS — {location} AQI {aqi}",
            body="Air quality in {location} is Good (AQI {aqi}) as of {timestamp}. {health_advice}",
        ),
    ],
    "Satisfactory": [
        NotificationTemplate(
            title="AERIS — Satisfactory Air Quality in {location}",
            body="AQI is {aqi} (Satisfactory) in {location}. Minor breathing discomfort possible for sensitive individuals. Primary pollutant: {primary_pollutant}.",
        ),
        NotificationTemplate(
            title="AERIS — {location} Air Quality Update",
            body="Current AQI in {location}: {aqi} (Satisfactory). Sensitive individuals should consider limiting heavy outdoor exertion.",
        ),
        NotificationTemplate(
            title="AERIS — {location} Daily Briefing",
            body="{location} AQI is {aqi}. Air quality is satisfactory. Those with respiratory conditions may want to take mild precautions.",
        ),
        NotificationTemplate(
            title="AERIS — Air Quality Notice for {location}",
            body="AQI in {location} stands at {aqi} (Satisfactory) as of {timestamp}. {health_advice}",
        ),
        NotificationTemplate(
            title="AERIS — {location} AQI {aqi}",
            body="Air quality in {location} is Satisfactory. People sensitive to air pollution should limit prolonged heavy outdoor activity.",
        ),
    ],
    "Moderate": [
        NotificationTemplate(
            title="AERIS — Moderate Air Quality in {location}",
            body="AQI is {aqi} (Moderate) in {location}. Sensitive groups should limit prolonged outdoor exertion. Primary pollutant: {primary_pollutant}.",
        ),
        NotificationTemplate(
            title="AERIS — {location} Air Quality Advisory",
            body="Current AQI: {aqi} (Moderate) in {location}. People with lung or heart conditions, children, and older adults should reduce prolonged outdoor exertion.",
        ),
        NotificationTemplate(
            title="AERIS — {location} Daily Briefing",
            body="{location} is experiencing moderate air quality with an AQI of {aqi}. Consider reducing outdoor exercise if you are in a sensitive group.",
        ),
        NotificationTemplate(
            title="AERIS — Moderate Air Quality Alert",
            body="AQI in {location}: {aqi} (Moderate) as of {timestamp}. {health_advice}",
        ),
        NotificationTemplate(
            title="AERIS — {location} AQI {aqi}",
            body="Air quality in {location} is Moderate. Breathing discomfort possible for people with asthma or heart conditions. Take appropriate precautions.",
        ),
    ],
    "Poor": [
        NotificationTemplate(
            title="AERIS — Poor Air Quality in {location}",
            body="AQI is {aqi} (Poor) in {location}. Avoid prolonged outdoor exertion. Use air purifiers indoors. Primary pollutant: {primary_pollutant}.",
        ),
        NotificationTemplate(
            title="AERIS — {location} Air Quality Warning",
            body="Air quality in {location} has deteriorated to AQI {aqi} (Poor). People with respiratory or cardiac conditions should limit outdoor exposure.",
        ),
        NotificationTemplate(
            title="AERIS — Poor Air Quality Alert",
            body="{location} AQI: {aqi} (Poor). Most people may experience breathing discomfort on prolonged exposure. Limit time outdoors.",
        ),
        NotificationTemplate(
            title="AERIS — {location} Daily Briefing",
            body="AQI in {location} is {aqi} (Poor) as of {timestamp}. {health_advice}",
        ),
        NotificationTemplate(
            title="AERIS — {location} AQI {aqi}",
            body="Poor air quality conditions in {location}. Avoid extended outdoor activities and consider wearing a mask if outdoor exposure is unavoidable.",
        ),
    ],
    "Very Poor": [
        NotificationTemplate(
            title="AERIS — Very Poor Air Quality in {location}",
            body="AQI is {aqi} (Very Poor) in {location}. Avoid prolonged outdoor exertion. Use a well-fitting mask if outdoor exposure is unavoidable. Primary pollutant: {primary_pollutant}.",
        ),
        NotificationTemplate(
            title="AERIS — Severe Air Quality Warning for {location}",
            body="Air quality in {location} has reached AQI {aqi} (Very Poor). Respiratory illness possible on prolonged exposure. Stay indoors where possible.",
        ),
        NotificationTemplate(
            title="AERIS — {location} Health Advisory",
            body="{location} AQI is {aqi} (Very Poor). Avoid outdoor activities and keep windows closed. Use air purifiers if available.",
        ),
        NotificationTemplate(
            title="AERIS — Very Poor Air Quality Alert",
            body="AQI in {location}: {aqi} (Very Poor) as of {timestamp}. {health_advice}",
        ),
        NotificationTemplate(
            title="AERIS — {location} AQI {aqi}",
            body="Very poor air quality in {location}. Outdoor physical activity should be avoided. Protect yourself with an N95 or equivalent mask if going outside.",
        ),
    ],
    "Severe": [
        NotificationTemplate(
            title="AERIS — Severe Air Quality Alert for {location}",
            body="{location} is currently experiencing an AQI of {aqi} (Severe). Air pollution levels are extremely high. Avoid outdoor physical activities, remain indoors where possible, and use a well-fitting N95 or equivalent mask if going outside.",
        ),
        NotificationTemplate(
            title="AERIS — Emergency Air Quality Warning — {location}",
            body="Air quality in {location} has reached AQI {aqi} (Severe). Stay indoors where possible and reduce exposure to outdoor air. Primary pollutant: {primary_pollutant}.",
        ),
        NotificationTemplate(
            title="AERIS — {location} Severe Pollution Alert",
            body="A serious air quality condition is affecting {location}. Current AQI: {aqi}. Avoid outdoor exercise and protect yourself with an N95 or equivalent mask if going outside.",
        ),
        NotificationTemplate(
            title="AERIS — Severe Air Quality in {location}",
            body="AQI in {location}: {aqi} (Severe) as of {timestamp}. {health_advice}",
        ),
        NotificationTemplate(
            title="AERIS — {location} AQI {aqi} — Severe",
            body="Severe air pollution in {location}. AQI is {aqi}. Healthy people may be affected and those with existing conditions face serious risk. Avoid all outdoor physical activities and remain indoors.",
        ),
    ],
}


# ──────────────────────────────────────────────────────────────────────
# US EPA Templates  (30 total — 5 per category)
# ──────────────────────────────────────────────────────────────────────

EPA_TEMPLATES: dict[str, list[NotificationTemplate]] = {
    "Good": [
        NotificationTemplate(
            title="AERIS — Good Air Quality in {location}",
            body="AQI is {aqi} (Good) in {location}. Air quality is satisfactory and poses little or no risk. Enjoy your outdoor activities.",
        ),
        NotificationTemplate(
            title="AERIS — {location} Air Quality Update",
            body="Current AQI in {location}: {aqi} (Good). The air is clean. No precautions are necessary.",
        ),
        NotificationTemplate(
            title="AERIS — Clean Air in {location}",
            body="{location} reports an AQI of {aqi}. Air quality is good with minimal pollution. A great day to be outside.",
        ),
        NotificationTemplate(
            title="AERIS — Daily Briefing for {location}",
            body="Good news for {location}: AQI is {aqi}. Air pollution poses little or no risk. Primary pollutant: {primary_pollutant}.",
        ),
        NotificationTemplate(
            title="AERIS — {location} AQI {aqi}",
            body="Air quality in {location} is Good (AQI {aqi}) as of {timestamp}. {health_advice}",
        ),
    ],
    "Moderate": [
        NotificationTemplate(
            title="AERIS — Moderate Air Quality in {location}",
            body="AQI is {aqi} (Moderate) in {location}. Air quality is acceptable but may pose a risk for unusually sensitive people. Primary pollutant: {primary_pollutant}.",
        ),
        NotificationTemplate(
            title="AERIS — {location} Air Quality Update",
            body="Current AQI: {aqi} (Moderate) in {location}. Unusually sensitive individuals should consider reducing prolonged outdoor exertion.",
        ),
        NotificationTemplate(
            title="AERIS — {location} Daily Briefing",
            body="{location} AQI is {aqi} (Moderate). Air quality is acceptable for most people. Those sensitive to air pollution should take mild precautions.",
        ),
        NotificationTemplate(
            title="AERIS — Moderate Air Quality Notice",
            body="AQI in {location}: {aqi} (Moderate) as of {timestamp}. {health_advice}",
        ),
        NotificationTemplate(
            title="AERIS — {location} AQI {aqi}",
            body="Moderate air quality in {location}. Most people are unlikely to be affected. Sensitive individuals may want to limit prolonged outdoor exertion.",
        ),
    ],
    "Unhealthy for Sensitive Groups": [
        NotificationTemplate(
            title="AERIS — USG Air Quality in {location}",
            body="AQI is {aqi} (Unhealthy for Sensitive Groups) in {location}. Sensitive groups should reduce prolonged outdoor exertion. Primary pollutant: {primary_pollutant}.",
        ),
        NotificationTemplate(
            title="AERIS — {location} Air Quality Advisory",
            body="Air quality in {location} has reached AQI {aqi}. Members of sensitive groups may experience health effects. General public is less likely to be affected.",
        ),
        NotificationTemplate(
            title="AERIS — {location} Daily Briefing",
            body="{location} AQI: {aqi} (Unhealthy for Sensitive Groups). People with heart or lung disease, older adults, and children should limit prolonged outdoor exertion.",
        ),
        NotificationTemplate(
            title="AERIS — Sensitive Groups Advisory",
            body="AQI in {location}: {aqi} (Unhealthy for Sensitive Groups) as of {timestamp}. {health_advice}",
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

CPCB_ALERT_TEMPLATES: dict[str, list[NotificationTemplate]] = {
    "Moderate": [
        NotificationTemplate(
            title="AERIS — Air Quality Deteriorated in {location}",
            body="Air quality in {location} has worsened to Moderate (AQI {aqi}). Sensitive groups should limit prolonged outdoor exertion. Primary pollutant: {primary_pollutant}.",
        ),
    ],
    "Poor": [
        NotificationTemplate(
            title="AERIS — Air Quality Alert for {location}",
            body="Air quality in {location} has deteriorated to Poor (AQI {aqi}). Avoid prolonged outdoor exposure. Primary pollutant: {primary_pollutant}.",
        ),
    ],
    "Very Poor": [
        NotificationTemplate(
            title="AERIS — Air Quality Worsening in {location}",
            body="Air quality in {location} has worsened to Very Poor (AQI {aqi}). Avoid outdoor activities and use a mask if going outside. Primary pollutant: {primary_pollutant}.",
        ),
    ],
    "Severe": [
        NotificationTemplate(
            title="AERIS — Severe Air Quality Alert for {location}",
            body="Air quality in {location} has deteriorated to Severe (AQI {aqi}). Avoid all outdoor physical activities and remain indoors. Primary pollutant: {primary_pollutant}.",
        ),
    ],
}

EPA_ALERT_TEMPLATES: dict[str, list[NotificationTemplate]] = {
    "Unhealthy for Sensitive Groups": [
        NotificationTemplate(
            title="AERIS — Air Quality Deteriorated in {location}",
            body="Air quality in {location} has worsened to Unhealthy for Sensitive Groups (AQI {aqi}). Sensitive groups should reduce outdoor exertion. Primary pollutant: {primary_pollutant}.",
        ),
    ],
    "Unhealthy": [
        NotificationTemplate(
            title="AERIS — Air Quality Alert for {location}",
            body="Air quality in {location} has deteriorated to Unhealthy (AQI {aqi}). Reduce prolonged outdoor exertion. Primary pollutant: {primary_pollutant}.",
        ),
    ],
    "Very Unhealthy": [
        NotificationTemplate(
            title="AERIS — Air Quality Worsening in {location}",
            body="Air quality in {location} has worsened to Very Unhealthy (AQI {aqi}). Avoid prolonged outdoor exertion. Primary pollutant: {primary_pollutant}.",
        ),
    ],
    "Hazardous": [
        NotificationTemplate(
            title="AERIS — Hazardous Air Quality Alert for {location}",
            body="Air quality in {location} has reached Hazardous (AQI {aqi}). Avoid all outdoor exertion and stay indoors. Primary pollutant: {primary_pollutant}.",
        ),
    ],
}


# ──────────────────────────────────────────────────────────────────────
# Category severity ranking (lower index = better)
# ──────────────────────────────────────────────────────────────────────

CPCB_SEVERITY_ORDER: list[str] = [
    "Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe",
]

EPA_SEVERITY_ORDER: list[str] = [
    "Good", "Moderate", "Unhealthy for Sensitive Groups",
    "Unhealthy", "Very Unhealthy", "Hazardous",
]


def get_severity_index(category: str, standard: str) -> int:
    """Return a numeric severity index (0 = best).  Returns -1 if unknown."""
    order = CPCB_SEVERITY_ORDER if standard == "cpcb_naqi" else EPA_SEVERITY_ORDER
    try:
        return order.index(category)
    except ValueError:
        return -1


def category_worsened(old_category: str, new_category: str, standard: str) -> bool:
    """Return ``True`` if *new_category* is strictly worse than *old_category*."""
    old_idx = get_severity_index(old_category, standard)
    new_idx = get_severity_index(new_category, standard)
    if old_idx < 0 or new_idx < 0:
        return False
    return new_idx > old_idx


# ──────────────────────────────────────────────────────────────────────
# Anti-repetition: track last template index per user per type
# ──────────────────────────────────────────────────────────────────────

# In-memory tracker: {(user_id, notification_type, category): last_index}
_last_template_index: dict[tuple[int, str, str], int] = {}


def select_template(
    category: str,
    standard: str,
    notification_type: str = "daily_briefing",
    user_id: int = 0,
) -> tuple[NotificationTemplate, int]:
    """Pick a template for the given category, avoiding the last-used template.

    Parameters
    ----------
    category:
        AQI category string.
    standard:
        ``"cpcb_naqi"`` or ``"us_epa"``.
    notification_type:
        ``"daily_briefing"`` or ``"high_pollution_alert"``.
    user_id:
        Used for anti-repetition tracking.

    Returns
    -------
    (template, index) — the selected template and its index in the list.
    """
    if notification_type == "high_pollution_alert":
        templates_map = CPCB_ALERT_TEMPLATES if standard == "cpcb_naqi" else EPA_ALERT_TEMPLATES
    else:
        templates_map = CPCB_TEMPLATES if standard == "cpcb_naqi" else EPA_TEMPLATES

    templates = templates_map.get(category)
    if not templates:
        # Fallback to Moderate / the middle category
        fallback = "Moderate"
        templates = templates_map.get(fallback, [])
    if not templates:
        # Ultimate fallback
        return NotificationTemplate(
            title="AERIS — {location} Air Quality Update",
            body="Current AQI in {location}: {aqi} ({category}). {health_advice}",
        ), 0

    key = (user_id, notification_type, category)
    last_idx = _last_template_index.get(key, -1)

    # Choose a random index that differs from the last one used
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

