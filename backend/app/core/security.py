"""Firebase token verification and FastAPI authentication dependencies."""

from __future__ import annotations

import logging
import os
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt

from app.core.config import settings

logger = logging.getLogger(__name__)

_bearer_scheme = HTTPBearer(auto_error=False)

# Google public JWKS client for Firebase ID token verification
_GOOGLE_JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
_jwks_client: jwt.PyJWKClient | None = None
_firebase_admin_initialized = False


def _get_jwks_client() -> jwt.PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = jwt.PyJWKClient(_GOOGLE_JWKS_URL, cache_jwk_set=True, lifespan=3600)
    return _jwks_client


def _init_firebase_admin() -> bool:
    """Initialize Firebase Admin SDK if a valid service account file exists."""
    global _firebase_admin_initialized
    if _firebase_admin_initialized:
        return True

    key_path = settings.FIREBASE_SERVICE_ACCOUNT_KEY_PATH
    if key_path and os.path.exists(key_path):
        try:
            import firebase_admin
            from firebase_admin import credentials

            cred = credentials.Certificate(key_path)
            firebase_admin.initialize_app(
                cred,
                options={"projectId": settings.FIREBASE_PROJECT_ID} if settings.FIREBASE_PROJECT_ID else None,
            )
            _firebase_admin_initialized = True
            logger.info("Firebase Admin SDK initialised with service account.")
            return True
        except Exception:
            logger.exception("Failed to initialize Firebase Admin with service account.")
            return False
    return False


def verify_firebase_token(token: str) -> dict[str, Any]:
    """Verify a Firebase ID token and return decoded claims.

    First tries Firebase Admin SDK if service account is configured.
    Otherwise cryptographically verifies RS256 signature against Google's
    official public JWKS certificates and validates audience, issuer, and expiration.

    Raises
    ------
    HTTPException
        401 if the token is invalid or expired.
    """
    if not token or not isinstance(token, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token must be a non-empty string.",
        )

    # 1. Try Firebase Admin SDK if service account is present
    if _init_firebase_admin():
        try:
            from firebase_admin import auth as firebase_auth

            decoded = firebase_auth.verify_id_token(token)
            if "uid" not in decoded and "sub" in decoded:
                decoded["uid"] = decoded["sub"]
            return decoded
        except Exception as exc:
            logger.warning("Firebase Admin token verification failed: %s", exc)

    # 2. Cryptographic verification via Google Public JWKS (Standard OIDC)
    project_id = settings.FIREBASE_PROJECT_ID or "aeris-41aed"
    client = _get_jwks_client()

    try:
        signing_key = client.get_signing_key_from_jwt(token)
        decoded = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=project_id,
            issuer=f"https://securetoken.google.com/{project_id}",
            options={
                "verify_aud": True,
                "verify_iss": True,
                "verify_exp": True,
            },
        )

        # Standardize UID field
        uid = decoded.get("user_id") or decoded.get("sub") or decoded.get("uid")
        if not uid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token is missing required subject claim.",
            )

        decoded["uid"] = uid
        decoded["user_id"] = uid
        return decoded

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase token has expired.",
        )
    except jwt.InvalidAudienceError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token audience does not match project '{project_id}'.",
        )
    except jwt.InvalidIssuerError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token issuer is invalid.",
        )
    except jwt.PyJWTError as exc:
        logger.warning("JWT verification error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Firebase token.",
        )
    except Exception as exc:
        logger.exception("Unexpected error during token verification: %s", exc)
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
