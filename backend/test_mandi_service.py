"""
Unit tests for AgriLinkX Mandi Data Service and /api/mandi/prices endpoint.
Validates:
1. Price response parsing
2. Price normalization
3. ₹/quintal -> ₹/kg conversion
4. Commodity mapping
5. Filters applied to HTTP query
6. Empty result handling
7. Invalid response / JSON error handling
8. Timeout and network API failure handling
9. Missing API key handling
10. Cache behavior
11. Rate-limit-safe caching behavior
"""

import os
import json
import unittest
from unittest.mock import patch, MagicMock
import urllib.error

# Import service functions
from market_data_service import (
    fetch_mandi_prices_from_api,
    normalize_record,
    map_commodity_name,
    clear_cache,
    SOURCE_NAME,
)

# Sample mock JSON response from data.gov.in API
MOCK_GOV_RESPONSE = {
    "index_name": "9ef84268-d588-43aa-a32f-d1df99b44135",
    "title": "Current Daily Price of Various Commodities from Various Markets (Mandi)",
    "records": [
        {
            "state": "Telangana",
            "district": "Rangareddy",
            "market": "Bowenpally",
            "commodity": "Tomato",
            "variety": "Hybrid Red",
            "grade": "FAQ",
            "arrival_date": "13/09/2026",
            "min_price": "2400",
            "max_price": "3200",
            "modal_price": "2800",
        },
        {
            "state": "Telangana",
            "district": "Rangareddy",
            "market": "Gaddiannaram",
            "commodity": "Tomato",
            "variety": "Desi",
            "grade": "Grade A",
            "arrival_date": "13/09/2026",
            "min_price": "2200",
            "max_price": "2900",
            "modal_price": "2600",
        },
    ],
}


class TestMandiService(unittest.TestCase):

    def setUp(self):
        clear_cache()

    def test_1_price_response_parsing(self):
        """Test parsing of raw records into standard keys."""
        raw_record = MOCK_GOV_RESPONSE["records"][0]
        norm = normalize_record(raw_record)
        self.assertEqual(norm["commodity"], "Tomato")
        self.assertEqual(norm["variety"], "Hybrid Red")
        self.assertEqual(norm["grade"], "FAQ")
        self.assertEqual(norm["state"], "Telangana")
        self.assertEqual(norm["district"], "Rangareddy")
        self.assertEqual(norm["market"], "Bowenpally")
        self.assertEqual(norm["date"], "13/09/2026")
        self.assertEqual(norm["source"], SOURCE_NAME)

    def test_2_and_3_price_normalization_and_quintal_conversion(self):
        """Test conversion of modal_price in Rs/Quintal (2800) to Rs/kg (28.0)."""
        raw_record = {
            "commodity": "Tomato",
            "min_price": "2400",
            "max_price": "3200",
            "modal_price": "2800",
            "price_unit": "Rs/Quintal",
        }
        norm = normalize_record(raw_record)
        self.assertEqual(norm["min_price"], 2400.0)
        self.assertEqual(norm["max_price"], 3200.0)
        self.assertEqual(norm["modal_price"], 2800.0)
        self.assertEqual(norm["original_price_unit"], "Rs/Quintal")
        self.assertEqual(norm["normalized_price_per_kg"], 28.0)

    def test_4_commodity_mapping(self):
        """Test AgriLinkX product names to Government Mandi commodity names."""
        self.assertEqual(map_commodity_name("tomato"), "Tomato")
        self.assertEqual(map_commodity_name("toor dal"), "Arhar (Tur/Red Gram)")
        self.assertEqual(map_commodity_name("green chilli"), "Chilli")
        self.assertEqual(map_commodity_name("Cabbage"), "Cabbage")

    @patch("urllib.request.urlopen")
    def test_5_filters_applied_to_request(self, mock_urlopen):
        """Test that commodity, state, district, and date filters are included in the request URL."""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = json.dumps(MOCK_GOV_RESPONSE).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response

        res = fetch_mandi_prices_from_api(
            commodity="tomato",
            state="Telangana",
            district="Rangareddy",
            date="13/09/2026",
            api_key="test-api-key",
        )

        self.assertEqual(res["source_status"], "available")
        self.assertEqual(len(res["data"]), 2)

        # Inspect request URL passed to urlopen
        called_req = mock_urlopen.call_args[0][0]
        url = called_req.full_url
        self.assertIn("filters%5Bcommodity%5D=Tomato", url)
        self.assertIn("filters%5Bstate%5D=Telangana", url)
        self.assertIn("filters%5Bdistrict%5D=Rangareddy", url)
        self.assertIn("filters%5Barrival_date%5D=13%2F09%2F2026", url)
        self.assertIn("api-key=test-api-key", url)

    @patch("urllib.request.urlopen")
    def test_6_empty_result_handling(self, mock_urlopen):
        """Test handling when Government API returns empty records."""
        mock_response = MagicMock()
        mock_response.status = 200
        empty_payload = {"records": []}
        mock_response.read.return_value = json.dumps(empty_payload).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response

        res = fetch_mandi_prices_from_api(commodity="Wheat", api_key="test-api-key")
        self.assertEqual(res["source_status"], "available")
        self.assertEqual(res["data"], [])

    @patch("urllib.request.urlopen")
    def test_7_invalid_response_handling(self, mock_urlopen):
        """Test handling invalid non-JSON or broken payload from Government API."""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = b"<html>Service Unavailable</html>"
        mock_urlopen.return_value.__enter__.return_value = mock_response

        res = fetch_mandi_prices_from_api(commodity="Tomato", api_key="test-api-key")
        self.assertEqual(res["source_status"], "unavailable")
        self.assertIn("Invalid response format", res["message"])
        self.assertEqual(res["data"], [])

    @patch("urllib.request.urlopen")
    def test_8_timeout_and_network_failure(self, mock_urlopen):
        """Test timeout / connection failure handling."""
        mock_urlopen.side_effect = urllib.error.URLError("Connection timed out")

        res = fetch_mandi_prices_from_api(commodity="Tomato", api_key="test-api-key")
        self.assertEqual(res["source_status"], "unavailable")
        self.assertIn("Connection timed out", res["message"])
        self.assertEqual(res["data"], [])

    def test_9_missing_api_key(self):
        """Test behavior when DATAGOV_API_KEY is not provided."""
        with patch.dict(os.environ, {"DATAGOV_API_KEY": ""}):
            res = fetch_mandi_prices_from_api(commodity="Tomato", api_key="")
            self.assertEqual(res["source_status"], "unavailable")
            self.assertIn("DATAGOV_API_KEY is not configured", res["message"])
            self.assertEqual(res["data"], [])

    @patch("urllib.request.urlopen")
    def test_10_and_11_cache_and_rate_limit_safe_behavior(self, mock_urlopen):
        """Test that consecutive requests for identical filters hit cache and make only 1 HTTP call."""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = json.dumps(MOCK_GOV_RESPONSE).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response

        # Call 1
        res1 = fetch_mandi_prices_from_api(commodity="Tomato", state="Telangana", api_key="test-key")
        self.assertEqual(res1["source_status"], "available")
        self.assertEqual(mock_urlopen.call_count, 1)

        # Call 2 (Identical params -> should use cache)
        res2 = fetch_mandi_prices_from_api(commodity="Tomato", state="Telangana", api_key="test-key")
        self.assertEqual(res2["source_status"], "available")
        self.assertEqual(mock_urlopen.call_count, 1)  # HTTP call count did NOT increase


if __name__ == "__main__":
    unittest.main()
