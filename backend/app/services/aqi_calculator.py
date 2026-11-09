"""AQI calculation engine supporting US EPA and Indian CPCB NAQI standards.

Key public API
--------------
- ``calculate_aqi(pollutants, standard)`` → ``AqiResult``
- ``calculate_sub_index(pollutant, concentration, standard)`` → ``float | None``
- ``get_aqi_category(value, standard)`` → ``(category, colour)``
- ``get_health_recommendation(value, standard)`` → ``str``
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.utils.aqi_breakpoints import (
    CPCB_BREAKPOINTS,
    CPCB_CATEGORIES,
    CPCB_HEALTH_RECOMMENDATIONS,
    EPA_BREAKPOINTS,
    EPA_CATEGORIES,
    EPA_HEALTH_RECOMMENDATIONS,
)


@dataclass
class AqiResult:
    """Result of a full AQI calculation."""

    value: float | None = None
    category: str = "Unknown"
    color: str = "#999999"
    primary_pollutant: str | None = None
    sub_indexes: dict[str, float] = field(default_factory=dict)
    standard: str = "us_epa"


def _get_breakpoints(standard: str) -> dict[str, list[tuple[float, float, int, int]]]:
    if standard == "cpcb_naqi":
        return CPCB_BREAKPOINTS
    return EPA_BREAKPOINTS


def _interpolate(
    concentration: float,
    breakpoints: list[tuple[float, float, int, int]],
) -> float | None:
    """Apply the linear interpolation formula for a single pollutant.

    Returns ``None`` when the concentration exceeds every breakpoint range.
    """
    for c_low, c_high, i_low, i_high in breakpoints:
        if c_low <= concentration <= c_high:
            aqi = ((i_high - i_low) / (c_high - c_low)) * (concentration - c_low) + i_low
            return round(aqi, 1)

    # Concentration beyond highest breakpoint – cap at 500
    last = breakpoints[-1]
    if concentration > last[1]:
        return 500.0

    return None


def calculate_sub_index(
    pollutant: str,
    concentration: float,
    standard: str = "us_epa",
) -> float | None:
    """Calculate the sub-index for a single pollutant.

    Parameters
    ----------
    pollutant:
        One of ``pm25``, ``pm10``, ``o3``, ``co``, ``so2``, ``no2``.
    concentration:
        Pollutant concentration in the appropriate unit for the given standard.
        EPA: PM in µg/m³, O3/CO in ppm, SO2/NO2 in ppb.
        CPCB: PM in µg/m³, O3/SO2/NO2 in µg/m³, CO in mg/m³.
    standard:
        ``"us_epa"`` or ``"cpcb_naqi"``.

    Returns
    -------
    float | None
        The computed sub-index, or ``None`` if the pollutant is unknown or
        the concentration is negative.
    """
    if concentration < 0:
        return None

    bps = _get_breakpoints(standard)
    bp_list = bps.get(pollutant)
    if bp_list is None:
        return None

    return _interpolate(concentration, bp_list)


def calculate_aqi(
    pollutants: dict[str, float],
    standard: str = "us_epa",
) -> AqiResult:
    """Calculate the overall AQI from a dict of pollutant concentrations.

    Parameters
    ----------
    pollutants:
        Mapping of pollutant name → concentration.
        Concentrations must already be in the correct unit for the chosen
        ``standard``.
    standard:
        ``"us_epa"`` or ``"cpcb_naqi"``.
    """
    result = AqiResult(standard=standard)
    sub_indexes: dict[str, float] = {}

    for pollutant, concentration in pollutants.items():
        if concentration is None:
            continue
        si = calculate_sub_index(pollutant, concentration, standard)
        if si is not None:
            sub_indexes[pollutant] = si

    result.sub_indexes = sub_indexes

    if not sub_indexes:
        result.category = "Insufficient Data"
        return result

    # CPCB NAQI requires at least 3 pollutants, including PM2.5 or PM10
    if standard == "cpcb_naqi":
        has_pm = "pm25" in sub_indexes or "pm10" in sub_indexes
        if len(sub_indexes) < 3 or not has_pm:
            result.category = "Insufficient Data"
            result.value = None
            return result

    # Overall AQI = maximum sub-index
    primary = max(sub_indexes, key=sub_indexes.get)  # type: ignore[arg-type]
    result.value = round(sub_indexes[primary], 1)
    result.primary_pollutant = primary

    cat, color = get_aqi_category(result.value, standard)
    result.category = cat
    result.color = color

    return result


def get_aqi_category(value: float, standard: str = "us_epa") -> tuple[str, str]:
    """Return ``(category_name, hex_colour)`` for the given AQI value."""
    categories = CPCB_CATEGORIES if standard == "cpcb_naqi" else EPA_CATEGORIES
    for low, high, label, colour in categories:
        if low <= value <= high:
            return label, colour
    # Beyond 500 or negative – fall back to the highest category
    if value > 500:
        return categories[-1][2], categories[-1][3]
    return "Unknown", "#999999"


def get_health_recommendation(value: float, standard: str = "us_epa") -> str:
    """Return a health recommendation string for the given AQI value."""
    category, _ = get_aqi_category(value, standard)
    recs = CPCB_HEALTH_RECOMMENDATIONS if standard == "cpcb_naqi" else EPA_HEALTH_RECOMMENDATIONS
    return recs.get(category, "No recommendation available for this AQI level.")
