"""AQI breakpoint tables for US EPA and Indian CPCB NAQI standards.

Each entry is a tuple of (C_low, C_high, I_low, I_high) where:
  - C_low / C_high are the concentration breakpoints.
  - I_low / I_high are the corresponding AQI index breakpoints.

Units differ between standards – see inline comments.
"""

from __future__ import annotations

# ──────────────────────────────────────────────────────────────────────
# US EPA AQI Breakpoints
# Reference: 40 CFR Part 58, App. G
# ──────────────────────────────────────────────────────────────────────

EPA_PM25_BREAKPOINTS: list[tuple[float, float, int, int]] = [
    # (C_low µg/m³, C_high µg/m³, I_low, I_high)  — 24-hour average
    (0.0, 12.0, 0, 50),
    (12.1, 35.4, 51, 100),
    (35.5, 55.4, 101, 150),
    (55.5, 150.4, 151, 200),
    (150.5, 250.4, 201, 300),
    (250.5, 350.4, 301, 400),
    (350.5, 500.4, 401, 500),
]

EPA_PM10_BREAKPOINTS: list[tuple[float, float, int, int]] = [
    # µg/m³ — 24-hour average
    (0, 54, 0, 50),
    (55, 154, 51, 100),
    (155, 254, 101, 150),
    (255, 354, 151, 200),
    (355, 424, 201, 300),
    (425, 504, 301, 400),
    (505, 604, 401, 500),
]

EPA_O3_BREAKPOINTS: list[tuple[float, float, int, int]] = [
    # ppm — 8-hour average
    (0.000, 0.054, 0, 50),
    (0.055, 0.070, 51, 100),
    (0.071, 0.085, 101, 150),
    (0.086, 0.105, 151, 200),
    (0.106, 0.200, 201, 300),
]

EPA_CO_BREAKPOINTS: list[tuple[float, float, int, int]] = [
    # ppm — 8-hour average
    (0.0, 4.4, 0, 50),
    (4.5, 9.4, 51, 100),
    (9.5, 12.4, 101, 150),
    (12.5, 15.4, 151, 200),
    (15.5, 30.4, 201, 300),
    (30.5, 40.4, 301, 400),
    (40.5, 50.4, 401, 500),
]

EPA_SO2_BREAKPOINTS: list[tuple[float, float, int, int]] = [
    # ppb — 1-hour average
    (0, 35, 0, 50),
    (36, 75, 51, 100),
    (76, 185, 101, 150),
    (186, 304, 151, 200),
    (305, 604, 201, 300),
    (605, 804, 301, 400),
    (805, 1004, 401, 500),
]

EPA_NO2_BREAKPOINTS: list[tuple[float, float, int, int]] = [
    # ppb — 1-hour average
    (0, 53, 0, 50),
    (54, 100, 51, 100),
    (101, 360, 101, 150),
    (361, 649, 151, 200),
    (650, 1249, 201, 300),
    (1250, 1649, 301, 400),
    (1650, 2049, 401, 500),
]

EPA_BREAKPOINTS: dict[str, list[tuple[float, float, int, int]]] = {
    "pm25": EPA_PM25_BREAKPOINTS,
    "pm10": EPA_PM10_BREAKPOINTS,
    "o3": EPA_O3_BREAKPOINTS,
    "co": EPA_CO_BREAKPOINTS,
    "so2": EPA_SO2_BREAKPOINTS,
    "no2": EPA_NO2_BREAKPOINTS,
}

# ──────────────────────────────────────────────────────────────────────
# Indian CPCB National Air Quality Index (NAQI) Breakpoints
# Reference: CPCB National Air Quality Index (2014)
# NOTE: All gas concentrations are in µg/m³ or mg/m³ (NOT ppm/ppb).
# ──────────────────────────────────────────────────────────────────────

CPCB_PM25_BREAKPOINTS: list[tuple[float, float, int, int]] = [
    # µg/m³ — 24-hour average
    (0, 30, 0, 50),
    (31, 60, 51, 100),
    (61, 90, 101, 200),
    (91, 120, 201, 300),
    (121, 250, 301, 400),
    (251, 380, 401, 500),
]

CPCB_PM10_BREAKPOINTS: list[tuple[float, float, int, int]] = [
    # µg/m³ — 24-hour average
    (0, 50, 0, 50),
    (51, 100, 51, 100),
    (101, 250, 101, 200),
    (251, 350, 201, 300),
    (351, 430, 301, 400),
    (431, 510, 401, 500),
]

CPCB_SO2_BREAKPOINTS: list[tuple[float, float, int, int]] = [
    # µg/m³ — 24-hour average
    (0, 40, 0, 50),
    (41, 80, 51, 100),
    (81, 380, 101, 200),
    (381, 800, 201, 300),
    (801, 1600, 301, 400),
    (1601, 2100, 401, 500),
]

