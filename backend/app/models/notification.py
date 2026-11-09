"""Notification-related ORM models."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
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
