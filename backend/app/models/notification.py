"""Notification-related ORM models."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class NotificationSubscription(Base):
    __tablename__ = "notification_subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    endpoint: Mapped[str] = mapped_column(String(512), unique=True)
    p256dh_key: Mapped[str] = mapped_column(String(255))
    auth_key: Mapped[str] = mapped_column(String(255))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ─────────────────────────────────────────────────
    user: Mapped["User | None"] = relationship(  # noqa: F821
        "User", back_populates="notification_subscriptions"
    )
    preferences: Mapped[list["NotificationPreference"]] = relationship(
        "NotificationPreference",
        back_populates="subscription",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    subscription_id: Mapped[int] = mapped_column(
        ForeignKey("notification_subscriptions.id", ondelete="CASCADE")
    )
    location_id: Mapped[int | None] = mapped_column(
        ForeignKey("locations.id"), nullable=True
    )
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    preferred_time: Mapped[str] = mapped_column(String(5), default="08:00")  # HH:MM
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")
    frequency: Mapped[str] = mapped_column(String(16), default="daily")  # "daily", "weekly"
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ─────────────────────────────────────────────────
    user: Mapped["User | None"] = relationship(  # noqa: F821
        "User", back_populates="notification_preferences"
    )
    subscription: Mapped["NotificationSubscription"] = relationship(
        "NotificationSubscription", back_populates="preferences"
    )
    location: Mapped["Location | None"] = relationship("Location", lazy="selectin")  # noqa: F821


class NotificationHistory(Base):
    """Record of every notification delivery attempt."""

    __tablename__ = "notification_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    location_id: Mapped[int | None] = mapped_column(
        ForeignKey("locations.id", ondelete="SET NULL"), nullable=True
    )
    notification_type: Mapped[str] = mapped_column(
        String(32), default="daily_briefing"
    )  # daily_briefing | high_pollution_alert | test
    aqi_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    aqi_category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    aqi_standard: Mapped[str | None] = mapped_column(String(16), nullable=True)
    primary_pollutant: Mapped[str | None] = mapped_column(String(16), nullable=True)
    pollutant_values: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string
    data_source: Mapped[str | None] = mapped_column(String(32), default="open_meteo")
    data_timestamp: Mapped[str | None] = mapped_column(String(64), nullable=True)
    message_title: Mapped[str | None] = mapped_column(String(512), nullable=True)
    message_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    delivery_status: Mapped[str] = mapped_column(
        String(16), default="pending"
    )  # pending | delivered | failed | expired | skipped
    deduplication_key: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    template_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ─────────────────────────────────────────────────
    user: Mapped["User | None"] = relationship("User", lazy="selectin")  # noqa: F821
    location: Mapped["Location | None"] = relationship("Location", lazy="selectin")  # noqa: F821
