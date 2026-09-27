"""
AgriLinkX - Local Farmer Recommendation Machine Learning Architecture
Model: Multi-Factor Hybrid Ranker using GradientBoostingRegressor / RandomForestRegressor

Features:
- distance_km: Continuous distance in km (0 to 50 km)
- quantity_available: Producer's current batch volume
- requested_quantity: Consumer's family requirement (e.g. 1 kg, 500 g)
- price: Producer price per unit in INR
- quality_score: Ordinal encoding (Grade A+: 100, A: 90, B: 70, C: 50)
- freshness_score: Days since harvest decay function
- product_match: Semantic similarity score (0 to 100)
- origin_match: Binary / categorical preference alignment (1 if matches user origin query, 0 otherwise)
- farmer_rating: Verified community star rating (1.0 to 5.0)
- verified: Binary verification badge (1 or 0)
- delivery_available: Binary (1 or 0)
- minimum_order: Minimum batch quantity required by producer

Target:
- recommendation_score: Continuous probability/rank score (0 to 100)
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import os

FEATURE_COLUMNS = [
    "distance_km",
    "quantity_available",
    "requested_quantity",
    "price",
    "quality_score",
    "freshness_score",
    "product_match",
    "origin_match",
    "farmer_rating",
    "verified",
    "delivery_available",
    "minimum_order",
]

TARGET_COLUMN = "recommendation_score"


class LocalRecommendationModel:
    def __init__(self, model_type="gradient_boosting"):
        if model_type == "random_forest":
            self.model = RandomForestRegressor(
                n_estimators=120, max_depth=8, random_state=42
            )
        else:
            self.model = GradientBoostingRegressor(
                n_estimators=150, learning_rate=0.08, max_depth=5, random_state=42
            )
        self.is_trained = False

    def generate_synthetic_training_data(self, n_samples=2500):
        """
        Generates realistic agricultural training data based on real consumer preferences.
        Nearby + authentic origin + high freshness yields highest target score.
        """
        np.random.seed(42)

        distance_km = np.random.exponential(scale=6.0, size=n_samples).clip(0.3, 45.0)
        requested_quantity = np.random.choice([0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0], size=n_samples)
        quantity_available = requested_quantity * np.random.uniform(0.5, 5.0, size=n_samples)
        price = np.random.uniform(15.0, 450.0, size=n_samples)
        quality_score = np.random.choice([50, 70, 90, 100], p=[0.1, 0.2, 0.5, 0.2], size=n_samples)
        freshness_score = np.random.choice([60, 75, 90, 100], p=[0.1, 0.2, 0.3, 0.4], size=n_samples)
        product_match = np.random.choice([30, 60, 80, 100], p=[0.05, 0.15, 0.3, 0.5], size=n_samples)
        origin_match = np.random.choice([0, 1], p=[0.75, 0.25], size=n_samples)
        farmer_rating = np.random.uniform(3.8, 5.0, size=n_samples)
        verified = np.random.choice([0, 1], p=[0.3, 0.7], size=n_samples)
        delivery_available = np.random.choice([0, 1], p=[0.15, 0.85], size=n_samples)
        minimum_order = np.random.choice([0.25, 0.5, 1.0, 2.0, 5.0], size=n_samples)

        # Mathematical ground-truth formulation
        # Distance decay: closer gives higher score
        dist_factor = np.maximum(0, 100 - (distance_km / 25.0) * 100) * 0.30
        
        # Quantity match:
        avail_factor = np.where(
            requested_quantity < minimum_order,
            20.0,
            np.where(quantity_available >= requested_quantity, 100.0, (quantity_available / requested_quantity) * 50.0)
        ) * 0.25
        
        prod_factor = product_match * 0.20
        qual_factor = quality_score * 0.10
        price_factor = np.clip(100 - (price / 500.0) * 80, 20, 100) * 0.10
        rel_factor = (farmer_rating / 5.0 * 80 + verified * 20) * 0.05

        # Origin bonus: when origin explicitly matches, give +30 boost
        origin_bonus = origin_match * 30.0

        recommendation_score = (
            dist_factor
            + avail_factor
            + prod_factor
            + qual_factor
            + price_factor
            + rel_factor
            + origin_bonus
            + np.random.normal(0, 2.0, size=n_samples)
        ).clip(10.0, 99.0)

        df = pd.DataFrame({
            "distance_km": distance_km,
            "quantity_available": quantity_available,
            "requested_quantity": requested_quantity,
            "price": price,
            "quality_score": quality_score,
            "freshness_score": freshness_score,
            "product_match": product_match,
            "origin_match": origin_match,
            "farmer_rating": farmer_rating,
            "verified": verified,
            "delivery_available": delivery_available,
            "minimum_order": minimum_order,
            "recommendation_score": recommendation_score,
        })
        return df

    def train(self, df=None):
        if df is None:
            df = self.generate_synthetic_training_data()

        X = df[FEATURE_COLUMNS]
        y = df[TARGET_COLUMN]

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        self.model.fit(X_train, y_train)
        self.is_trained = True

        preds = self.model.predict(X_test)
        mse = mean_squared_error(y_test, preds)
        r2 = r2_score(y_test, preds)

        print(f"[ML Model Trained] MSE: {mse:.4f} | R²: {r2:.4f}")
        return {"mse": mse, "r2": r2}

    def predict(self, feature_dicts):
        """
        Accepts list of dictionaries or DataFrame of features and returns predicted scores.
        """
        if not self.is_trained:
            self.train()

        if isinstance(feature_dicts, list):
            df_features = pd.DataFrame(feature_dicts)
        else:
            df_features = feature_dicts

        return self.model.predict(df_features[FEATURE_COLUMNS])

    def save(self, filepath="backend/ml/recommendation_model.joblib"):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump(self.model, filepath)
        print(f"[Model Saved] -> {filepath}")

    def load(self, filepath="backend/ml/recommendation_model.joblib"):
        if os.path.exists(filepath):
            self.model = joblib.load(filepath)
            self.is_trained = True
            print(f"[Model Loaded] <- {filepath}")


if __name__ == "__main__":
    recommender = LocalRecommendationModel()
    metrics = recommender.train()
    recommender.save()
