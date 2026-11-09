"""Unit and integration tests for AERIS notification system.

Validates:
- Template library count (>=5 per category, >=30 total for CPCB & EPA)
- Dynamic field replacement without orphaned placeholders
- Anti-repetition logic for consecutive template selection
- Category worsening comparison logic
- No emojis in notification templates
- Notification history persistence and retrieval via API
"""

from __future__ import annotations

import asyncio
import os
import re
import sys
import time
import unittest
from unittest.mock import MagicMock

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.api.auth import router as auth_router
from app.api.notifications import router as notifications_router
from app.core.database import async_session_factory, init_db
import app.core.security as security_module
from app.models.notification import NotificationHistory
from app.services.notification_templates import (
    CPCB_TEMPLATES,
    EPA_TEMPLATES,
    CPCB_ALERT_TEMPLATES,
    EPA_ALERT_TEMPLATES,
    category_worsened,
    get_severity_index,
    render_template,
    select_template,
)
from app.utils.aqi_breakpoints import CPCB_CATEGORIES, EPA_CATEGORIES

# Test RSA key pair
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


class TestNotificationTemplates(unittest.TestCase):
    """Unit tests for the notification template library."""

    def test_cpcb_template_count(self):
        """Verify each of the 6 official CPCB categories has at least 5 templates."""
        expected_categories = [cat[2] for cat in CPCB_CATEGORIES]
        self.assertEqual(len(expected_categories), 6)

        total_templates = 0
        for category in expected_categories:
            templates = CPCB_TEMPLATES.get(category)
            self.assertIsNotNone(templates, f"Missing CPCB category: {category}")
            self.assertGreaterEqual(
                len(templates),
                5,
                f"CPCB category '{category}' has {len(templates)} templates; expected >= 5",
            )
            total_templates += len(templates)

        self.assertGreaterEqual(total_templates, 30)

    def test_epa_template_count(self):
        """Verify each of the 6 official US EPA categories has at least 5 templates."""
        expected_categories = [cat[2] for cat in EPA_CATEGORIES]
        self.assertEqual(len(expected_categories), 6)

        total_templates = 0
        for category in expected_categories:
            templates = EPA_TEMPLATES.get(category)
            self.assertIsNotNone(templates, f"Missing EPA category: {category}")
            self.assertGreaterEqual(
                len(templates),
                5,
                f"EPA category '{category}' has {len(templates)} templates; expected >= 5",
            )
            total_templates += len(templates)

        self.assertGreaterEqual(total_templates, 30)

    def test_no_emojis_in_templates(self):
        """Notification guidelines require NO emojis in notification copy."""
        emoji_pattern = re.compile(
            r"[\U00010000-\U0010ffff]|[\u2600-\u27ff]", flags=re.UNICODE
        )

        all_templates = []
        for templates in CPCB_TEMPLATES.values():
            all_templates.extend(templates)
        for templates in EPA_TEMPLATES.values():
            all_templates.extend(templates)
        for templates in CPCB_ALERT_TEMPLATES.values():
            all_templates.extend(templates)
        for templates in EPA_ALERT_TEMPLATES.values():
            all_templates.extend(templates)

        for t in all_templates:
            self.assertIsNone(emoji_pattern.search(t.title), f"Emoji found in title: {t.title}")
            self.assertIsNone(emoji_pattern.search(t.body), f"Emoji found in body: {t.body}")

    def test_dynamic_fields_render_completely(self):
        """Verify render_template populates all dynamic fields without leaving unrendered braces."""
        for cat, templates in CPCB_TEMPLATES.items():
            for tpl in templates:
                rendered = render_template(
                    template=tpl,
                    location="Kolhapur",
                    aqi=81,
                    category=cat,
                    timestamp="2026-11-10T02:00:00Z",
                    primary_pollutant="PM2.5",
                    health_advice="Air quality is acceptable for most individuals.",
                )
                self.assertTrue("Kolhapur" in rendered["title"] or "Kolhapur" in rendered["body"])
                self.assertNotIn("{", rendered["title"])
                self.assertNotIn("}", rendered["title"])
                self.assertNotIn("{", rendered["body"])
                self.assertNotIn("}", rendered["body"])

    def test_anti_repetition_logic(self):
        """Verify sequential template selections avoid immediate repetition for a given user."""
        category = "Severe"
        user_id = 999

        first_tpl, first_idx = select_template(category, "cpcb_naqi", user_id=user_id)
        second_tpl, second_idx = select_template(category, "cpcb_naqi", user_id=user_id)

        self.assertNotEqual(
            first_idx,
            second_idx,
            f"Expected different template indices on consecutive calls, got {first_idx} twice",
        )

    def test_category_worsened_cpcb(self):
        """Verify CPCB category worsening detection."""
        self.assertTrue(category_worsened("Good", "Moderate", "cpcb_naqi"))
        self.assertTrue(category_worsened("Satisfactory", "Severe", "cpcb_naqi"))
        self.assertFalse(category_worsened("Severe", "Poor", "cpcb_naqi"))
        self.assertFalse(category_worsened("Moderate", "Moderate", "cpcb_naqi"))
        self.assertFalse(category_worsened("NonExistent", "Good", "cpcb_naqi"))

    def test_category_worsened_epa(self):
        """Verify US EPA category worsening detection."""
        self.assertTrue(category_worsened("Good", "Unhealthy", "us_epa"))
        self.assertTrue(category_worsened("Moderate", "Unhealthy for Sensitive Groups", "us_epa"))
        self.assertFalse(category_worsened("Hazardous", "Very Unhealthy", "us_epa"))
        self.assertFalse(category_worsened("Unhealthy", "Unhealthy", "us_epa"))

    def test_severity_order_indices(self):
        """Verify severity order ordering."""
        self.assertEqual(get_severity_index("Good", "cpcb_naqi"), 0)
        self.assertEqual(get_severity_index("Severe", "cpcb_naqi"), 5)
        self.assertEqual(get_severity_index("Good", "us_epa"), 0)
        self.assertEqual(get_severity_index("Hazardous", "us_epa"), 5)
        self.assertEqual(get_severity_index("InvalidCategory", "cpcb_naqi"), -1)


