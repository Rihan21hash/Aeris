"""User ORM model."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    firebase_uid: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255))
    display_name: Mapped[str | None] = mapped_column(String(255))
    photo_url: Mapped[str | None] = mapped_column(String(512))
    timezone: Mapped[str | None] = mapped_column(String(64), default="UTC")
    preferred_aqi_standard: Mapped[str] = mapped_column(String(16), default="us_epa")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # ── Relationships ─────────────────────────────────────────────────
    saved_locations: Mapped[list["SavedLocation"]] = relationship(  # noqa: F821
        "SavedLocation",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    notification_preferences: Mapped[list["NotificationPreference"]] = relationship(  # noqa: F821
        "NotificationPreference",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    notification_subscriptions: Mapped[list["NotificationSubscription"]] = relationship(  # noqa: F821
        "NotificationSubscription",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
