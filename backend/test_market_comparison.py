"""
AgriLinkX — Focused Tests for Market Comparison Behavior & Data Integrity Rules
Verifies:
1. Government data available
2. Government data unavailable
3. Missing price validation & rejection (no fake prices)
4. Missing market validation & rejection
5. Missing distance (no invented coordinates)
6. Missing ML forecast (unsupported commodity/market handling)
7. Stale/cache metadata preservation
8. Empty result handling
9. API timeout & error handling
"""

import os
import unittest
from unittest.mock import patch, MagicMock
from market_data_service import (
    fetch_mandi_prices_from_api,
    normalize_record,
    clear_cache,
    SOURCE_NAME,
)
from ml.price_predictor import predict_next_day_price


class TestMarketComparison(unittest.TestCase):
    def setUp(self):
        clear_cache()

    def tearDown(self):
        clear_cache()

    # 1. Government data available
    @patch("urllib.request.urlopen")
    def test_government_data_available(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.status = 200
        mock_payload = {
            "records": [
                {
                    "commodity": "Tomato",
                    "variety": "Local",
                    "grade": "FAQ",
                    "state": "Telangana",
                    "district": "Rangareddy",
                    "market": "Bowenpally",
                    "min_price": "2000",
                    "max_price": "2600",
                    "modal_price": "2400",
                    "price_unit": "Rs/Quintal",
                    "arrival_date": "27/09/2026",
                }
            ]
        }
        mock_response.read.return_value = str(mock_payload).replace("'", '"').encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response

        res = fetch_mandi_prices_from_api(
            commodity="Tomato",
            state="Telangana",
            api_key="test-valid-key",
        )

        self.assertTrue(res["success"])
        self.assertEqual(res["source_status"], "available")
        self.assertEqual(res["cache_status"], "fresh")
        self.assertEqual(len(res["data"]), 1)
        rec = res["data"][0]
        self.assertEqual(rec["commodity"], "Tomato")
        self.assertEqual(rec["market"], "Bowenpally")
        self.assertEqual(rec["normalized_price_per_kg"], 24.0)  # 2400 / 100
        self.assertEqual(rec["source"], SOURCE_NAME)
        self.assertIsNotNone(rec["retrieved_at"])

    # 2. Government data unavailable
    def test_government_data_unavailable_no_api_key(self):
        res = fetch_mandi_prices_from_api(
            commodity="Tomato",
            state="Telangana",
            api_key="your-api-key-here",  # Placeholder key
        )
        self.assertFalse(res["success"])
        self.assertEqual(res["source_status"], "unavailable")
        self.assertIn("DATAGOV_API_KEY is not configured", res["message"])
        self.assertEqual(res["data"], [])

    # 3. Missing price validation & rejection (Never invent a mandi price)
    def test_missing_price_rejection(self):
        # Null modal price
        self.assertIsNone(normalize_record({"commodity": "Tomato", "market": "Bowenpally", "modal_price": None}))
        # Zero modal price
        self.assertIsNone(normalize_record({"commodity": "Tomato", "market": "Bowenpally", "modal_price": 0}))
        # Negative modal price
        self.assertIsNone(normalize_record({"commodity": "Tomato", "market": "Bowenpally", "modal_price": -500}))
        # Invalid string modal price
        self.assertIsNone(normalize_record({"commodity": "Tomato", "market": "Bowenpally", "modal_price": "invalid"}))

    # 4. Missing market validation & rejection
    def test_missing_market_rejection(self):
        # Empty market string
        self.assertIsNone(normalize_record({"commodity": "Tomato", "market": "", "modal_price": 2400}))
        # Whitespace market string
        self.assertIsNone(normalize_record({"commodity": "Tomato", "market": "   ", "modal_price": 2400}))

    # 5. Missing distance (Never invent coordinates/distance)
    def test_missing_distance_coordinates(self):
        rec = normalize_record({
            "commodity": "Tomato",
            "market": "Bowenpally",
            "modal_price": 2400,
            "state": "Telangana",
        })
        self.assertIsNotNone(rec)
        self.assertNotIn("latitude", rec)
        self.assertNotIn("longitude", rec)

    # 6. Missing ML forecast (Never invent ML forecasts)
    def test_missing_ml_forecast_unsupported_commodity(self):
        # Wheat is unsupported by baseline model
        res = predict_next_day_price(commodity="Wheat", state="Telangana")
        self.assertFalse(res["success"])
        self.assertIn("message", res)

        # Unknown market for Maize or DLL load policy block handling
        res_mkt = predict_next_day_price(commodity="Maize", state="Telangana", market="NonExistentMarket123")
        self.assertFalse(res_mkt["success"])
        self.assertTrue(
            "Insufficient historical observations" in res_mkt.get("message", "")
            or "Forecast unavailable" in res_mkt.get("message", "")
        )


    # 7. Stale / cache metadata preservation
    @patch("urllib.request.urlopen")
    def test_stale_cache_metadata_preservation(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.status = 200
        mock_payload = {
            "records": [
                {
                    "commodity": "Maize",
                    "market": "Nizamabad",
                    "modal_price": "2100",
                    "price_unit": "Rs/Quintal",
                }
            ]
        }
        mock_response.read.return_value = str(mock_payload).replace("'", '"').encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response

        # Fetch 1: Fresh API call
        res1 = fetch_mandi_prices_from_api(commodity="Maize", api_key="test-key")
        self.assertEqual(res1["cache_status"], "fresh")
        self.assertIn("cached_at", res1)
        self.assertIn("expires_at", res1)
        self.assertIn("source_retrieved_at", res1)

        # Fetch 2: Cache hit
        res2 = fetch_mandi_prices_from_api(commodity="Maize", api_key="test-key")
        self.assertEqual(res2["cache_status"], "cached")
        self.assertEqual(res2["cached_at"], res1["cached_at"])
        self.assertEqual(res2["expires_at"], res1["expires_at"])
        self.assertEqual(res2["source_retrieved_at"], res1["source_retrieved_at"])

    # 8. Empty result handling
    @patch("urllib.request.urlopen")
    def test_empty_result_handling(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.status = 200
        mock_payload = {"records": []}
        mock_response.read.return_value = str(mock_payload).replace("'", '"').encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response

        res = fetch_mandi_prices_from_api(commodity="UnknownCrop", api_key="test-key")
        self.assertTrue(res["success"])
        self.assertEqual(res["data"], [])
        self.assertEqual(res["source_status"], "available")

    # 9. API timeout & error handling
    @patch("urllib.request.urlopen")
    def test_api_timeout_error_handling(self, mock_urlopen):
        import socket
        mock_urlopen.side_effect = socket.timeout("Connection timed out")

        res = fetch_mandi_prices_from_api(
            commodity="Tomato",
            api_key="test-key",
            timeout=1,
            max_retries=1,
        )

        self.assertFalse(res["success"])
        self.assertEqual(res["source_status"], "unavailable")
        self.assertEqual(res.get("error_code"), "MANDI_API_TIMEOUT")
        self.assertIn("temporarily unavailable", res["message"])
        self.assertEqual(res["data"], [])


if __name__ == "__main__":
    unittest.main()
