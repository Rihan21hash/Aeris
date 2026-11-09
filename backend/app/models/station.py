"""MonitoringStation ORM model."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class MonitoringStation(Base):
    __tablename__ = "monitoring_stations"

    id: Mapped[int] = mapped_column(primary_key=True)
    external_station_id: Mapped[str] = mapped_column(String(255), unique=True)
    source: Mapped[str] = mapped_column(String(64))  # "openaq", "cpcb"
    station_name: Mapped[str] = mapped_column(String(255))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    location_id: Mapped[int | None] = mapped_column(
        ForeignKey("locations.id"), nullable=True
    )
    country_code: Mapped[str | None] = mapped_column(String(8))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ─────────────────────────────────────────────────
    location: Mapped["Location | None"] = relationship(  # noqa: F821
        "Location", back_populates="stations"
    )
    readings: Mapped[list["AqiReading"]] = relationship(  # noqa: F821
        "AqiReading", back_populates="station", lazy="noload"
    )
