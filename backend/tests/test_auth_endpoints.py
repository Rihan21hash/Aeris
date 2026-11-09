"""End-to-end integration tests for AERIS Firebase authentication and user synchronization."""

from __future__ import annotations

import asyncio
import os
import sys
import time
from unittest.mock import MagicMock

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.api.auth import router as auth_router
from app.core.database import init_db
import app.core.security as security_module


# Generate a test RSA key pair for cryptographic token verification
_PRIVATE_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_PUBLIC_KEY = _PRIVATE_KEY.public_key()
_PROJECT_ID = "aeris-41aed"


def create_test_token(uid: str, email: str, name: str, expires_in: int = 3600) -> str:
    now = int(time.time())
    claims = {
        "iss": f"https://securetoken.google.com/{_PROJECT_ID}",
        "aud": _PROJECT_ID,
        "sub": uid,
        "user_id": uid,
        "email": email,
        "name": name,
        "picture": "https://example.com/avatar.jpg",
        "iat": now,
        "exp": now + expires_in,
    }
    return jwt.encode(claims, _PRIVATE_KEY, algorithm="RS256", headers={"kid": "test-kid-1"})


async def run_auth_tests():
    print("Step 1: Initializing database tables...")
    await init_db()
    print("Database tables initialized successfully.")

    # Mock Google JWKS public key with our test key
    mock_signing_key = MagicMock()
    mock_signing_key.key = _PUBLIC_KEY
    mock_client = MagicMock()
    mock_client.get_signing_key_from_jwt.return_value = mock_signing_key
    security_module._jwks_client = mock_client

    test_app = FastAPI(title="Auth Test App")
    test_app.include_router(auth_router)

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test", timeout=10.0) as client:
        # 1. Unauthenticated access rejected
        print("Step 2: Testing unauthenticated access to /api/auth/me...")
        res = await client.get("/api/auth/me")
        assert res.status_code == 401, f"Expected 401, got {res.status_code}"
        print(" -> Passed: Unauthenticated request rejected with 401.")

        # 2. Malformed token rejected
        print("Step 3: Testing malformed token rejection...")
        res = await client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-valid-jwt"})
        assert res.status_code == 401, f"Expected 401, got {res.status_code}"
        assert "Invalid Firebase token" in res.json()["detail"]
        print(" -> Passed: Malformed token rejected with 401.")

        # 3. Expired token rejected
        print("Step 4: Testing expired token rejection...")
        expired_token = create_test_token("expired-user-1", "expired@aeris.org", "Expired User", expires_in=-60)
        res = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
        assert res.status_code == 401, f"Expected 401, got {res.status_code}"
        assert "expired" in res.json()["detail"].lower()
        print(" -> Passed: Expired token rejected with 401.")

        # 4. Sync new user
        print("Step 5: Testing new user synchronization via /api/auth/sync...")
        uid = f"user-{int(time.time())}"
        token = create_test_token(uid, f"{uid}@example.com", "Test Explorer")
        res = await client.post("/api/auth/sync", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        user_data = res.json()
        assert user_data["firebase_uid"] == uid
        assert user_data["email"] == f"{uid}@example.com"
        assert user_data["display_name"] == "Test Explorer"
        assert user_data["preferred_aqi_standard"] == "us_epa"
        print(f" -> Passed: User record created in database for UID={uid}.")

        # 5. Fetch profile for synced user
        print("Step 6: Testing current user profile retrieval via /api/auth/me...")
        res = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        assert res.json()["firebase_uid"] == uid
        print(" -> Passed: Authenticated profile fetched successfully.")

        # 6. Update profile preferences
        print("Step 7: Testing user preference update via PUT /api/auth/me...")
        res = await client.put(
            "/api/auth/me",
            json={
                "display_name": "Updated Explorer",
                "preferred_aqi_standard": "cpcb_naqi",
                "timezone": "Asia/Kolkata",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        updated = res.json()
        assert updated["display_name"] == "Updated Explorer"
        assert updated["preferred_aqi_standard"] == "cpcb_naqi"
        assert updated["timezone"] == "Asia/Kolkata"
        print(" -> Passed: Preferences updated to CPCB NAQI and Asia/Kolkata.")

        # 7. Resync user (e.g. on subsequent login)
        print("Step 8: Testing idempotent resync...")
        res = await client.post("/api/auth/sync", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        assert res.json()["firebase_uid"] == uid
        print(" -> Passed: Idempotent resync succeeded.")


if __name__ == "__main__":
    asyncio.run(run_auth_tests())
    print("\n==================================================================")
    print("ALL 7 BACKEND AUTHENTICATION INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================================")