CPCB_NO2_BREAKPOINTS: list[tuple[float, float, int, int]] = [
    # µg/m³ — 24-hour average
    (0, 40, 0, 50),
    (41, 80, 51, 100),
    (81, 180, 101, 200),
    (181, 280, 201, 300),
    (281, 400, 301, 400),
    (401, 510, 401, 500),
]

CPCB_CO_BREAKPOINTS: list[tuple[float, float, int, int]] = [
    # mg/m³ — 8-hour average
    (0.0, 1.0, 0, 50),
    (1.1, 2.0, 51, 100),
    (2.1, 10.0, 101, 200),
    (10.1, 17.0, 201, 300),
    (17.1, 34.0, 301, 400),
    (34.1, 46.0, 401, 500),
]

CPCB_O3_BREAKPOINTS: list[tuple[float, float, int, int]] = [
    # µg/m³ — 8-hour average
    (0, 50, 0, 50),
    (51, 100, 51, 100),
    (101, 168, 101, 200),
    (169, 208, 201, 300),
    (209, 748, 301, 400),
    (749, 1000, 401, 500),
]

CPCB_BREAKPOINTS: dict[str, list[tuple[float, float, int, int]]] = {
    "pm25": CPCB_PM25_BREAKPOINTS,
    "pm10": CPCB_PM10_BREAKPOINTS,
    "o3": CPCB_O3_BREAKPOINTS,
    "co": CPCB_CO_BREAKPOINTS,
    "so2": CPCB_SO2_BREAKPOINTS,
    "no2": CPCB_NO2_BREAKPOINTS,
}

# ──────────────────────────────────────────────────────────────────────
# AQI Category Definitions
# ──────────────────────────────────────────────────────────────────────

EPA_CATEGORIES: list[tuple[int, int, str, str]] = [
    # (low, high, label, hex colour)
    (0, 50, "Good", "#00A651"),
    (51, 100, "Moderate", "#F5D000"),
    (101, 150, "Unhealthy for Sensitive Groups", "#FF8C00"),
    (151, 200, "Unhealthy", "#E53935"),
    (201, 300, "Very Unhealthy", "#8E44AD"),
    (301, 500, "Hazardous", "#7E0023"),
]

CPCB_CATEGORIES: list[tuple[int, int, str, str]] = [
    (0, 50, "Good", "#00A651"),
    (51, 100, "Satisfactory", "#84CF33"),
    (101, 200, "Moderate", "#F5D000"),
    (201, 300, "Poor", "#FF8C00"),
    (301, 400, "Very Poor", "#E53935"),
    (401, 500, "Severe", "#7E0023"),
]

# ──────────────────────────────────────────────────────────────────────
# Health Recommendations
# ──────────────────────────────────────────────────────────────────────

EPA_HEALTH_RECOMMENDATIONS: dict[str, str] = {
    "Good": (
        "Air quality is satisfactory, and air pollution poses little or no risk. "
        "Enjoy your usual outdoor activities."
    ),
    "Moderate": (
        "Air quality is acceptable. However, there may be a risk for some people, "
        "particularly those who are unusually sensitive to air pollution."
    ),
    "Unhealthy for Sensitive Groups": (
        "Members of sensitive groups may experience health effects. "
        "The general public is less likely to be affected. "
        "Reduce prolonged outdoor exertion if you are in a sensitive group."
    ),
    "Unhealthy": (
        "Some members of the general public may experience health effects; "
        "members of sensitive groups may experience more serious health effects. "
        "Reduce prolonged outdoor exertion."
    ),
    "Very Unhealthy": (
        "Health alert: The risk of health effects is increased for everyone. "
        "Avoid prolonged outdoor exertion."
    ),
    "Hazardous": (
        "Health warning of emergency conditions: everyone is more likely to "
        "be affected. Avoid all outdoor exertion and stay indoors."
    ),
}

CPCB_HEALTH_RECOMMENDATIONS: dict[str, str] = {
    "Good": (
        "Minimal impact on health. Enjoy outdoor activities."
    ),
    "Satisfactory": (
        "Minor breathing discomfort to sensitive people. "
        "Limit heavy outdoor exertion if you are sensitive."
    ),
    "Moderate": (
        "Breathing discomfort to people with lung disease such as asthma, "
        "and discomfort to people with heart disease, children, and older adults. "
        "Reduce prolonged outdoor exertion."
    ),
    "Poor": (
        "Breathing discomfort to most people on prolonged exposure. "
        "Avoid prolonged outdoor exertion; use air purifiers indoors."
    ),
    "Very Poor": (
        "Respiratory illness on prolonged exposure. "
        "Avoid outdoor activities and keep windows closed."
    ),
    "Severe": (
        "Affects healthy people and seriously impacts those with existing diseases. "
        "Avoid all outdoor physical activities and remain indoors."
    ),
}
