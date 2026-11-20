"""AQI calculation engine for the US EPA AQI standard.

Key public API
--------------
- ``calculate_aqi(pollutants)`` → ``AqiResult``
- ``calculate_sub_index(pollutant, concentration)`` → ``float | None``
- ``get_aqi_category(value)`` → ``(category, colour)``
- ``get_health_recommendation(value)`` → ``str``
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.utils.aqi_breakpoints import (
    EPA_BREAKPOINTS,
    EPA_CATEGORIES,
    EPA_HEALTH_RECOMMENDATIONS,
)


@dataclass
class AqiResult:
    """Result of a US EPA AQI calculation."""

    value: float | None = None
    category: str = "Unknown"
    color: str = "#999999"
    primary_pollutant: str | None = None
    sub_indexes: dict[str, float] = field(default_factory=dict)
    standard: str = "us_epa"


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
    """Calculate the US EPA sub-index for a single pollutant.

    Parameters
    ----------
    pollutant:
        One of ``pm25``, ``pm10``, ``o3``, ``co``, ``so2``, ``no2``.
    concentration:
        Pollutant concentration in the US EPA units:
        PM in µg/m³, O3/CO in ppm, SO2/NO2 in ppb.
    standard:
        Ignored / always US EPA standard.

    Returns
    -------
    float | None
        The computed sub-index, or ``None`` if the pollutant is unknown or
        the concentration is negative.
    """
    if concentration < 0:
        return None

    bp_list = EPA_BREAKPOINTS.get(pollutant)
    if bp_list is None:
        return None

    return _interpolate(concentration, bp_list)


def calculate_aqi(
    pollutants: dict[str, float],
    standard: str = "us_epa",
) -> AqiResult:
    """Calculate the overall US EPA AQI from a dict of pollutant concentrations.

    Parameters
    ----------
    pollutants:
        Mapping of pollutant name → concentration.
        PM in µg/m³, O3/CO in ppm, SO2/NO2 in ppb.
    standard:
        Always US EPA.
    """
    result = AqiResult(standard="us_epa")
    sub_indexes: dict[str, float] = {}

    for pollutant, concentration in pollutants.items():
        if concentration is None:
            continue
        si = calculate_sub_index(pollutant, concentration)
        if si is not None:
            sub_indexes[pollutant] = si

    result.sub_indexes = sub_indexes

    if not sub_indexes:
        result.category = "Insufficient Data"
        return result

    # Overall US EPA AQI = maximum sub-index
    primary = max(sub_indexes, key=sub_indexes.get)  # type: ignore[arg-type]
    result.value = round(sub_indexes[primary], 1)
    result.primary_pollutant = primary

    cat, color = get_aqi_category(result.value)
    result.category = cat
    result.color = color

    return result


def get_aqi_category(value: float | None, standard: str = "us_epa") -> tuple[str, str]:
    """Return ``(category_name, hex_color)`` for the given US EPA AQI value."""
    if value is None:
        return "Unknown", "#999999"
    for low, high, label, colour in EPA_CATEGORIES:
        if low <= value <= high:
            return label, colour
    # Beyond 500 or negative – fall back to the highest category
    if value > 500:
        return EPA_CATEGORIES[-1][2], EPA_CATEGORIES[-1][3]
    return "Unknown", "#999999"


def get_health_recommendation(value: float | None, standard: str = "us_epa") -> str:
    """Return a US EPA health recommendation string for the given AQI value."""
    if value is None:
        return "No recommendation available."
    category, _ = get_aqi_category(value)
    return EPA_HEALTH_RECOMMENDATIONS.get(category, "No recommendation available for this AQI level.")
