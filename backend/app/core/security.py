"""Firebase token verification and FastAPI authentication dependencies."""

from __future__ import annotations

import logging
from typing import Any

import firebase_admin
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth, credentials

from app.core.config import settings

logger = logging.getLogger(__name__)

_firebase_app: firebase_admin.App | None = None
_bearer_scheme = HTTPBearer(auto_error=False)


def _init_firebase() -> None:
    """Initialise the Firebase Admin SDK exactly once."""
    global _firebase_app
    if _firebase_app is not None:
        return

    try:
        if settings.FIREBASE_SERVICE_ACCOUNT_KEY_PATH:
            cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_KEY_PATH)
        else:
            cred = credentials.ApplicationDefault()

        _firebase_app = firebase_admin.initialize_app(
            cred,
            options={"projectId": settings.FIREBASE_PROJECT_ID} if settings.FIREBASE_PROJECT_ID else None,
        )
        logger.info("Firebase Admin SDK initialised successfully.")
    except Exception:
        logger.exception("Failed to initialise Firebase Admin SDK.")
        raise


def verify_firebase_token(token: str) -> dict[str, Any]:
    """Verify a Firebase ID token and return the decoded claims.

    Raises
    ------
    HTTPException
        401 if the token is invalid or expired.
    """
    _init_firebase()
    try:
        decoded = firebase_auth.verify_id_token(token)
        return decoded
    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase token has expired.",
        )
    except firebase_auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Firebase token.",
        )
    except Exception:
        logger.exception("Unexpected error verifying Firebase token.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials.",
        )


async def get_current_user_optional(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> dict[str, Any] | None:
    """Return decoded Firebase claims or ``None`` if no token was supplied."""
    if creds is None:
        return None
    try:
        return verify_firebase_token(creds.credentials)
    except HTTPException:
        return None


async def get_current_user_required(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> dict[str, Any]:
    """Return decoded Firebase claims; raise 401 when not authenticated."""
    if creds is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return verify_firebase_token(creds.credentials)
