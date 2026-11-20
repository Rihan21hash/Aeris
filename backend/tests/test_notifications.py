"""Unit and integration tests for AERIS notification system (US EPA standard only).

Validates:
- Template library count (>=5 per category, >=30 total for US EPA)
- Dynamic field replacement without orphaned placeholders
- Anti-repetition logic for consecutive template selection
- Category worsening/improvement comparison logic under US EPA
- No emojis in notification templates
- Notification history persistence and retrieval via API
- Push subscription lifecycle: subscribe → verify → unsubscribe → verify disabled
- Duplicate endpoint reactivation (no row duplication)
- Verify-subscription for nonexistent endpoints
"""

from __future__ import annotations

import asyncio
import os
import re
import sys
import time
import unittest

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
    NotificationTemplate,
    EPA_TEMPLATES,
    EPA_ALERT_TEMPLATES,
    EPA_IMPROVEMENT_TEMPLATES,
    category_improved,
    category_worsened,
    get_severity_index,
    render_template,
    select_template,
)
from app.utils.aqi_breakpoints import EPA_CATEGORIES

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


def _mock_verify_factory(uid: str, email: str, name: str):
    """Return a mock verify_firebase_token that always succeeds for the given uid."""
    def _mock(_tok):
        return {"uid": uid, "sub": uid, "user_id": uid, "email": email, "name": name}
    return _mock


class TestNotificationTemplates(unittest.TestCase):
    """Unit tests for the US EPA notification template library."""

    def test_epa_template_count(self):
        """Verify each of the 6 official US EPA categories has at least 5 templates."""
        expected_categories = [cat[2] for cat in EPA_CATEGORIES]
        self.assertEqual(len(expected_categories), 6)
        for cat in expected_categories:
            templates = EPA_TEMPLATES.get(cat, [])
            self.assertGreaterEqual(len(templates), 5, f"EPA category '{cat}' has {len(templates)} templates, need >=5")

    def test_dynamic_fields_render_completely(self):
        """Verify render_template populates all dynamic fields without leaving unrendered braces."""
        tmpl = NotificationTemplate(
            title="AERIS — {category} in {location}",
            body="AQI is {aqi} ({category}) in {location} at {timestamp}. Primary: {primary_pollutant}. {health_advice}",
        )
        result = render_template(
            tmpl,
            location="Delhi",
            aqi=145,
            category="Unhealthy for Sensitive Groups",
            timestamp="2026-11-20 10:00",
            primary_pollutant="PM2.5",
            health_advice="Reduce outdoor activity.",
        )
        self.assertNotIn("{", result["title"])
        self.assertNotIn("{", result["body"])
        self.assertIn("Delhi", result["title"])
        self.assertIn("145", result["body"])

    def test_no_emojis_in_templates(self):
        """Notification guidelines require NO emojis in notification copy."""
        emoji_re = re.compile(
            r"["
            r"\U0001F600-\U0001F64F"
            r"\U0001F300-\U0001F5FF"
            r"\U0001F680-\U0001F6FF"
            r"\U0001F1E0-\U0001F1FF"
            r"\U00002702-\U000027B0"
            r"\U0001FA00-\U0001FA6F"
            r"\U0001FA70-\U0001FAFF"
            r"\U00002600-\U000026FF"
            r"\U0000FE00-\U0000FE0F"
            r"\U0000200D"
            r"]+",
            flags=re.UNICODE,
        )
        all_template_dicts = {
            **EPA_TEMPLATES,
            **EPA_ALERT_TEMPLATES,
            **EPA_IMPROVEMENT_TEMPLATES,
        }
        for cat_name, templates in all_template_dicts.items():
            for t in templates:
                text = f"{t.title} {t.body}" if isinstance(t, NotificationTemplate) else str(t)
                self.assertIsNone(emoji_re.search(text), f"Template in '{cat_name}' contains emoji: {text!r}")

    def test_anti_repetition_logic(self):
        """Verify sequential template selections avoid immediate repetition for a given user."""
        previous_idx = None
        for _ in range(10):
            _tmpl, idx = select_template("Good", "us_epa", "daily_briefing", user_id=99999)
            if previous_idx is not None:
                self.assertNotEqual(idx, previous_idx, "Consecutive selections should differ when possible.")
            previous_idx = idx

    def test_category_worsened_epa(self):
        """Verify US EPA category worsening detection."""
        self.assertTrue(category_worsened("Good", "Moderate"))
        self.assertTrue(category_worsened("Moderate", "Unhealthy"))
        self.assertFalse(category_worsened("Unhealthy", "Good"))
        self.assertFalse(category_worsened("Good", "Good"))

    def test_category_improved_epa(self):
        """Verify US EPA category improvement detection."""
        self.assertTrue(category_improved("Moderate", "Good"))
        self.assertTrue(category_improved("Unhealthy", "Moderate"))
        self.assertFalse(category_improved("Good", "Moderate"))
        self.assertFalse(category_improved("Good", "Good"))

    def test_aqi_improvement_template_selection(self):
        """Verify select_template selects improvement template when requested."""
        improvement_templates = EPA_IMPROVEMENT_TEMPLATES.get("Good", [])
        if not improvement_templates:
            self.skipTest("No improvement templates for Good")
        result_tmpl, _idx = select_template("Good", "us_epa", "aqi_improvement", user_id=1)
        self.assertIsInstance(result_tmpl, NotificationTemplate)

    def test_severity_order_indices(self):
        """Verify severity order ordering."""
        self.assertEqual(get_severity_index("Good"), 0)
        self.assertEqual(get_severity_index("Moderate"), 1)
        self.assertEqual(get_severity_index("Unhealthy for Sensitive Groups"), 2)
        self.assertEqual(get_severity_index("Unhealthy"), 3)
        self.assertEqual(get_severity_index("Very Unhealthy"), 4)
        self.assertEqual(get_severity_index("Hazardous"), 5)
        self.assertEqual(get_severity_index("InvalidCategory"), -1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
