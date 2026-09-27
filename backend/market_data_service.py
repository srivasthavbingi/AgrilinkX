"""
AgriLinkX — Government Mandi Data Service (Production-Hardened)
Connects to Government of India Open Government Data Platform (data.gov.in / AGMARKNET API).
Resource ID: 9ef84268-d588-465a-a308-a864a43d0070
Provides real-time wholesale price fetching, normalization (Rs/Quintal -> Rs/kg), caching, error handling, retries, and strict data validation.
"""

import os
import json
import time
import math
import socket
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

# Load .env reliably using absolute path to backend/.env
try:
    from dotenv import load_dotenv
    _backend_dir = os.path.dirname(os.path.abspath(__file__))
    _env_path = os.path.join(_backend_dir, ".env")
    if os.path.exists(_env_path):
        load_dotenv(_env_path)
    else:
        load_dotenv()
except ImportError:
    pass

# Constants for Government Data Source
GOV_BASE_URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070"
RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"
SOURCE_NAME = "data.gov.in (AGMARKNET)"

# Commodity Mapping (AgriLinkX product -> Government Mandi Commodity)
COMMODITY_MAPPING: Dict[str, str] = {
    "tomato": "Tomato",
    "potato": "Potato",
    "onion": "Onion",
    "chilli": "Chilli",
    "chili": "Chilli",
    "green chilli": "Chilli",
    "red chilli": "Chilli",
    "spinach": "Spinach",
    "rice": "Rice",
    "toor dal": "Arhar (Tur/Red Gram)",
    "red gram": "Arhar (Tur/Red Gram)",
    "tea": "Tea",
    "turmeric": "Turmeric",
    "maize": "Maize",
}

# In-Memory Cache Store & Cache TTL (1 hour for daily market data)
_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 3600

# Track last successful retrieval UTC ISO timestamp
_LAST_SUCCESSFUL_RETRIEVAL: Optional[str] = None


def map_commodity_name(raw_commodity: Optional[str]) -> Optional[str]:
    """Map AgriLinkX product name to Government Mandi commodity name."""
    if not raw_commodity:
        return None
    cleaned = raw_commodity.strip().lower()
    return COMMODITY_MAPPING.get(cleaned, raw_commodity.strip().title())


def _build_cache_key(
    commodity: Optional[str],
    state: Optional[str],
    district: Optional[str],
    date: Optional[str],
) -> str:
    """Construct a unique cache key based on query filters."""
    return f"c={commodity or ''}|s={state or ''}|d={district or ''}|dt={date or ''}"


def _get_utc_now_iso() -> str:
    """Return current UTC timestamp in ISO format ending with Z."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def normalize_record(record: Dict[str, Any], retrieved_at: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Convert government raw record fields into clean AgriLinkX normalized structure.
    Reject invalid records (null, zero, negative, NaN, Inf price, empty market/commodity string).
    Government fields: state, district, market, commodity, variety, grade, min_price, max_price, modal_price, arrival_date
    """
    if not isinstance(record, dict):
        return None

    commodity = record.get("commodity")
    variety = record.get("variety")
    grade = record.get("grade")
    state = record.get("state")
    district = record.get("district")
    market = record.get("market")
    arrival_date = record.get("arrival_date") or record.get("date")

    # Reject if commodity or market is explicitly an empty string or whitespace
    if commodity is not None and not str(commodity).strip():
        return None
    if market is not None and not str(market).strip():
        return None

    commodity_str = str(commodity).strip() if commodity else "Unknown"
    market_str = str(market).strip() if market else "Local Mandi"
    variety_str = str(variety).strip() if variety else None
    grade_str = str(grade).strip() if grade else None
    state_str = str(state).strip() if state else None
    district_str = str(district).strip() if district else None
    date_str = str(arrival_date).strip() if arrival_date else None

    def _parse_valid_price(val: Any) -> Optional[float]:
        if val is None or val == "":
            return None
        try:
            f = float(val)
            if math.isnan(f) or math.isinf(f):
                return None
            return f
        except (ValueError, TypeError):
            return None

    modal_price = _parse_valid_price(record.get("modal_price"))
    # Rejection rule: modal price must be non-null and > 0
    if modal_price is None or modal_price <= 0:
        return None

    min_price = _parse_valid_price(record.get("min_price"))
    max_price = _parse_valid_price(record.get("max_price"))

    # Original unit reported by data.gov.in / AGMARKNET is Rs/Quintal
    original_price_unit = record.get("price_unit") or "Rs/Quintal"

    # Price Normalization: 1 Quintal = 100 kg. If unit is Rs/Quintal, divide modal price by 100.
    unit_lower = str(original_price_unit).lower()
    if "quintal" in unit_lower or "qtl" in unit_lower:
        normalized_price_per_kg = round(modal_price / 100.0, 2)
    else:
        normalized_price_per_kg = round(modal_price, 2)

    now_iso = retrieved_at or _get_utc_now_iso()

    return {
        "commodity": commodity_str,
        "variety": variety_str,
        "grade": grade_str,
        "state": state_str,
        "district": district_str,
        "market": market_str,
        "min_price": min_price,
        "max_price": max_price,
        "modal_price": modal_price,
        "original_price_unit": original_price_unit,
        "normalized_price_per_kg": normalized_price_per_kg,
        "date": date_str,
        "data_date": date_str,
        "retrieved_at": now_iso,
        "source": SOURCE_NAME,
    }


