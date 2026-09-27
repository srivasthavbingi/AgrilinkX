"""
AgriLinkX — Historical Mandi Data Collection Service
Fetches, validates, normalizes, and upserts historical Government Mandi data (data.gov.in / AGMARKNET).
Target Table: mandi_price_history
Security: Uses DATAGOV_API_KEY from backend environment. Never exposes API key to client or logs.
"""

import os
import sys
import time
import argparse
import datetime
from typing import Dict, Any, List, Optional, Tuple

# Add parent backend directory to sys.path if invoked directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from market_data_service import (
    fetch_mandi_prices_from_api,
    map_commodity_name,
    SOURCE_NAME,
)

# In-Memory Database Store for testing and fallback when Supabase is not connected
MANDI_PRICE_HISTORY_DB: List[Dict[str, Any]] = []


def parse_date(date_input: Any) -> Optional[datetime.date]:
    """Parse various date string formats (YYYY-MM-DD or DD/MM/YYYY) into datetime.date."""
    if not date_input:
        return None
    if isinstance(date_input, datetime.date):
        return date_input
    d_str = str(date_input).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.datetime.strptime(d_str, fmt).date()
        except ValueError:
            continue
    return None


def validate_and_normalize_record(record: Dict[str, Any]) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
    """
    Validate raw or normalized government mandi record.
    Rejects invalid records when:
    - commodity is missing/empty
    - market is missing/empty
    - arrival_date is invalid
    - modal_price is missing or negative
    """
    if not isinstance(record, dict):
        return False, "Record is not a dictionary", None

    commodity = (record.get("commodity") or "").strip()
    if not commodity:
        return False, "Missing commodity", None

    market = (record.get("market") or "").strip()
    if not market:
        return False, "Missing market", None

    raw_date = record.get("arrival_date") or record.get("date")
    parsed_d = parse_date(raw_date)
    if not parsed_d:
        return False, f"Invalid arrival_date: {raw_date}", None

    formatted_date_str = parsed_d.strftime("%Y-%m-%d")

    def _to_float(val: Any) -> Optional[float]:
        if val is None or val == "":
            return None
        try:
            f = float(val)
            return f if f >= 0 else None
        except (ValueError, TypeError):
            return None

    # Handle prices in quintal vs per kg
    modal_p = _to_float(record.get("modal_price") or record.get("modal_price_quintal"))
    if modal_p is None:
        return False, "Invalid or missing modal price", None

    min_p = _to_float(record.get("min_price") or record.get("min_price_quintal"))
    max_p = _to_float(record.get("max_price") or record.get("max_price_quintal"))

    original_unit = record.get("original_price_unit") or record.get("price_unit") or "Rs/Quintal"
    is_quintal = "quintal" in str(original_unit).lower()

    if is_quintal:
        modal_price_quintal = modal_p
        min_price_quintal = min_p
        max_price_quintal = max_p
        modal_price_per_kg = round(modal_p / 100.0, 2)
    else:
        modal_price_per_kg = round(modal_p, 2)
        modal_price_quintal = round(modal_p * 100.0, 2)
        min_price_quintal = round(min_p * 100.0, 2) if min_p is not None else None
        max_price_quintal = round(max_p * 100.0, 2) if max_p is not None else None

    validated_record = {
        "arrival_date": formatted_date_str,
        "state": (record.get("state") or "").strip() or None,
        "district": (record.get("district") or "").strip() or None,
        "market": market,
        "commodity": commodity,
        "variety": (record.get("variety") or "").strip() or None,
        "grade": (record.get("grade") or "").strip() or None,
        "min_price_quintal": min_price_quintal,
        "max_price_quintal": max_price_quintal,
        "modal_price_quintal": modal_price_quintal,
        "modal_price_per_kg": modal_price_per_kg,
        "source": record.get("source") or SOURCE_NAME,
    }

    return True, None, validated_record


def clear_history_db() -> None:
    """Clear in-memory history DB (useful for testing)."""
    global MANDI_PRICE_HISTORY_DB
    MANDI_PRICE_HISTORY_DB.clear()



