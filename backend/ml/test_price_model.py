import os
import sys
import json
import unittest
from pathlib import Path

# Ensure project root is in sys.path
project_root = Path(__file__).resolve().parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from ml.train_price_model import (
    load_and_clean_data,
    engineer_features,
    get_project_root,
    EmaTrendRegressor
)
from ml.price_predictor import predict_next_day_price, PricePredictor


class TestPriceModel(unittest.TestCase):
    def test_csv_loading_and_cleaning(self):
        root = get_project_root()
        csv_path = root / "data" / "agmarknet_historical_sample.csv"
        self.assertTrue(csv_path.exists(), "CSV file must exist")
        
        raw_rows, telangana_rows, telangana_df = load_and_clean_data(csv_path)
        self.assertGreater(raw_rows, 0, "Raw rows must be > 0")
        self.assertGreater(telangana_rows, 0, "Telangana rows must be > 0")
        self.assertLess(telangana_rows, raw_rows, "Telangana filtering must filter dataset")
        
        self.assertIn("modal_price_per_kg", telangana_df.columns)
        self.assertIn("min_price", telangana_df.columns)
        self.assertIn("max_price", telangana_df.columns)
        
        first_row = telangana_df.iloc[0]
        self.assertAlmostEqual(first_row["modal_price_per_kg"], first_row["Modal_Price"] / 100.0, places=4)

    def test_feature_engineering_no_leakage(self):
        root = get_project_root()
        csv_path = root / "data" / "agmarknet_historical_sample.csv"
        _, _, telangana_df = load_and_clean_data(csv_path)
        
        clean_df, feature_names, target_name = engineer_features(telangana_df)
        
        self.assertEqual(target_name, "target")
        self.assertIn(target_name, clean_df.columns)
        self.assertIn("lag_1", feature_names)
        self.assertIn("ema_3", feature_names)
        
        self.assertEqual(clean_df[target_name].isna().sum(), 0, "Target must have no NaNs")
        self.assertEqual(clean_df["lag_1"].isna().sum(), 0, "lag_1 must have no NaNs")

    def test_chronological_split_and_artifacts(self):
        ml_dir = Path(__file__).resolve().parent
        model_dir = ml_dir / "models"
        model_path = model_dir / "maize_price_model.joblib"
        meta_path = model_dir / "maize_price_model_metadata.json"
        
        self.assertTrue(model_path.exists(), "Model joblib file must exist")
        self.assertTrue(meta_path.exists(), "Metadata JSON file must exist")
        
        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
            
        self.assertEqual(meta["commodity"], "Maize")
        self.assertEqual(meta["state"], "Telangana")
        self.assertIn("MAE", meta)
        self.assertIn("R2", meta)
        self.assertGreater(meta["training_rows"], 0)
        self.assertGreater(meta["test_rows"], 0)
        self.assertIn("improvement_vs_naive_percent", meta)
        
        # Verify comparison report files exist
        csv_report = ml_dir / "model_comparison_report.csv"
        json_report = ml_dir / "model_comparison_report.json"
        self.assertTrue(csv_report.exists(), "CSV report must exist")
        self.assertTrue(json_report.exists(), "JSON report must exist")

    def test_predictor_numeric_output_and_range(self):
        res = predict_next_day_price(commodity="Maize", state="Telangana")
        self.assertTrue(res["success"])
        self.assertIsInstance(res["predicted_price_per_kg"], (int, float))
        self.assertGreater(res["predicted_price_per_kg"], 0)
        self.assertEqual(res["commodity"], "Maize")
        self.assertEqual(res["state"], "Telangana")
        self.assertIn("typical_price_range", res)
        self.assertIn("min", res["typical_price_range"])
        self.assertIn("max", res["typical_price_range"])
        self.assertLessEqual(res["typical_price_range"]["min"], res["predicted_price_per_kg"])
        self.assertGreaterEqual(res["typical_price_range"]["max"], res["predicted_price_per_kg"])
        self.assertIn("disclaimer", res)

    def test_unsupported_commodity(self):
        res = predict_next_day_price(commodity="Wheat", state="Telangana")
        self.assertFalse(res["success"])
        self.assertIn("message", res)


if __name__ == "__main__":
    unittest.main()
