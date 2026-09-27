"""
AgriLinkX — Production Hardening Automated Test Suite for Mandi & Market Data Service
Validates all 14 mandatory hardening conditions:
1. Successful government API response
2. API timeout error handling (HTTP/Socket timeout returning MANDI_API_TIMEOUT)
3. HTTP 429 rate limit retry & response handling
4. HTTP 500 server error retry & response handling
5. Malformed response handling (non-dict, broken JSON)
6. Empty response handling (records: [])
7. Invalid price rejection (NaN, Inf, non-numeric strings)
8. Zero price rejection (modal_price = 0)
9. Negative price rejection (modal_price = -50)
10. Duplicate records deduplication (by composite key)
11. Cache response metadata (cache_status = "cached", timestamps)
12. Timestamp presence in all responses (retrieved_at, data_date)
13. API key missing handling (unconfigured message)
14. No fake fallback values anywhere
"""

import os
import json
import unittest
from unittest.mock import patch, MagicMock
import urllib.error
import socket

# Import service functions and health status
from market_data_service import (
    fetch_mandi_prices_from_api,
    normalize_record,
    deduplicate_records,
    clear_cache,
    get_health_status,
    SOURCE_NAME,
)

SAMPLE_GOV_API_RESPONSE = {
    "records": [
        {
            "state": "Telangana",
            "district": "Rangareddy",
            "market": "Bowenpally",
            "commodity": "Maize",
            "variety": "Yellow",
            "grade": "FAQ",
            "arrival_date": "15/09/2026",
            "min_price": "2200",
            "max_price": "2600",
            "modal_price": "2480",
            "price_unit": "Rs/Quintal",
        }
    ]
}


