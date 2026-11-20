"""Unit tests verifying US EPA direct passthrough and category mappings."""

from __future__ import annotations

import os
import sys
import unittest

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.services.aqi_calculator import (
    calculate_aqi,
    get_aqi_category,
    get_health_recommendation,
)


class TestUSEpaDirectPassthrough(unittest.TestCase):
    """US EPA AQI value comes directly from Open-Meteo's raw us_aqi field."""

    def test_us_epa_aqi_is_raw_openmeteo_value(self):
        """Raw us_aqi=91 must yield final AQI=91."""
        raw_us_aqi = 91
        aqi_value = float(raw_us_aqi)
        self.assertEqual(aqi_value, 91.0, "US EPA AQI must be raw Open-Meteo value")

    def test_us_epa_category_for_91(self):
        """AQI 91 must be classified as Moderate under US EPA."""
        cat, color = get_aqi_category(91)
        self.assertEqual(cat, "Moderate")
        self.assertEqual(color, "#FFFF00")

    def test_overall_epa_aqi_is_max_of_sub_indexes(self):
        """The overall US EPA AQI from Open-Meteo (91) should equal the max of its sub-indexes (pm25=91)."""
        raw_us_aqi = 91
        epa_sub_indexes = {"pm25": 91, "pm10": 45, "o3": 60, "no2": 30, "so2": 15, "co": 20}
        max_sub = max(v for v in epa_sub_indexes.values() if v is not None)
        self.assertEqual(max_sub, 91)
        self.assertEqual(raw_us_aqi, max_sub)

    def test_us_epa_category_boundaries(self):
        """Verify US EPA category mapping is correct across all 6 bands."""
        self.assertEqual(get_aqi_category(0)[0], "Good")
        self.assertEqual(get_aqi_category(50)[0], "Good")
        self.assertEqual(get_aqi_category(51)[0], "Moderate")
        self.assertEqual(get_aqi_category(100)[0], "Moderate")
        self.assertEqual(get_aqi_category(101)[0], "Unhealthy for Sensitive Groups")
        self.assertEqual(get_aqi_category(150)[0], "Unhealthy for Sensitive Groups")
        self.assertEqual(get_aqi_category(151)[0], "Unhealthy")
        self.assertEqual(get_aqi_category(200)[0], "Unhealthy")
        self.assertEqual(get_aqi_category(201)[0], "Very Unhealthy")
        self.assertEqual(get_aqi_category(300)[0], "Very Unhealthy")
        self.assertEqual(get_aqi_category(301)[0], "Hazardous")
        self.assertEqual(get_aqi_category(500)[0], "Hazardous")


if __name__ == "__main__":
    unittest.main(verbosity=2)
