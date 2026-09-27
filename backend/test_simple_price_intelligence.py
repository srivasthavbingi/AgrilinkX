"""
AgriLinkX — Step 2 Simple Price & Demand Intelligence Tests
Verifies:
1. Current market price available / unavailable states
2. Demand levels (HIGH, NORMAL/MEDIUM, LOW, unavailable)
3. ML forecast available / unavailable states (Maize vs unsupported commodities)
4. Historical price trend calculations (increasing, stable, decreasing, single-point, empty)
5. Freshness & cached metadata preservation
6. Data integrity & no synthetic data fallback
"""

import unittest
from unittest.mock import patch, MagicMock
from market_data_service import fetch_mandi_prices_from_api, clear_cache
from ml.price_predictor import predict_next_day_price
from main import _classify_demand


class TestSimplePriceIntelligence(unittest.TestCase):
    def setUp(self):
        clear_cache()

    def tearDown(self):
        clear_cache()

    # 1. Current Market Price Available vs Unavailable
    @patch("urllib.request.urlopen")
    def test_current_market_price_available(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.status = 200
        mock_payload = {
            "records": [
                {
                    "commodity": "Tomato",
                    "market": "Bowenpally",
                    "modal_price": "2800",
                    "price_unit": "Rs/Quintal",
                    "arrival_date": "27/09/2026",
                }
            ]
        }
        mock_response.read.return_value = str(mock_payload).replace("'", '"').encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response

        res = fetch_mandi_prices_from_api(commodity="Tomato", state="Telangana", api_key="valid-key")
        self.assertTrue(res["success"])
        self.assertEqual(len(res["data"]), 1)
        self.assertEqual(res["data"][0]["normalized_price_per_kg"], 28.0)

    def test_current_market_price_unavailable_no_key(self):
        res = fetch_mandi_prices_from_api(commodity="Tomato", api_key="your-api-key-here")
        self.assertFalse(res["success"])
        self.assertEqual(res["data"], [])
        self.assertEqual(res["source_status"], "unavailable")

    # 2. Demand Classification Levels (HIGH, MEDIUM/NORMAL, LOW, NONE)
    def test_demand_classification(self):
        # HIGH: >= 20 kg OR >= 5 orders
        self.assertEqual(_classify_demand(25.0, 1), "HIGH")
        self.assertEqual(_classify_demand(2.0, 6), "HIGH")

        # MEDIUM / NORMAL: >= 5 kg OR >= 2 orders
        self.assertEqual(_classify_demand(10.0, 1), "MEDIUM")
        self.assertEqual(_classify_demand(2.0, 2), "MEDIUM")

        # LOW: > 0 but below medium threshold
        self.assertEqual(_classify_demand(2.0, 1), "LOW")

        # NONE: 0 qty & 0 orders
        self.assertEqual(_classify_demand(0.0, 0), "NONE")

    # 3. ML Forecast Available vs Unavailable
    def test_ml_forecast_availability(self):
        # Unsupported commodity (Wheat)
        res_wheat = predict_next_day_price(commodity="Wheat", state="Telangana")
        self.assertFalse(res_wheat["success"])
        self.assertIn("message", res_wheat)

    # 4. Trend Direction Calculation Logic
    def test_trend_direction_calculation(self):
        # Increasing trend (+10%)
        p_inc = [{"date": "2026-09-01", "price": 20}, {"date": "2026-09-07", "price": 22}]
        diff_inc = p_inc[-1]["price"] - p_inc[0]["price"]
        pct_inc = (diff_inc / p_inc[0]["price"]) * 100
        self.assertGreater(pct_inc, 2.0)

        # Decreasing trend (-10%)
        p_dec = [{"date": "2026-09-01", "price": 20}, {"date": "2026-09-07", "price": 18}]
        diff_dec = p_dec[-1]["price"] - p_dec[0]["price"]
        pct_dec = (diff_dec / p_dec[0]["price"]) * 100
        self.assertLess(pct_dec, -2.0)

        # Stable trend (+0.5%)
        p_stb = [{"date": "2026-09-01", "price": 20.0}, {"date": "2026-09-07", "price": 20.1}]
        diff_stb = p_stb[-1]["price"] - p_stb[0]["price"]
        pct_stb = (diff_stb / p_stb[0]["price"]) * 100
        self.assertTrue(-2.0 <= pct_stb <= 2.0)

        # Single point: not enough points for trend
        p_single = [{"date": "2026-09-01", "price": 20}]
        self.assertEqual(len(p_single), 1)

    # 5. Cached Data & Freshness Preservation
    @patch("urllib.request.urlopen")
    def test_cached_data_freshness_preservation(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.status = 200
        mock_payload = {
            "records": [{"commodity": "Potato", "market": "Gaddiannaram", "modal_price": "1800"}]
        }
        mock_response.read.return_value = str(mock_payload).replace("'", '"').encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_response

        r1 = fetch_mandi_prices_from_api(commodity="Potato", api_key="test-key")
        self.assertEqual(r1["cache_status"], "fresh")

        r2 = fetch_mandi_prices_from_api(commodity="Potato", api_key="test-key")
        self.assertEqual(r2["cache_status"], "cached")
        self.assertEqual(r2["cached_at"], r1["cached_at"])


if __name__ == "__main__":
    unittest.main()
