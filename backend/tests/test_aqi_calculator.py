"""Unit tests for the AERIS US EPA AQI calculation engine.

Validates compliance strictly with US EPA AQI standard.
"""

from __future__ import annotations

import os
import sys
import unittest

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.services.aqi_calculator import (
    calculate_aqi,
    calculate_sub_index,
    get_aqi_category,
    get_health_recommendation,
)


class TestEpaSubIndex(unittest.TestCase):
    """Tests for US EPA pollutant sub-index calculation."""

    def test_pm25_good_range(self):
        # 0.0 -> 0, 12.0 -> 50
        self.assertEqual(calculate_sub_index("pm25", 0.0), 0.0)
        self.assertEqual(calculate_sub_index("pm25", 6.0), 25.0)
        self.assertEqual(calculate_sub_index("pm25", 12.0), 50.0)

    def test_pm25_moderate_range(self):
        # 12.1 -> 51, 35.4 -> 100
        val = calculate_sub_index("pm25", 23.75)
        self.assertIsNotNone(val)
        self.assertTrue(70 <= val <= 80)

    def test_pm25_unhealthy_range(self):
        # 55.5 to 150.4 -> 151 to 200
        val = calculate_sub_index("pm25", 100.0)
        self.assertIsNotNone(val)
        self.assertTrue(170 <= val <= 180)

    def test_pm10_breakpoints(self):
        # 0-54 -> 0-50
        self.assertEqual(calculate_sub_index("pm10", 0.0), 0.0)
        self.assertEqual(calculate_sub_index("pm10", 54.0), 50.0)

    def test_ozone_breakpoints(self):
        # O3 in ppm: 0 to 0.054 -> 0 to 50
        self.assertEqual(calculate_sub_index("o3", 0.027), 25.0)

    def test_negative_concentration(self):
        self.assertIsNone(calculate_sub_index("pm25", -5.0))

    def test_unknown_pollutant(self):
        self.assertIsNone(calculate_sub_index("unobtanium", 20.0))

    def test_concentration_above_max_capped_at_500(self):
        self.assertEqual(calculate_sub_index("pm25", 999.0), 500.0)


class TestAqiCalculation(unittest.TestCase):
    """Tests for overall composite US EPA AQI and primary pollutant determination."""

    def test_epa_overall_aqi_selects_max(self):
        # PM2.5 = 12.0 (AQI 50), PM10 = 100 (AQI ~73), O3 = 0.070 (AQI 100)
        pollutants = {
            "pm25": 12.0,
            "pm10": 100.0,
            "o3": 0.070,
        }
        res = calculate_aqi(pollutants)
        self.assertEqual(res.value, 100.0)
        self.assertEqual(res.primary_pollutant, "o3")
        self.assertEqual(res.category, "Moderate")
        self.assertEqual(res.color, "#FFFF00")

    def test_pm25_concentration_is_not_aqi(self):
        # A PM2.5 concentration of 35.4 µg/m³ corresponds to AQI 100, NOT 35.4
        pollutants = {"pm25": 35.4}
        res = calculate_aqi(pollutants)
        self.assertEqual(res.value, 100.0)

    def test_epa_categories_and_colors(self):
        cat, col = get_aqi_category(30)
        self.assertEqual(cat, "Good")
        self.assertEqual(col, "#00E400")

        cat, col = get_aqi_category(75)
        self.assertEqual(cat, "Moderate")
        self.assertEqual(col, "#FFFF00")

        cat, col = get_aqi_category(125)
        self.assertEqual(cat, "Unhealthy for Sensitive Groups")
        self.assertEqual(col, "#FF7E00")

        cat, col = get_aqi_category(175)
        self.assertEqual(cat, "Unhealthy")
        self.assertEqual(col, "#FF0000")

        cat, col = get_aqi_category(250)
        self.assertEqual(cat, "Very Unhealthy")
        self.assertEqual(col, "#8F3F97")

        cat, col = get_aqi_category(350)
        self.assertEqual(cat, "Hazardous")
        self.assertEqual(col, "#7E0023")

    def test_health_recommendations_exist_for_all_ranges(self):
        for val in [25, 75, 125, 175, 250, 400]:
            rec_epa = get_health_recommendation(val)
            self.assertGreater(len(rec_epa), 10)

    def test_empty_pollutants(self):
        res = calculate_aqi({})
        self.assertIsNone(res.value)
        self.assertEqual(res.category, "Insufficient Data")


if __name__ == "__main__":
    unittest.main(verbosity=2)