def deduplicate_records(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Deduplicate mandi records using identifying fields:
    (date, state, district, market, commodity, variety, grade)
    Preserves first valid occurrence without averaging.
    """
    seen = set()
    deduped = []
    for r in records:
        key = (
            r.get("date") or "",
            r.get("state") or "",
            r.get("district") or "",
            r.get("market") or "",
            r.get("commodity") or "",
            r.get("variety") or "",
            r.get("grade") or "",
        )
        if key not in seen:
            seen.add(key)
            deduped.append(r)
    return deduped


def clear_cache() -> None:
    """Clear in-memory response cache (useful for testing)."""
    global _CACHE, _LAST_SUCCESSFUL_RETRIEVAL
    _CACHE = {}
    _LAST_SUCCESSFUL_RETRIEVAL = None


def get_health_status() -> Dict[str, Any]:
    """Return system health status for government mandi data service."""
    effective_api_key = os.getenv("DATAGOV_API_KEY", "").strip()
    is_configured = bool(
        effective_api_key and effective_api_key not in ["your-api-key-here", "xxxx", "placeholder"]
    )
    return {
        "success": True,
        "government_api_configured": is_configured,
        "cache_available": True,
        "last_successful_retrieval": _LAST_SUCCESSFUL_RETRIEVAL,
        "status": "healthy",
    }


def fetch_mandi_prices_from_api(
    commodity: Optional[str] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    date: Optional[str] = None,
    api_key: Optional[str] = None,
    timeout: int = 10,
    max_retries: int = 2,
) -> Dict[str, Any]:
    """
    Fetch market price data from data.gov.in API with parameters, caching, retries, and strict validation.
    """
    global _LAST_SUCCESSFUL_RETRIEVAL

    mapped_commodity = map_commodity_name(commodity) if commodity else None
    cache_key = _build_cache_key(mapped_commodity, state, district, date)
    now_epoch = time.time()
    now_iso = _get_utc_now_iso()

    # 1. Check in-memory cache
    if cache_key in _CACHE:
        cached_entry = _CACHE[cache_key]
        if now_epoch - cached_entry["timestamp"] < CACHE_TTL_SECONDS:
            cached_data = dict(cached_entry["data"])
            cached_data["cache_status"] = "cached"
            cached_data["cached_at"] = cached_entry["cached_at"]
            cached_data["source_retrieved_at"] = cached_entry["source_retrieved_at"]
            cached_data["expires_at"] = cached_entry["expires_at"]
            return cached_data

    # 2. Check API Key
    effective_api_key = api_key or os.getenv("DATAGOV_API_KEY", "").strip()
    if not effective_api_key or effective_api_key in ["your-api-key-here", "xxxx", "placeholder"]:
        return {
            "success": False,
            "source": SOURCE_NAME,
            "source_status": "unavailable",
            "message": "Government mandi service is not configured: DATAGOV_API_KEY is not configured.",
            "data": [],
            "retrieved_at": now_iso,
            "data_date": date or None,
            "cache_status": "fresh",
        }

    # 3. Build HTTP request query parameters
    params = {
        "api-key": effective_api_key,
        "format": "json",
        "limit": "100",
        "offset": "0",
    }
    if mapped_commodity:
        params["filters[commodity]"] = mapped_commodity
    if state:
        params["filters[state]"] = state
    if district:
        params["filters[district]"] = district
    if date:
        params["filters[arrival_date]"] = date

    query_string = urllib.parse.urlencode(params)
    request_url = f"{GOV_BASE_URL}?{query_string}"

    # Retry loop for transient errors (HTTP 429, 500, 502, 503, 504, timeout)
    attempt = 0
    last_error_code = None
    last_error_message = None

    while attempt <= max_retries:
        if attempt > 0:
            time.sleep(0.5 * (2 ** (attempt - 1)))  # Exponential backoff: 0.5s, 1.0s

        attempt += 1
        retrieved_at_iso = _get_utc_now_iso()

        try:
            req = urllib.request.Request(
                request_url,
                headers={"User-Agent": "AgriLinkX/2.0 MarketIntelligence"},
            )
            with urllib.request.urlopen(req, timeout=timeout) as response:
                status_code = response.status
                if status_code != 200:
                    last_error_message = f"Government server error HTTP {status_code}"
                    if status_code in (429, 500, 502, 503, 504):
                        continue  # Retry
                    else:
                        break  # Non-retryable HTTP error

                raw_bytes = response.read()
                json_data = json.loads(raw_bytes.decode("utf-8"))

                raw_records = json_data.get("records", [])
                valid_records = []
                for r in raw_records:
                    norm = normalize_record(r, retrieved_at=retrieved_at_iso)
                    if norm is not None:
                        valid_records.append(norm)

                deduped_records = deduplicate_records(valid_records)

                primary_date = date
                if not primary_date and deduped_records:
                    primary_date = deduped_records[0].get("data_date") or deduped_records[0].get("date")

                _LAST_SUCCESSFUL_RETRIEVAL = retrieved_at_iso

                expires_at_iso = datetime.fromtimestamp(
                    now_epoch + CACHE_TTL_SECONDS, tz=timezone.utc
                ).strftime("%Y-%m-%dT%H:%M:%SZ")

                result = {
                    "success": True,
                    "source": SOURCE_NAME,
                    "source_status": "available",
                    "retrieved_at": retrieved_at_iso,
                    "source_retrieved_at": retrieved_at_iso,
                    "cached_at": retrieved_at_iso,
                    "expires_at": expires_at_iso,
                    "data_date": primary_date,
                    "cache_status": "fresh",
                    "data": deduped_records,
                }

                # Cache successful response
                _CACHE[cache_key] = {
                    "timestamp": now_epoch,
                    "cached_at": retrieved_at_iso,
                    "source_retrieved_at": retrieved_at_iso,
                    "expires_at": expires_at_iso,
                    "data": result,
                }
                return result

        except (socket.timeout, TimeoutError):
            last_error_code = "MANDI_API_TIMEOUT"
            last_error_message = "Government mandi data is temporarily unavailable."
            continue  # Retry on timeout

        except urllib.error.HTTPError as exc:
            status_code = exc.code
            last_error_message = f"Government server error HTTP {status_code}"
            if status_code in (429, 500, 502, 503, 504):
                continue
            else:
                break

        except urllib.error.URLError as exc:
            reason_str = str(exc.reason)
            last_error_message = f"Government mandi data is temporarily unavailable: Network error ({reason_str})."
            if "timed out" in reason_str.lower() or "timeout" in reason_str.lower():
                last_error_code = "MANDI_API_TIMEOUT"
                continue
            break

        except (json.JSONDecodeError, KeyError, TypeError) as exc:
            last_error_message = f"Government market price temporarily unavailable: Invalid response format ({str(exc)})."
            break

        except Exception as exc:
            last_error_message = f"Government market price temporarily unavailable: {str(exc)}."
            break

    # If retries exhausted or non-retryable failure occurred
    now_fail_iso = _get_utc_now_iso()
    response_payload = {
        "success": False,
        "source": SOURCE_NAME,
        "source_status": "unavailable",
        "message": last_error_message or "Government market price temporarily unavailable.",
        "data": [],
        "retrieved_at": now_fail_iso,
        "data_date": date or None,
        "cache_status": "fresh",
    }
    if last_error_code:
        response_payload["error_code"] = last_error_code

    return response_payload

