"""AqiReading ORM model."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class AqiReading(Base):
    __tablename__ = "aqi_readings"

    id: Mapped[int] = mapped_column(primary_key=True)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), index=True)
    station_id: Mapped[int | None] = mapped_column(
        ForeignKey("monitoring_stations.id"), nullable=True
    )
    source: Mapped[str] = mapped_column(String(64))  # "open_meteo", "openaq", "cpcb"
    measurement_type: Mapped[str] = mapped_column(String(32))  # "station", "model_estimate"
    aqi_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    aqi_standard: Mapped[str | None] = mapped_column(String(16), nullable=True)
    primary_pollutant: Mapped[str | None] = mapped_column(String(16), nullable=True)
    pm25: Mapped[float | None] = mapped_column(Float, nullable=True)
    pm10: Mapped[float | None] = mapped_column(Float, nullable=True)
    co: Mapped[float | None] = mapped_column(Float, nullable=True)
    no2: Mapped[float | None] = mapped_column(Float, nullable=True)
    so2: Mapped[float | None] = mapped_column(Float, nullable=True)
    o3: Mapped[float | None] = mapped_column(Float, nullable=True)
    measured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        Index("ix_readings_location_measured", "location_id", "measured_at"),
        UniqueConstraint(
            "location_id", "source", "measured_at", name="uq_reading_source_time"
        ),
    )

    # ── Relationships ─────────────────────────────────────────────────
    location: Mapped["Location"] = relationship(  # noqa: F821
        "Location", back_populates="readings"
    )
    station: Mapped["MonitoringStation | None"] = relationship(  # noqa: F821
        "MonitoringStation", back_populates="readings"
    )