async def run_async_notification_api_tests():
    """Integration test for notification history API."""
    print("Testing Notification History API...")
    await init_db()

    app = FastAPI()
    app.include_router(auth_router)
    app.include_router(notifications_router)

    security_module._jwks_client = MagicMock()
    mock_signing_key = MagicMock()
    mock_signing_key.key = _PUBLIC_KEY
    security_module._jwks_client.get_signing_key_from_jwt.return_value = mock_signing_key

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Sync a test user
        uid = f"notify-user-{int(time.time())}"
        token = create_test_token(uid, "notify@test.com", "Notification Tester")
        sync_res = await client.post("/api/auth/sync", headers={"Authorization": f"Bearer {token}"})
        assert sync_res.status_code == 200
        user_data = sync_res.json()
        user_id = user_data["id"]

        # Insert a sample notification history record directly
        async with async_session_factory() as session:
            record = NotificationHistory(
                user_id=user_id,
                notification_type="daily_briefing",
                aqi_value=68.0,
                aqi_category="Satisfactory",
                aqi_standard="cpcb_naqi",
                primary_pollutant="PM2.5",
                message_title="AERIS — Kolhapur Air Quality Update",
                message_body="Current AQI in Kolhapur: 68 (Satisfactory).",
                delivery_status="delivered",
            )
            session.add(record)
            await session.commit()

        # Query /api/notifications/history
        res = await client.get("/api/notifications/history", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        history = res.json()
        assert len(history) >= 1
        assert history[0]["aqi_value"] == 68.0
        assert history[0]["aqi_category"] == "Satisfactory"
        assert history[0]["delivery_status"] == "delivered"
        print(f" -> Passed: Fetched {len(history)} notification history record(s) successfully.")


if __name__ == "__main__":
    print("Running Notification Template unit tests...")
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(TestNotificationTemplates)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if not result.wasSuccessful():
        sys.exit(1)

    print("\nRunning Async Notification History integration test...")
    asyncio.run(run_async_notification_api_tests())
    print("\n==================================================================")
    print("ALL NOTIFICATION SYSTEM TESTS PASSED SUCCESSFULLY!")
    print("==================================================================")
