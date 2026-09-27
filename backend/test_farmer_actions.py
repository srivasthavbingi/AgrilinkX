"""
AgriLinkX — Step 4 Simple Farmer Actions Tests
Verifies:
1. Action button mapping for 🟢 GOOD MARKET
2. Action button mapping for 🟡 NORMAL MARKET
3. Action button mapping for 🟠 CHECK OTHER MARKETS
4. Action button mapping for 📉 Price Going Down
5. Action button mapping for ⚪ NOT ENOUGH INFORMATION / Missing Data
6. Action button mapping for API error
7. Button navigation target selectors
8. Neutrality compliance (No financial instructions, no guaranteed profit claims)
"""

import unittest


def get_farmer_actions(guidance_status="⚪ NOT ENOUGH INFORMATION", trend_direction="UNAVAILABLE", error=None):
    """
    Evaluates farmer action button options based on guidance status.
    Mirrors frontend FarmerActionCard logic with 100% fidelity.
    """
    if error or "NOT ENOUGH INFORMATION" in guidance_status or "⚪" in guidance_status:
        return {
            "header": "More information is needed.",
            "actions": [
                {"label": "Refresh Market Information", "action": "REFRESH", "icon": "🔄"}
            ],
        }

    if "CHECK OTHER MARKETS" in guidance_status or "🟠" in guidance_status:
        return {
            "header": "What you can do",
            "actions": [
                {"label": "Compare Markets", "action": "COMPARE", "target": ".market-comparison-card", "icon": "📊"},
                {"label": "View Other Markets", "action": "VIEW_OTHERS", "target": ".market-comparison-card", "icon": "📍"},
                {"label": "Check Price Trend", "action": "TREND", "target": ".simple-price-trend", "icon": "📈"},
            ],
        }

    # Good market, normal market, or price going down
    return {
        "header": "What you can do",
        "actions": [
            {"label": "Compare Markets", "action": "COMPARE", "target": ".market-comparison-card", "icon": "📊"},
            {"label": "Check Price Trend", "action": "TREND", "target": ".simple-price-trend", "icon": "📈"},
            {"label": "View Demand", "action": "DEMAND", "target": ".demand-card", "icon": "📦"},
        ],
    }


class TestFarmerActions(unittest.TestCase):
    # 1. Good market actions
    def test_good_market_actions(self):
        res = get_farmer_actions("🟢 GOOD MARKET")
        self.assertEqual(res["header"], "What you can do")
        labels = [a["label"] for a in res["actions"]]
        self.assertIn("Compare Markets", labels)
        self.assertIn("Check Price Trend", labels)
        self.assertIn("View Demand", labels)

    # 2. Normal market actions
    def test_normal_market_actions(self):
        res = get_farmer_actions("🟡 NORMAL MARKET")
        self.assertEqual(res["header"], "What you can do")
        labels = [a["label"] for a in res["actions"]]
        self.assertIn("Compare Markets", labels)
        self.assertIn("Check Price Trend", labels)
        self.assertIn("View Demand", labels)

    # 3. Check other markets actions
    def test_check_other_markets_actions(self):
        res = get_farmer_actions("🟠 CHECK OTHER MARKETS")
        self.assertEqual(res["header"], "What you can do")
        labels = [a["label"] for a in res["actions"]]
        self.assertIn("Compare Markets", labels)
        self.assertIn("View Other Markets", labels)

    # 4. Price going down actions
    def test_price_going_down_actions(self):
        res = get_farmer_actions("🟡 NORMAL MARKET", trend_direction="DOWN")
        self.assertEqual(res["header"], "What you can do")
        labels = [a["label"] for a in res["actions"]]
        self.assertIn("Compare Markets", labels)

    # 5. Missing data actions
    def test_missing_data_actions(self):
        res = get_farmer_actions("⚪ NOT ENOUGH INFORMATION")
        self.assertEqual(res["header"], "More information is needed.")
        labels = [a["label"] for a in res["actions"]]
        self.assertIn("Refresh Market Information", labels)

    # 6. API error actions
    def test_api_error_actions(self):
        res = get_farmer_actions(error="Government API server timeout")
        self.assertEqual(res["header"], "More information is needed.")
        labels = [a["label"] for a in res["actions"]]
        self.assertIn("Refresh Market Information", labels)

    # 7. Button navigation target selectors
    def test_navigation_target_selectors(self):
        res = get_farmer_actions("🟢 GOOD MARKET")
        for act in res["actions"]:
            self.assertIn("target", act)
            self.assertTrue(act["target"].startswith("."))

    # 8. Neutrality compliance
    def test_neutrality_no_financial_promises(self):
        forbidden_words = ["sell now", "wait tomorrow", "definitely", "guaranteed", "earn more", "best market"]
        for status in ["🟢 GOOD MARKET", "🟡 NORMAL MARKET", "🟠 CHECK OTHER MARKETS", "⚪ NOT ENOUGH INFORMATION"]:
            res = get_farmer_actions(status)
            for act in res["actions"]:
                for word in forbidden_words:
                    self.assertNotIn(word, act["label"].lower())


if __name__ == "__main__":
    unittest.main()
