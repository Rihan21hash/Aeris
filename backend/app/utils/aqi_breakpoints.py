"""AQI breakpoint tables and category definitions for the US EPA AQI standard.

Each entry is a tuple of (C_low, C_high, I_low, I_high) where:
  - C_low / C_high are the concentration breakpoints.
  - I_low / I_high are the corresponding AQI index breakpoints.
Reference: US EPA 40 CFR Part 58, App. G
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
# US EPA AQI Category Definitions
# Colors aligned with official US EPA guidelines
# ──────────────────────────────────────────────────────────────────────

EPA_CATEGORIES: list[tuple[int, int, str, str]] = [
    # (low, high, label, hex color)
    (0, 50, "Good", "#00E400"),
    (51, 100, "Moderate", "#FFFF00"),
    (101, 150, "Unhealthy for Sensitive Groups", "#FF7E00"),
    (151, 200, "Unhealthy", "#FF0000"),
    (201, 300, "Very Unhealthy", "#8F3F97"),
    (301, 500, "Hazardous", "#7E0023"),
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
