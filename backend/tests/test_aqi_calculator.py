"""Unit tests for the AERIS AQI calculation engine.

Validates compliance with US EPA AQI and Indian CPCB NAQI standards.
"""

from __future__ import annotations

import unittest

from app.services.aqi_calculator import (
    calculate_aqi,
    calculate_sub_index,
    get_aqi_category,
    get_health_recommendation,
)


class TestEpaSubIndex:
    """Tests for US EPA pollutant sub-index calculation."""

    def test_pm25_good_range(self):
        # 0.0 -> 0, 12.0 -> 50
        assert calculate_sub_index("pm25", 0.0, standard="us_epa") == 0.0
        assert calculate_sub_index("pm25", 6.0, standard="us_epa") == 25.0
        assert calculate_sub_index("pm25", 12.0, standard="us_epa") == 50.0

    def test_pm25_moderate_range(self):
        # 12.1 -> 51, 35.4 -> 100
        val = calculate_sub_index("pm25", 23.75, standard="us_epa")
        assert val is not None and 70 <= val <= 80

    def test_pm25_unhealthy_range(self):
        # 55.5 to 150.4 -> 151 to 200
        val = calculate_sub_index("pm25", 100.0, standard="us_epa")
        assert val is not None and 170 <= val <= 180

    def test_pm10_breakpoints(self):
        # 0-54 -> 0-50
        assert calculate_sub_index("pm10", 0.0, standard="us_epa") == 0.0
        assert calculate_sub_index("pm10", 54.0, standard="us_epa") == 50.0

    def test_ozone_breakpoints(self):
        # O3 in ppm: 0 to 0.054 -> 0 to 50
        assert calculate_sub_index("o3", 0.027, standard="us_epa") == 25.0

    def test_negative_concentration(self):
        assert calculate_sub_index("pm25", -5.0, standard="us_epa") is None

    def test_unknown_pollutant(self):
        assert calculate_sub_index("unobtanium", 20.0, standard="us_epa") is None

    def test_concentration_above_max_capped_at_500(self):
        assert calculate_sub_index("pm25", 999.0, standard="us_epa") == 500.0


class TestCpcbSubIndex:
    """Tests for Indian CPCB NAQI pollutant sub-index calculation."""

    def test_cpcb_pm25_breakpoints(self):
        # 0-30 -> 0-50, 31-60 -> 51-100
        assert calculate_sub_index("pm25", 0.0, standard="cpcb_naqi") == 0.0
        assert calculate_sub_index("pm25", 30.0, standard="cpcb_naqi") == 50.0
        assert calculate_sub_index("pm25", 60.0, standard="cpcb_naqi") == 100.0

    def test_cpcb_pm10_breakpoints(self):
        # 0-50 -> 0-50, 51-100 -> 51-100
        assert calculate_sub_index("pm10", 50.0, standard="cpcb_naqi") == 50.0
        assert calculate_sub_index("pm10", 100.0, standard="cpcb_naqi") == 100.0

    def test_cpcb_no2_breakpoints(self):
        # 0-40 -> 0-50
        assert calculate_sub_index("no2", 20.0, standard="cpcb_naqi") == 25.0


class TestAqiCalculation:
    """Tests for overall composite AQI and primary pollutant determination."""

    def test_epa_overall_aqi_selects_max(self):
        # PM2.5 = 12.0 (AQI 50), PM10 = 100 (AQI ~73), O3 = 0.070 (AQI 100)
        pollutants = {
            "pm25": 12.0,
            "pm10": 100.0,
            "o3": 0.070,
        }
        res = calculate_aqi(pollutants, standard="us_epa")
        assert res.value == 100.0
        assert res.primary_pollutant == "o3"
        assert res.category == "Moderate"
        assert res.color == "#F5D000"

    def test_pm25_concentration_is_not_aqi(self):
        # A PM2.5 concentration of 35.4 µg/m³ corresponds to AQI 100, NOT 35.4!
        pollutants = {"pm25": 35.4}
        res = calculate_aqi(pollutants, standard="us_epa")
        assert res.value == 100.0

    def test_cpcb_categories(self):
        cat, col = get_aqi_category(45, standard="cpcb_naqi")
        assert cat == "Good"
        assert col == "#00A651"

        cat, col = get_aqi_category(75, standard="cpcb_naqi")
        assert cat == "Satisfactory"
        assert col == "#84CF33"

        cat, col = get_aqi_category(150, standard="cpcb_naqi")
        assert cat == "Moderate"
        assert col == "#F5D000"

        cat, col = get_aqi_category(250, standard="cpcb_naqi")
        assert cat == "Poor"
        assert col == "#FF8C00"

        cat, col = get_aqi_category(350, standard="cpcb_naqi")
        assert cat == "Very Poor"
        assert col == "#E53935"

        cat, col = get_aqi_category(450, standard="cpcb_naqi")
        assert cat == "Severe"
        assert col == "#7E0023"

    def test_epa_categories(self):
        cat, col = get_aqi_category(30, standard="us_epa")
        assert cat == "Good"

        cat, col = get_aqi_category(75, standard="us_epa")
        assert cat == "Moderate"

        cat, col = get_aqi_category(125, standard="us_epa")
        assert cat == "Unhealthy for Sensitive Groups"

        cat, col = get_aqi_category(175, standard="us_epa")
        assert cat == "Unhealthy"

        cat, col = get_aqi_category(250, standard="us_epa")
        assert cat == "Very Unhealthy"

        cat, col = get_aqi_category(350, standard="us_epa")
        assert cat == "Hazardous"

    def test_health_recommendations_exist_for_all_ranges(self):
        for val in [25, 75, 125, 175, 250, 400]:
            rec_epa = get_health_recommendation(val, standard="us_epa")
            assert len(rec_epa) > 10
            rec_cpcb = get_health_recommendation(val, standard="cpcb_naqi")
            assert len(rec_cpcb) > 10

    def test_empty_pollutants(self):
        res = calculate_aqi({}, standard="us_epa")
        assert res.value is None
        assert res.category == "Insufficient Data"