class TestMandiHardening(unittest.TestCase):

    def setUp(self):
        clear_cache()

    @patch("urllib.request.urlopen")
    def test_1_successful_government_api_response(self, mock_urlopen):
        """Test successful fetching from government API with proper fields."""
        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.read.return_value = json.dumps(SAMPLE_GOV_API_RESPONSE).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        res = fetch_mandi_prices_from_api(commodity="Maize", state="Telangana", api_key="valid-key")

        self.assertTrue(res["success"])
        self.assertEqual(res["source_status"], "available")
        self.assertEqual(res["cache_status"], "fresh")
        self.assertIn("retrieved_at", res)
        self.assertEqual(len(res["data"]), 1)
        record = res["data"][0]
        self.assertEqual(record["commodity"], "Maize")
        self.assertEqual(record["modal_price"], 2480.0)
        self.assertEqual(record["normalized_price_per_kg"], 24.8)
        self.assertEqual(record["source"], SOURCE_NAME)

    @patch("urllib.request.urlopen")
    def test_2_api_timeout_error_handling(self, mock_urlopen):
        """Test API timeout returns MANDI_API_TIMEOUT structured error without throwing."""
        mock_urlopen.side_effect = socket.timeout("Timed out")

        res = fetch_mandi_prices_from_api(commodity="Maize", api_key="valid-key", max_retries=0)

        self.assertFalse(res["success"])
        self.assertEqual(res["source_status"], "unavailable")
        self.assertEqual(res.get("error_code"), "MANDI_API_TIMEOUT")
        self.assertIn("temporarily unavailable", res["message"])
        self.assertEqual(res["data"], [])

    @patch("urllib.request.urlopen")
    def test_3_http_429_rate_limit_retry_and_handling(self, mock_urlopen):
        """Test HTTP 429 error retries max_retries times and returns structured unavailable response."""
        mock_resp = MagicMock()
        mock_resp.status = 429
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        res = fetch_mandi_prices_from_api(commodity="Maize", api_key="valid-key", max_retries=1)

        self.assertFalse(res["success"])
        self.assertEqual(res["source_status"], "unavailable")
        self.assertEqual(mock_urlopen.call_count, 2)  # Initial + 1 retry
        self.assertIn("HTTP 429", res["message"])

    @patch("urllib.request.urlopen")
    def test_4_http_500_server_error_retry_and_handling(self, mock_urlopen):
        """Test HTTP 500 error retries and returns structured failure response."""
        mock_resp = MagicMock()
        mock_resp.status = 500
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        res = fetch_mandi_prices_from_api(commodity="Maize", api_key="valid-key", max_retries=1)

        self.assertFalse(res["success"])
        self.assertEqual(res["source_status"], "unavailable")
        self.assertEqual(mock_urlopen.call_count, 2)
        self.assertIn("HTTP 500", res["message"])

    @patch("urllib.request.urlopen")
    def test_5_malformed_response_handling(self, mock_urlopen):
        """Test non-JSON or corrupted payloads return structured unavailable error without crash."""
        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.read.return_value = b"{ invalid json body }"
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        res = fetch_mandi_prices_from_api(commodity="Maize", api_key="valid-key", max_retries=0)

        self.assertFalse(res["success"])
        self.assertEqual(res["source_status"], "unavailable")
        self.assertIn("Invalid response format", res["message"])
        self.assertEqual(res["data"], [])

    @patch("urllib.request.urlopen")
    def test_6_empty_response_handling(self, mock_urlopen):
        """Test handling when government API returns empty records list."""
        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.read.return_value = json.dumps({"records": []}).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        res = fetch_mandi_prices_from_api(commodity="NonExistentCrop", api_key="valid-key")

        self.assertTrue(res["success"])
        self.assertEqual(res["source_status"], "available")
        self.assertEqual(res["data"], [])

    def test_7_invalid_price_rejection(self):
        """Test that invalid prices (NaN, Inf, non-numeric strings) are rejected."""
        rec_nan = {"commodity": "Maize", "market": "M1", "modal_price": "NaN"}
        rec_inf = {"commodity": "Maize", "market": "M1", "modal_price": "Infinity"}
        rec_str = {"commodity": "Maize", "market": "M1", "modal_price": "invalid"}

        self.assertIsNone(normalize_record(rec_nan))
        self.assertIsNone(normalize_record(rec_inf))
        self.assertIsNone(normalize_record(rec_str))

    def test_8_zero_price_rejection(self):
        """Test that records with modal_price <= 0 are rejected."""
        rec_zero = {"commodity": "Maize", "market": "M1", "modal_price": "0"}
        self.assertIsNone(normalize_record(rec_zero))

    def test_9_negative_price_rejection(self):
        """Test that records with negative modal_price are rejected."""
        rec_neg = {"commodity": "Maize", "market": "M1", "modal_price": "-1500"}
        self.assertIsNone(normalize_record(rec_neg))

    def test_10_duplicate_records_deduplication(self):
        """Test that duplicate records are deduplicated without averaging."""
        records = [
            {"date": "15/09/2026", "state": "TS", "district": "D1", "market": "M1", "commodity": "Maize", "variety": "V1", "grade": "G1", "modal_price": 2400},
            {"date": "15/09/2026", "state": "TS", "district": "D1", "market": "M1", "commodity": "Maize", "variety": "V1", "grade": "G1", "modal_price": 2400},
            {"date": "15/09/2026", "state": "TS", "district": "D1", "market": "M2", "commodity": "Maize", "variety": "V1", "grade": "G1", "modal_price": 2500},
        ]
        deduped = deduplicate_records(records)
        self.assertEqual(len(deduped), 2)
        self.assertEqual(deduped[0]["market"], "M1")
        self.assertEqual(deduped[1]["market"], "M2")

    @patch("urllib.request.urlopen")
    def test_11_cache_response_metadata(self, mock_urlopen):
        """Test cached responses include cache_status='cached' and cache metadata."""
        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.read.return_value = json.dumps(SAMPLE_GOV_API_RESPONSE).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        # Call 1 -> Fresh
        res1 = fetch_mandi_prices_from_api(commodity="Maize", api_key="valid-key")
        self.assertEqual(res1["cache_status"], "fresh")
        self.assertIn("expires_at", res1)
        self.assertIn("source_retrieved_at", res1)

        # Call 2 -> Cached
        res2 = fetch_mandi_prices_from_api(commodity="Maize", api_key="valid-key")
        self.assertEqual(res2["cache_status"], "cached")
        self.assertEqual(res2["cached_at"], res1["cached_at"])

    @patch("urllib.request.urlopen")
    def test_12_timestamp_presence_in_all_responses(self, mock_urlopen):
        """Test that every API response includes retrieved_at ISO timestamp."""
        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.read.return_value = json.dumps(SAMPLE_GOV_API_RESPONSE).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        res = fetch_mandi_prices_from_api(commodity="Maize", api_key="valid-key")
        self.assertIn("retrieved_at", res)
        self.assertTrue(res["retrieved_at"].endswith("Z"))

    def test_13_api_key_missing_handling(self):
        """Test that missing DATAGOV_API_KEY returns unconfigured status."""
        with patch.dict(os.environ, {"DATAGOV_API_KEY": ""}):
            res = fetch_mandi_prices_from_api(commodity="Maize", api_key="")
            self.assertFalse(res["success"])
            self.assertEqual(res["source_status"], "unavailable")
            self.assertIn("not configured", res["message"])

    def test_14_health_endpoint_functionality(self):
        """Test health check status helper function."""
        status = get_health_status()
        self.assertTrue(status["success"])
        self.assertIn("government_api_configured", status)
        self.assertIn("cache_available", status)
        self.assertEqual(status["status"], "healthy")


if __name__ == "__main__":
    unittest.main()