class MandiHistoryCollector:
    """
    Historical Government Mandi Data Collector.
    Handles multi-date fetching, validation, rate-limiting, and upserting into database.
    """

    def __init__(self, supabase_client: Optional[Any] = None):
        self.sb = supabase_client

    def _get_unique_key(self, record: Dict[str, Any]) -> Tuple:
        """Construct unique tuple key matching table constraint."""
        return (
            record.get("arrival_date"),
            record.get("state"),
            record.get("district"),
            record.get("market"),
            record.get("commodity"),
            record.get("variety"),
            record.get("grade"),
        )

    def is_duplicate_in_memory(self, record: Dict[str, Any]) -> bool:
        """Check if record already exists in in-memory store."""
        key = self._get_unique_key(record)
        return any(self._get_unique_key(existing) == key for existing in MANDI_PRICE_HISTORY_DB)

    def upsert_records(self, valid_records: List[Dict[str, Any]]) -> Tuple[int, int]:
        """
        Upsert records into Supabase or in-memory DB.
        Returns: (inserted_count, duplicates_skipped)
        """
        inserted = 0
        duplicates = 0

        for r in valid_records:
            if self.is_duplicate_in_memory(r):
                duplicates += 1
            else:
                MANDI_PRICE_HISTORY_DB.append(r)
                inserted += 1

        # If live Supabase client exists, attempt table upsert
        if self.sb and valid_records:
            try:
                self.sb.table("mandi_price_history").upsert(
                    valid_records,
                    on_conflict="arrival_date,state,district,market,commodity,variety,grade",
                ).execute()
            except Exception as e:
                print(f"[MandiCollector] Supabase upsert note: {e}")

        return inserted, duplicates

    def collect_history(
        self,
        start_date: str,
        end_date: str,
        state: Optional[str] = None,
        district: Optional[str] = None,
        commodity: Optional[str] = None,
        market: Optional[str] = None,
        api_key: Optional[str] = None,
        delay_seconds: float = 0.2,
    ) -> Dict[str, Any]:
        """
        Main historical collection routine over a specified date range.
        """
        start_d = parse_date(start_date)
        end_d = parse_date(end_date)

        if not start_d or not end_d:
            raise ValueError(f"Invalid date range specified: {start_date} to {end_date}")

        if start_d > end_d:
            start_d, end_d = end_d, start_d

        total_days = (end_d - start_d).days + 1
        current_d = start_d

        total_fetched = 0
        total_inserted = 0
        total_duplicates = 0
        total_invalid = 0

        unique_commodities = set()
        unique_states = set()
        unique_districts = set()
        unique_markets = set()

        mapped_comm = map_commodity_name(commodity) if commodity else None

        last_api_message = None

        while current_d <= end_d:
            api_date_str = current_d.strftime("%d/%m/%Y")

            api_response = fetch_mandi_prices_from_api(
                commodity=mapped_comm,
                state=state,
                district=district,
                date=api_date_str,
                api_key=api_key,
            )

            if api_response.get("source_status") == "unavailable":
                last_api_message = api_response.get("message")

            raw_records = api_response.get("data", [])
            total_fetched += len(raw_records)

            valid_batch = []
            for raw_r in raw_records:
                is_valid, err_msg, norm_r = validate_and_normalize_record(raw_r)
                if not is_valid or not norm_r:
                    total_invalid += 1
                    continue

                if market and norm_r["market"].lower() != market.lower():
                    continue

                valid_batch.append(norm_r)
                if norm_r.get("commodity"):
                    unique_commodities.add(norm_r["commodity"])
                if norm_r.get("state"):
                    unique_states.add(norm_r["state"])
                if norm_r.get("district"):
                    unique_districts.add(norm_r["district"])
                if norm_r.get("market"):
                    unique_markets.add(norm_r["market"])

            if valid_batch:
                ins_count, dup_count = self.upsert_records(valid_batch)
                total_inserted += ins_count
                total_duplicates += dup_count

            current_d += datetime.timedelta(days=1)
            if current_d <= end_d and delay_seconds > 0:
                time.sleep(delay_seconds)

        status_str = "completed"
        if total_fetched == 0 and last_api_message:
            status_str = "failed"

        report = {
            "status": status_str,
            "message": last_api_message if total_fetched == 0 else "Successfully collected records.",
            "date_range": {
                "start": start_d.strftime("%Y-%m-%d"),
                "end": end_d.strftime("%Y-%m-%d"),
                "total_days": total_days,
            },
            "total_records_fetched": total_fetched,
            "new_records_inserted": total_inserted,
            "duplicates_skipped": total_duplicates,
            "invalid_records_skipped": total_invalid,
            "commodities": sorted(list(unique_commodities)),
            "states": sorted(list(unique_states)),
            "districts": sorted(list(unique_districts)),
            "markets": sorted(list(unique_markets)),
        }

        return report



def main():
    """CLI script for running historical mandi data collection."""
    parser = argparse.ArgumentParser(description="AgriLinkX Historical Mandi Data Collector")
    parser.add_argument("--start-date", required=True, help="Start date (YYYY-MM-DD)")
    parser.add_argument("--end-date", required=True, help="End date (YYYY-MM-DD)")
    parser.add_argument("--commodity", help="Optional commodity filter (e.g. Tomato)")
    parser.add_argument("--state", help="Optional state filter (e.g. Telangana)")
    parser.add_argument("--district", help="Optional district filter (e.g. Rangareddy)")
    parser.add_argument("--market", help="Optional market filter (e.g. Bowenpally)")

    args = parser.parse_args()

    collector = MandiHistoryCollector()
    print(f"[AgriLinkX] Starting Mandi History Collection: {args.start_date} to {args.end_date}...")
    report = collector.collect_history(
        start_date=args.start_date,
        end_date=args.end_date,
        commodity=args.commodity,
        state=args.state,
        district=args.district,
        market=args.market,
    )

    import json
    print("\n--- MANDI HISTORICAL COLLECTION REPORT ---")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
