"""
Unit tests for AgriLinkX Mandi History Collector (Phase 4B).
Tests:
1. Price conversion (Rs/Quintal -> Rs/kg)
2. Date parsing (YYYY-MM-DD, DD/MM/YYYY)
3. Duplicate handling (uniqueness constraint in memory)
4. Invalid record rejection (missing commodity/market, bad date, negative/missing price)
5. Empty API response handling
6. API failure handling
7. Successful multi-date collection and report generation
"""

import os
import unittest
from unittest.mock import patch, MagicMock

from ml.mandi_history_collector import (
    MandiHistoryCollector,
    validate_and_normalize_record,
    parse_date,
    clear_history_db,
    MANDI_PRICE_HISTORY_DB,
)


class TestMandiHistoryCollector(unittest.TestCase):

    def setUp(self):
        clear_history_db()

    def test_1_price_conversion_quintal_to_kg(self):
        """Test conversion of modal, min, max price from Rs/Quintal to Rs/kg."""
        raw_record = {
            "commodity": "Tomato",
            "market": "Bowenpally",
            "arrival_date": "13/09/2026",
            "modal_price": 2800,
            "min_price": 2400,
            "max_price": 3200,
            "price_unit": "Rs/Quintal",
        }
        is_valid, err, norm = validate_and_normalize_record(raw_record)
        self.assertTrue(is_valid)
        self.assertIsNotNone(norm)
        self.assertEqual(norm["modal_price_quintal"], 2800.0)
        self.assertEqual(norm["modal_price_per_kg"], 28.0)
        self.assertEqual(norm["min_price_quintal"], 2400.0)
        self.assertEqual(norm["max_price_quintal"], 3200.0)

    def test_2_date_parsing(self):
        """Test parsing various valid and invalid date strings."""
        self.assertIsNotNone(parse_date("2026-09-13"))
        self.assertIsNotNone(parse_date("13/09/2026"))
        self.assertIsNotNone(parse_date("13-09-2026"))
        self.assertIsNone(parse_date("invalid-date"))
        self.assertIsNone(parse_date(None))

    def test_3_duplicate_handling(self):
        """Test that duplicate records are identified and skipped."""
        collector = MandiHistoryCollector()
        rec = {
            "arrival_date": "2026-09-13",
            "state": "Telangana",
            "district": "Rangareddy",
            "market": "Bowenpally",
            "commodity": "Tomato",
            "variety": "Hybrid",
            "grade": "FAQ",
            "modal_price_per_kg": 28.0,
        }

        # First insert
        ins1, dup1 = collector.upsert_records([rec])
        self.assertEqual(ins1, 1)
        self.assertEqual(dup1, 0)

        # Second insert of identical record
        ins2, dup2 = collector.upsert_records([rec])
        self.assertEqual(ins2, 0)
        self.assertEqual(dup2, 1)
        self.assertEqual(len(MANDI_PRICE_HISTORY_DB), 1)

    def test_4_invalid_record_rejection(self):
        """Test rejection of records missing commodity, market, date, or with negative/missing price."""
        # Missing commodity
        v1, e1, _ = validate_and_normalize_record({"market": "Bowenpally", "arrival_date": "2026-09-13", "modal_price": 2800})
        self.assertFalse(v1)
        self.assertIn("Missing commodity", e1)

        # Missing market
        v2, e2, _ = validate_and_normalize_record({"commodity": "Tomato", "arrival_date": "2026-09-13", "modal_price": 2800})
        self.assertFalse(v2)
        self.assertIn("Missing market", e2)

        # Invalid date
        v3, e3, _ = validate_and_normalize_record({"commodity": "Tomato", "market": "Bowenpally", "arrival_date": "bad-date", "modal_price": 2800})
        self.assertFalse(v3)
        self.assertIn("Invalid arrival_date", e3)

        # Negative price
        v4, e4, _ = validate_and_normalize_record({"commodity": "Tomato", "market": "Bowenpally", "arrival_date": "2026-09-13", "modal_price": -500})
        self.assertFalse(v4)
        self.assertIn("Invalid or missing modal price", e4)

    @patch("ml.mandi_history_collector.fetch_mandi_prices_from_api")
    def test_5_empty_api_response_handling(self, mock_fetch):
        """Test collection behavior when Government API returns empty dataset."""
        mock_fetch.return_value = {"source_status": "available", "data": []}
        collector = MandiHistoryCollector()
        report = collector.collect_history(
            start_date="2026-09-01",
            end_date="2026-09-02",
            api_key="test-key",
            delay_seconds=0.0,
        )
        self.assertEqual(report["status"], "completed")
        self.assertEqual(report["total_records_fetched"], 0)
        self.assertEqual(report["new_records_inserted"], 0)

    @patch("ml.mandi_history_collector.fetch_mandi_prices_from_api")
    def test_6_api_failure_handling(self, mock_fetch):
        """Test collection behavior when Government API call returns network failure or unconfigured API key."""
        mock_fetch.return_value = {"source_status": "unavailable", "message": "Network error", "data": []}
        collector = MandiHistoryCollector()
        report = collector.collect_history(
            start_date="2026-09-01",
            end_date="2026-09-01",
            api_key="test-key",
            delay_seconds=0.0,
        )
        self.assertEqual(report["status"], "failed")
        self.assertEqual(report["message"], "Network error")
        self.assertEqual(report["total_records_fetched"], 0)
        self.assertEqual(report["new_records_inserted"], 0)


    @patch("ml.mandi_history_collector.fetch_mandi_prices_from_api")
    def test_7_successful_collection_and_upsert(self, mock_fetch):
        """Test full successful historical collection over date range."""
        mock_fetch.return_value = {
            "source_status": "available",
            "data": [
                {
                    "commodity": "Tomato",
                    "variety": "Hybrid",
                    "grade": "FAQ",
                    "state": "Telangana",
                    "district": "Rangareddy",
                    "market": "Bowenpally",
                    "min_price": "2400",
                    "max_price": "3200",
                    "modal_price": "2800",
                    "arrival_date": "13/09/2026",
                }
            ],
        }

        collector = MandiHistoryCollector()
        report = collector.collect_history(
            start_date="2026-09-12",
            end_date="2026-09-13",
            commodity="Tomato",
            api_key="test-key",
            delay_seconds=0.0,
        )

        self.assertEqual(report["status"], "completed")
        self.assertEqual(report["date_range"]["total_days"], 2)
        self.assertEqual(report["total_records_fetched"], 2)
        # Day 1 inserts record, Day 2 has identical date in mock payload so it's a duplicate
        self.assertGreaterEqual(report["new_records_inserted"], 1)
        self.assertIn("Tomato", report["commodities"])
        self.assertIn("Bowenpally", report["markets"])


if __name__ == "__main__":
    unittest.main()
