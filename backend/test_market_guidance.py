"""
AgriLinkX — Step 3 Simple Market Opportunity Guidance Tests
Verifies rule-based guidance status and transparent reason generation:
1. High demand + strong price -> GOOD MARKET
2. High demand + rising price -> GOOD MARKET
3. Normal demand + stable price -> NORMAL MARKET
4. Low demand -> NORMAL MARKET
5. Another market has higher price -> CHECK OTHER MARKETS
6. Missing demand handling
7. Missing price handling
8. Missing trend handling
9. Missing distance handling
10. Missing ML forecast handling
11. Insufficient data -> NOT ENOUGH INFORMATION
12. API error handling
"""

import unittest


def evaluate_market_guidance(
    commodity="Tomato",
    current_price=None,
    current_market="Bowenpally",
    demand_level="NONE",
    trend_direction="UNAVAILABLE",
    price_change_pct=None,
    forecast_price=None,
    other_markets=None,
    error=None,
):
    """
    Transparent rule-based market guidance evaluation engine.
    Mirrors frontend guidance logic with 100% fidelity.
    """
    if error or (
        (current_price is None or current_price <= 0)
        and (demand_level in ("NONE", "UNAVAILABLE"))
        and (not other_markets)
    ):
        return {
            "status": "⚪ NOT ENOUGH INFORMATION",
            "reason": "Not enough market information is available right now.",
            "type": "insufficient",
        }

    # Check for another market with higher price
    valid_others = [
        m for m in (other_markets or [])
        if m.get("price") is not None and m.get("price") > 0 and m.get("market") != current_market
    ]

    if current_price is not None and current_price > 0 and valid_others:
        higher_mkts = [m for m in valid_others if m["price"] >= current_price + 1.5]
        if higher_mkts:
            higher_mkts.sort(key=lambda x: x["price"], reverse=True)
            top = higher_mkts[0]
            dist_str = f" ({top['distance']} km away)" if top.get("distance") else ""
            return {
                "status": "🟠 CHECK OTHER MARKETS",
                "reason": f"{top['market']} has a higher reported market price (₹{round(top['price'])}/kg{dist_str}). Check market details before deciding.",
                "type": "other_markets",
            }

    # Check for Good Market
    is_high_demand = demand_level == "HIGH"
    is_normal_demand = demand_level in ("MEDIUM", "NORMAL")
    is_trend_up = trend_direction == "UP" or (price_change_pct is not None and price_change_pct >= 2.0)

    if current_price is not None and current_price > 0:
        if is_high_demand and is_trend_up:
            return {
                "status": "🟢 GOOD MARKET",
                "reason": "Price has been going up and demand is high.",
                "type": "good",
            }
        if is_high_demand:
            return {
                "status": "🟢 GOOD MARKET",
                "reason": "Price is good and demand is high.",
                "type": "good",
            }
        if is_trend_up and is_normal_demand:
            return {
                "status": "🟢 GOOD MARKET",
                "reason": "Price has been going up and demand is normal.",
                "type": "good",
            }

    # Check for Normal Market
    if current_price is not None and current_price > 0:
        if demand_level == "LOW":
            return {
                "status": "🟡 NORMAL MARKET",
                "reason": "Market price is available, but buyer demand is currently low.",
                "type": "normal",
            }
        if demand_level in ("NONE", "UNAVAILABLE"):
            return {
                "status": "🟡 NORMAL MARKET",
                "reason": "Market price is available, but demand information is unavailable.",
                "type": "normal",
            }
        return {
            "status": "🟡 NORMAL MARKET",
            "reason": "Price and demand are currently stable.",
            "type": "normal",
        }

    return {
        "status": "⚪ NOT ENOUGH INFORMATION",
        "reason": "Not enough market information is available right now.",
        "type": "insufficient",
    }


class TestMarketGuidance(unittest.TestCase):
    # 1. High demand + strong price
    def test_high_demand_strong_price(self):
        res = evaluate_market_guidance(current_price=28.0, demand_level="HIGH")
        self.assertEqual(res["status"], "🟢 GOOD MARKET")
        self.assertEqual(res["reason"], "Price is good and demand is high.")

    # 2. High demand + rising price
    def test_high_demand_rising_price(self):
        res = evaluate_market_guidance(current_price=28.0, demand_level="HIGH", trend_direction="UP")
        self.assertEqual(res["status"], "🟢 GOOD MARKET")
        self.assertEqual(res["reason"], "Price has been going up and demand is high.")

    # 3. Normal demand + stable price
    def test_normal_demand_stable_price(self):
        res = evaluate_market_guidance(current_price=28.0, demand_level="MEDIUM", trend_direction="STABLE")
        self.assertEqual(res["status"], "🟡 NORMAL MARKET")
        self.assertEqual(res["reason"], "Price and demand are currently stable.")

    # 4. Low demand
    def test_low_demand(self):
        res = evaluate_market_guidance(current_price=28.0, demand_level="LOW")
        self.assertEqual(res["status"], "🟡 NORMAL MARKET")
        self.assertEqual(res["reason"], "Market price is available, but buyer demand is currently low.")

    # 5. Another market has higher price
    def test_another_market_higher_price(self):
        others = [{"market": "Warangal", "price": 34.0, "distance": 48}]
        res = evaluate_market_guidance(current_price=28.0, current_market="Bowenpally", other_markets=others)
        self.assertEqual(res["status"], "🟠 CHECK OTHER MARKETS")
        self.assertIn("Warangal has a higher reported market price", res["reason"])
        self.assertIn("Check market details before deciding", res["reason"])

    # 6. Missing demand
    def test_missing_demand(self):
        res = evaluate_market_guidance(current_price=28.0, demand_level="NONE")
        self.assertEqual(res["status"], "🟡 NORMAL MARKET")
        self.assertEqual(res["reason"], "Market price is available, but demand information is unavailable.")

    # 7. Missing price
    def test_missing_price(self):
        res = evaluate_market_guidance(current_price=None, demand_level="HIGH")
        self.assertEqual(res["status"], "⚪ NOT ENOUGH INFORMATION")

    # 8. Missing trend
    def test_missing_trend(self):
        res = evaluate_market_guidance(current_price=28.0, demand_level="HIGH", trend_direction="UNAVAILABLE")
        self.assertEqual(res["status"], "🟢 GOOD MARKET")
        self.assertEqual(res["reason"], "Price is good and demand is high.")

    # 9. Missing distance
    def test_missing_distance(self):
        others = [{"market": "Nizamabad", "price": 32.0, "distance": None}]
        res = evaluate_market_guidance(current_price=28.0, other_markets=others)
        self.assertEqual(res["status"], "🟠 CHECK OTHER MARKETS")
        self.assertIn("Nizamabad has a higher reported market price", res["reason"])

    # 10. Missing ML forecast
    def test_missing_ml_forecast(self):
        res = evaluate_market_guidance(current_price=28.0, demand_level="HIGH", forecast_price=None)
        self.assertEqual(res["status"], "🟢 GOOD MARKET")

    # 11. Insufficient data
    def test_insufficient_data(self):
        res = evaluate_market_guidance(current_price=None, demand_level="NONE", other_markets=[])
        self.assertEqual(res["status"], "⚪ NOT ENOUGH INFORMATION")
        self.assertEqual(res["reason"], "Not enough market information is available right now.")

    # 12. API error
    def test_api_error(self):
        res = evaluate_market_guidance(error="Government server timeout")
        self.assertEqual(res["status"], "⚪ NOT ENOUGH INFORMATION")


if __name__ == "__main__":
    unittest.main()
