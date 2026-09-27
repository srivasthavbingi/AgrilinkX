# AgriLinkX — Real-Data Dependency & Production Audit

**Date:** September 27, 2026  
**Status:** REAL-DATA AUDIT & DEPENDENCY TRACE COMPLETE  

---

## 1. Mock Data Usage & Dependency Table

| File | Used By | Data Type | Production Safe? | Replacement | Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `frontend/src/data/productCatalog.js` | `productMatching.js`, `Home.jsx` | Product taxonomy, category labels, search synonyms, units | **YES** | None (Static taxonomy) | **RETAIN** (Static taxonomy & category UI) |
| `frontend/src/data/storageData.js` | `storageService.js`, `StorageMap.jsx`, `Dashboard.jsx`, `StoreSellDecision.jsx` | Cold storage facility directory & coordinates | **YES** | None (Infrastructure directory catalog) | **RETAIN** (Cold storage logistics catalog) |
| `frontend/src/data/farmerListings.js` | `inventoryService.js`, `recommendationEngine.js`, `Order.jsx`, `Home.jsx`, `FarmerProfile.jsx` | Seed farmer inventory & fallback listings | **CONDITIONAL** | FastAPI `/api/search` & Supabase `farmer_products` table | **RETAIN as fallback only** (Primary flows use real backend search & database) |
| `frontend/src/data/mockData.js` | `marketService.js`, `storageService.js`, `predictionService.js`, `Dashboard.jsx`, `Markets.jsx`, `PricePrediction.jsx`, `Buyers.jsx`, `CropLot.jsx`, `StorageMap.jsx`, `Transaction.jsx`, `StoreSellDecision.jsx`, `Sidebar.jsx`, `Topbar.jsx` | APMC mandi calculator presets, active crop lot state, buyer directory | **CONDITIONAL** | FastAPI `/api/mandi/prices`, `/api/farmer/*`, `/api/forecast/next-day` | **RETAIN for secondary tools & fallback** (Primary intelligence & search use real API) |

---

## 2. Main Family Buying Flow Trace

- **Search (`Home.jsx`):** Executes search queries by calling `api.searchProducts(...)` against the FastAPI backend search service (`/api/search`).
- **Recommendations (`Recommendations.jsx`):** Receives real backend search results, calculates transparent net realization recommendations, distance, and freight costs. If backend is down, local fallback is flagged and displayed explicitly.
- **Listing View (`Recommendation.jsx`):** Displays real listing details fetched from the backend.
- **Order Placement (`Order.jsx`):** Sends order creation payload to `orderService.createOrder(...)`, which persists the order to Supabase PostgreSQL database and atomically decrements inventory.
- **Order Tracking (`Orders.jsx`):** Queries live order records via `api.getOrders()` and Supabase `orders` table.

---

## 3. Farmer Market Intelligence Trace

- **Market Intelligence Dashboard (`MarketIntelligence.jsx`):** Calls 4 authenticated backend endpoints in parallel via `farmerIntelligenceService`:
  1. `GET /api/farmer/market-intelligence`
  2. `GET /api/farmer/price-intelligence`
  3. `GET /api/farmer/demand-intelligence`
  4. `GET /api/mandi/prices`
- **Government Mandi Card (`GovernmentMandiCard.jsx`):** Displays real APMC mandi market prices fetched from the official data.gov.in API via backend proxy. Displays clear error state if offline; zero fake prices.
- **ML Price Forecast Card (`MLPriceForecastCard.jsx`):** Fetches next-day market forecast from FastAPI backend model (`/api/forecast/next-day`). Displays explicit unavailable state if model prediction is not available; zero fake forecasts.

---

## 4. Farmer Inventory Trace

- **Inventory Dashboard (`FarmerInventory.jsx`):** Loads farmer inventory directly from FastAPI backend endpoint `api.getInventory(farmerId)` and Supabase `farmer_products` table.
- **Stock Management:** Add, Edit, Delete, and Stock Deduction operations mutate the live PostgreSQL database via authenticated FastAPI backend and Supabase RLS policies.
- **Fallback Isolation:** `farmerListings.js` in-memory fallback is active ONLY if database connection is unavailable.

---

## 5. Page Categorization Audit

1. `MarketIntelligence.jsx` — **Production-Ready with Real Data** (Government Mandi API & FastAPI Intelligence Service)
2. `FarmerInventory.jsx` — **Production-Ready with Real Data** (FastAPI Backend & Supabase DB)
3. `Home.jsx` & `Recommendations.jsx` — **Production-Ready with Real Data** (FastAPI Product Search & Location Routing)
4. `Order.jsx` & `Orders.jsx` — **Production-Ready with Real Data** (Supabase DB Orders & Stock Safety)
5. `Dashboard.jsx` — **Production-Ready Hybrid** (Live Market Intelligence summary + overview cards)
6. `Markets.jsx` — **Interactive Offline Sandbox Tool** (Freight deduction comparison engine)
7. `StorageMap.jsx` & `StoreSellDecision.jsx` — **Interactive Cold Storage Tool** (Logistics & holding cost calculator)
8. `Buyers.jsx` — **Institutional Directory Catalog** (Vetted B2B corporate buyers directory)
9. `PricePrediction.jsx`, `CropLot.jsx`, `Transaction.jsx` — **Secondary Visualizers** (Interactive demo workflow visualizers)

---

## 6. Product Taxonomy & Catalog

- `frontend/src/data/productCatalog.js` contains commodity names, regional synonyms (e.g. Tamatar, Aloo, Pyaz), search categories, and units.
- It contains zero live market prices or fake inventory listings.
- Safe to retain in production as static taxonomy metadata.

---

## 7. Git & Environment Safety

- `.env` and `backend/.env` remain strictly un-staged and ignored.
- `data/raw/` (7.08 GB raw CSV dataset) remains strictly ignored.
- `data/india_ml_sample.csv` (185 MB sample dataset) remains un-staged.
- No production secrets or credentials are present in repository commits.
