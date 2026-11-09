"""Authentication and user profile management via Firebase and PostgreSQL."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_db_user
from app.core.database import get_db
from app.core.security import get_current_user_required
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdateRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/sync", response_model=UserResponse)
async def sync_user(
    claims: dict[str, Any] = Depends(get_current_user_required),
    db: AsyncSession = Depends(get_db),
):
    """Synchronise a Firebase-authenticated user into the PostgreSQL database.

    Called after client-side Firebase login or registration. Creates the User
    record if it does not yet exist or updates email and display name if changed.
    """
    uid = claims.get("uid")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing uid in Firebase credentials.",
        )

    email = claims.get("email")
    display_name = claims.get("name") or (email.split("@")[0] if email else None)
    photo_url = claims.get("picture")

    stmt = select(User).where(User.firebase_uid == uid)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user:
        user = User(
            firebase_uid=uid,
            email=email,
            display_name=display_name,
            photo_url=photo_url,
            preferred_aqi_standard="us_epa",
            timezone="UTC",
        )
        db.add(user)
    else:
        # Update mutable fields if provided
        if email:
            user.email = email
        if display_name:
            user.display_name = display_name
        if photo_url:
            user.photo_url = photo_url

    await db.commit()
    await db.refresh(user)
    return user


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    user: User = Depends(get_current_db_user),
):
    """Return the profile of the currently authenticated user."""
    return user


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    body: UserUpdateRequest,
    user: User = Depends(get_current_db_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user preferences (display name, timezone, preferred AQI standard)."""
    if body.display_name is not None:
        user.display_name = body.display_name
    if body.timezone is not None:
        user.timezone = body.timezone
    if body.preferred_aqi_standard is not None:
        user.preferred_aqi_standard = body.preferred_aqi_standard

    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_current_user(
    user: User = Depends(get_current_db_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete the authenticated user's profile and all associated data."""
    await db.execute(delete(User).where(User.id == user.id))
    await db.commit()
    return None
