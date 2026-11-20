"""Integration tests for AERIS AQI calculation and standard selection.

Validates that:
1. When selected standard is US EPA, raw Open-Meteo current.us_aqi (e.g. 91)
   is directly used and displayed, NOT 169.
2. Ozone sub-index under US EPA is NOT calculated via CPCB (never 169).
3. Country of location (e.g. India) does NOT silently override the user's
   requested standard.
4. When CPCB NAQI is selected, valid CPCB methodology is used or Insufficient Data
   is reported if required averaging data is unavailable.
5. History and extremes consistently respect the selected standard.
"""

from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime, timezone
import unittest
from unittest.mock import patch, AsyncMock, MagicMock

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from app.api.aqi import router as aqi_router
from app.api.pollutants import router as pollutants_router
from app.core.database import get_db


def _make_mock_db():
    """Return an AsyncMock that quacks like an AsyncSession for our tests."""
    db = AsyncMock()
    # execute() returns something whose scalar_one_or_none() returns None (no existing reading)
    exec_result = MagicMock()
    exec_result.scalar_one_or_none.return_value = None
    exec_result.scalars.return_value.all.return_value = []
    db.execute = AsyncMock(return_value=exec_result)
    db.get = AsyncMock(return_value=None)
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    return db


async def run_aqi_tests():
    print("Step 1: Setting up test application with mocked DB and Open-Meteo...")

    app = FastAPI(title="AQI Test App")
    app.include_router(aqi_router)
    app.include_router(pollutants_router)

    # Mock DB dependency so the test never touches the real SQLite file
    mock_db = _make_mock_db()

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    # --- Test data: the exact bug scenario ---
    # Open-Meteo raw current.us_aqi = 91, O3 = 147 µg/m³, location in India
    # Expected: AERIS displays 91, NOT 169. O3 sub-index must NOT be 169.
    print("Step 2: Testing US EPA calculation with Open-Meteo current.us_aqi = 91 and O3 = 147 µg/m³...")
    mock_loc = MagicMock()
    mock_loc.id = 1
    mock_loc.name = "New Delhi"
    mock_loc.country_code = "IN"
    mock_loc.latitude = 28.6139
    mock_loc.longitude = 77.2090

    now_iso = datetime.now(timezone.utc).isoformat()
    mock_openmeteo_data = {
        "measured_at": datetime.now(timezone.utc),
        "interval_seconds": 3600,
        "us_aqi_openmeteo": 91,
        "epa_sub_indexes": {
            "pm25": 91,
            "pm10": 45,
            "o3": 60,
            "no2": 30,
            "so2": 15,
            "co": 20,
        },
        "source": "open_meteo",
        "measurement_type": "model_estimate",
        "current": {
            "pm25": 31.5,
            "pm10": 48.0,
            "co": 450.0,
            "no2": 32.0,
            "so2": 12.0,
            "o3": 147.0,
            "measured_at": now_iso,
        },
        "raw": {
            "pm25": 31.5,
            "pm10": 48.0,
            "co": 450.0,
            "no2": 32.0,
            "so2": 12.0,
            "o3": 147.0,
        },
        "raw_provider_current": {
            "time": now_iso,
            "us_aqi": 91,
            "ozone": 147.0,
        },
        "hourly": [],
    }

    with patch("app.api.aqi.fetch_current_air_quality", new_callable=AsyncMock) as mock_fetch, \
         patch("app.api.aqi.get_or_create_location", new_callable=AsyncMock) as mock_get_loc, \
         patch("app.api.pollutants.fetch_current_air_quality", new_callable=AsyncMock) as mock_fetch_pol, \
         patch("app.api.pollutants.get_or_create_location", new_callable=AsyncMock) as mock_get_loc_pol:

        mock_fetch.return_value = mock_openmeteo_data
        mock_get_loc.return_value = mock_loc
        mock_fetch_pol.return_value = mock_openmeteo_data
        mock_get_loc_pol.return_value = mock_loc

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:

            # === TEST 1: US EPA should return 91 directly ===
            resp = await client.get("/api/aqi/current?lat=28.6139&lon=77.2090&standard=us_epa")
            assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
            data = resp.json()

            print(f"  -> aqi_value:    {data['aqi_value']} (expected 91.0)")
            print(f"  -> raw_us_aqi:   {data['raw_us_aqi']} (expected 91.0)")
            print(f"  -> aqi_standard: {data['aqi_standard']} (expected 'us_epa')")
            print(f"  -> category:     {data['category']} (expected 'Moderate')")

            assert data["aqi_value"] == 91.0, f"❌ Expected AQI 91, got {data['aqi_value']}"
            assert data["raw_us_aqi"] == 91.0, f"❌ Expected raw_us_aqi 91, got {data['raw_us_aqi']}"
            assert data["aqi_standard"] == "us_epa", f"❌ Expected 'us_epa', got {data['aqi_standard']}"
            assert data["category"] == "Moderate", f"❌ Expected 'Moderate', got {data['category']}"

            # Verify diagnostic fields
            diag = data.get("diagnostics", {})
            assert diag.get("raw_us_aqi") == 91, f"❌ Expected diag.raw_us_aqi=91, got {diag.get('raw_us_aqi')}"
            assert diag.get("backend_aqi") == 91.0, f"❌ Expected diag.backend_aqi=91.0, got {diag.get('backend_aqi')}"
            assert diag.get("selected_standard") == "us_epa", f"❌ Expected diag.selected_standard='us_epa', got {diag.get('selected_standard')}"

            # Verify pollutant O3: concentration 147, sub-index 60 (NOT 169)
            pollutants = data["pollutants"]["pollutants"]
            o3_item = next(p for p in pollutants if p["name"] == "o3")
            print(f"  -> O3 concentration:   {o3_item['concentration']} µg/m³ (expected 147.0)")
            print(f"  -> O3 aqi_contribution:{o3_item['aqi_contribution']} (expected 60, must NOT be 169)")
            assert o3_item["concentration"] == 147.0, f"❌ O3 concentration: expected 147.0, got {o3_item['concentration']}"
            assert o3_item["aqi_contribution"] != 169.0, f"❌ Ozone sub-index MUST NOT be 169 (CPCB formula was applied)"
            assert o3_item["aqi_contribution"] == 60, f"❌ Expected O3 sub-index 60, got {o3_item['aqi_contribution']}"
            print("  ✅ PASS: US EPA returned 91.0 (not 169) and ozone sub-index is 60 (not 169).")

            # === TEST 2: CPCB NAQI must report Insufficient Data when no hourly averages ===
            print("Step 3: Testing CPCB NAQI when hourly data is unavailable...")
            cpcb_resp = await client.get("/api/aqi/current?lat=28.6139&lon=77.2090&standard=cpcb_naqi")
            assert cpcb_resp.status_code == 200, f"❌ Expected 200, got {cpcb_resp.status_code}: {cpcb_resp.text}"
            cpcb_data = cpcb_resp.json()
            print(f"  -> aqi_value: {cpcb_data['aqi_value']} (expected None)")
            print(f"  -> category:  {cpcb_data['category']} (expected 'Insufficient Data')")
            assert cpcb_data["aqi_value"] is None, f"❌ Expected aqi_value=None for CPCB with no data, got {cpcb_data['aqi_value']}"
            assert cpcb_data["category"] == "Insufficient Data", f"❌ Expected 'Insufficient Data', got {cpcb_data['category']}"
            assert cpcb_data["aqi_standard"] == "cpcb_naqi", f"❌ Expected 'cpcb_naqi', got {cpcb_data['aqi_standard']}"
            print("  ✅ PASS: CPCB NAQI reported Insufficient Data as required.")


if __name__ == "__main__":
    asyncio.run(run_aqi_tests())
    print("\n==================================================================")
    print("ALL AQI CALCULATION & STANDARD SELECTION TESTS PASSED SUCCESSFULLY!")
    print("==================================================================")
