"""Pydantic schemas for AQI-related API responses."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class PollutantData(BaseModel):
    """Individual pollutant concentration and metadata."""

    name: str = Field(..., description="Pollutant identifier, e.g. 'pm25', 'o3'.")
    display_name: str = Field(..., description="Human-readable name.")
    concentration: float | None = Field(None, description="Raw concentration value.")
    unit: str = Field(..., description="Concentration unit, e.g. 'µg/m³', 'ppm'.")
    aqi_contribution: float | None = Field(None, description="Sub-index for this pollutant.")
    available: bool = Field(True, description="Whether data was available for this pollutant.")


class PollutantsResponse(BaseModel):
    """All pollutant readings for a location."""

    location_id: int
    pollutants: list[PollutantData]
    measured_at: datetime | None = None
    source: str | None = None


class AqiCurrentResponse(BaseModel):
    """Current AQI reading for a location."""

    aqi_value: float | None = Field(None, description="Calculated AQI value.")
    aqi_standard: str = Field("us_epa", description="AQI standard used for calculation.")
    category: str = Field(..., description="Human-readable category, e.g. 'Good'.")
    color: str = Field(..., description="Hex colour associated with the category.")
    primary_pollutant: str | None = Field(None, description="Dominant pollutant.")
    measurement_type: str = Field(..., description="'station' or 'model_estimate'.")
    source: str = Field(..., description="Data source identifier.")
    measured_at: datetime | None = None
    location_id: int | None = None
    location_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    pollutants: PollutantsResponse | None = None
    health_recommendation: str | None = None
    diagnostics: dict[str, Any] | None = Field(None, description="Developer diagnostic data for data origin transparency.")


class AqiHistoryPoint(BaseModel):
    """A single point in a historical AQI series."""

    timestamp: datetime
    aqi_value: float | None = None
    measurement_type: str | None = None
    source: str | None = None
    primary_pollutant: str | None = None


class AqiHistoryResponse(BaseModel):
    """Historical AQI data with metadata."""

    location_id: int
    time_range: str = Field(..., description="'24h' or '7d'.")
    total_records: int = 0
    data_completeness_note: str | None = None
    data: list[AqiHistoryPoint] = []


class AqiExtremesResponse(BaseModel):
    """Min / max / avg extremes over a time range."""

    location_id: int
    time_range: str
    max_aqi: float | None = None
    max_aqi_timestamp: datetime | None = None
    min_aqi: float | None = None
    min_aqi_timestamp: datetime | None = None
    avg_aqi: float | None = None


class HealthRecommendation(BaseModel):
    """AQI category with health guidance."""

    category: str
    color: str
    recommendation: str
