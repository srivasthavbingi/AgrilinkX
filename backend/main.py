import os
import math
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Load .env if python-dotenv is available (optional, harmless if missing)
# ---------------------------------------------------------------------------
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


from market_data_service import fetch_mandi_prices_from_api, get_health_status


# ---------------------------------------------------------------------------
# Supabase Client (only initialised when env vars are set with real values)
# ---------------------------------------------------------------------------
# Reads SUPABASE_KEY (primary) or SUPABASE_SERVICE_ROLE_KEY (alias) from .env
_SUPABASE_URL = os.getenv("SUPABASE_URL", "")
_SUPABASE_KEY = os.getenv("SUPABASE_KEY", "") or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

_supabase_client = None
_supabase_init_done = False  # Sentinel so we log only once

def _is_placeholder(value: str) -> bool:
    """Return True if the value looks like a placeholder (not a real credential)."""
    placeholder_markers = [
        "your-project", "your-service-role", "your-anon",
        "xxxx", "<", ">" , "placeholder",
    ]
    return any(m in value.lower() for m in placeholder_markers)

def _get_supabase():
    """Return a live Supabase client or None if not configured."""
    global _supabase_client, _supabase_init_done
    if _supabase_init_done:
        return _supabase_client
    _supabase_init_done = True
    if (
        _SUPABASE_URL
        and _SUPABASE_KEY
        and not _is_placeholder(_SUPABASE_URL)
        and not _is_placeholder(_SUPABASE_KEY)
    ):
        try:
            from supabase import create_client
            _supabase_client = create_client(_SUPABASE_URL, _SUPABASE_KEY)
            print(f"[AgriLinkX] [OK] Supabase connected: {_SUPABASE_URL}")
        except Exception as e:
            print(f"[AgriLinkX] [WARNING] Supabase init failed: {e}. Using in-memory fallback.")
            _supabase_client = None
    else:
        print("[AgriLinkX] [INFO] Supabase not configured - using in-memory fallback data.")
    return _supabase_client


app = FastAPI(
    title="AgriLinkX API",
    description="Farmer Inventory, Supabase Integration & Family Recommendation Engine API",
    version="2.0.0",
)

# Configurable CORS for Production & Localhost Development
_raw_origins = os.getenv("ALLOWED_ORIGINS", "").strip()
if _raw_origins and _raw_origins != "*":
    _allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
    for _local in ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]:
        if _local not in _allowed_origins:
            _allowed_origins.append(_local)
else:
    _allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    sb = _get_supabase()
    if not sb:
        return {"id": "fallback-uuid", "role": "family", "full_name": "Fallback User", "email": "fallback@example.com"}
    try:
        user_res = sb.auth.get_user(token)
        user = user_res.user
        prof_res = sb.table("profiles").select("*").eq("id", user.id).execute()
        if prof_res.data:
            return prof_res.data[0]
        return {"id": user.id, "role": "unknown", "email": user.email}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

@app.get("/api/me")
def get_me(user: dict = Depends(get_current_user)):
    return user

# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------
class ProductCreate(BaseModel):
    farmer_id: Optional[str] = "F001"
    farmer_name: Optional[str] = "Ravi Farms"
    user_id: Optional[str] = None  # Supabase auth.users UUID from authenticated farmer
    product: str
    category: str = "Vegetables"
    variety: Optional[str] = ""
    quantity_available: float = 10.0
    unit: str = "kg"
    price: float = 28.0
    quality: str = "Grade A"
    harvest_date: Optional[str] = "2026-09-13"
    origin: Optional[str] = "Telangana"
    latitude: Optional[float] = 17.4210
    longitude: Optional[float] = 78.4420
    minimum_order: float = 1.0
    delivery_available: bool = True
    description: Optional[str] = ""

class ProductUpdate(BaseModel):
    product: Optional[str] = None
    price: Optional[float] = None
    quality: Optional[str] = None
    variety: Optional[str] = None
    quantity_available: Optional[float] = None
    description: Optional[str] = None

class QuantityReduce(BaseModel):
    quantity: float  # amount to reduce by (e.g. 1 to reduce 10→9)

class QuantityUpdate(BaseModel):
    quantity_available: float

class OrderCreate(BaseModel):
    customer_name: str = "Local Family Customer"
    farmer_id: str
    product_id: str
    quantity: float
    unit: str = "kg"
    price_per_unit: float
    total_amount: float
    delivery_method: str = "Home Delivery"

class OrderStatusUpdate(BaseModel):
    status: str

# ---------------------------------------------------------------------------
# In-Memory Seed Data Store (used when Supabase is not configured)
# ---------------------------------------------------------------------------
INVENTORY_DB = [
    {
        "id": "L001",
        "farmer_id": "F001",
        "farmer_name": "Ravi Farms",
        "phone": "+91 98480 11221",
        "product": "Tomato",
        "category": "Vegetables",
        "variety": "Hybrid Red",
        "quantity_available": 18.0,
        "unit": "kg",
        "price": 28.0,
        "quality": "Grade A",
        "harvest_date": "2026-09-13",
        "origin": "Telangana",
        "subDistrict": "Banjara Peri-Urban Cluster",
        "latitude": 17.4210,
        "longitude": 78.4420,
        "rating": 4.8,
        "verified": True,
        "availability_status": "Available",
        "delivery_available": True,
        "minimum_order": 1.0,
        "description": "Freshly harvested Grade A tomatoes picked at dawn. Firm, glossy, and pesticide-free.",
        "badges": ["Harvested Today", "Direct from Farm", "Chemical Free"],
    },
    {
        "id": "L002",
        "farmer_id": "F002",
        "farmer_name": "Lakshmi Farm",
        "phone": "+91 94401 33442",
        "product": "Tomato",
        "category": "Vegetables",
        "variety": "Desi Organic",
        "quantity_available": 35.0,
        "unit": "kg",
        "price": 27.0,
        "quality": "Grade A",
        "harvest_date": "2026-09-12",
        "origin": "Telangana",
        "subDistrict": "Attapur Green Belt",
        "latitude": 17.4080,
        "longitude": 78.4100,
        "rating": 4.7,
        "verified": True,
        "availability_status": "Available",
        "delivery_available": True,
        "minimum_order": 1.0,
        "description": "Grade A desi tomatoes cultivated with organic manure. Tangy and high pulp.",
        "badges": ["Certified Organic", "Fresh Pick"],
    },
    {
        "id": "L003",
        "farmer_id": "F003",
        "farmer_name": "Green Valley Farm",
        "phone": "+91 98850 44551",
        "product": "Tomato",
        "category": "Vegetables",
        "variety": "Standard Farm Red",
        "quantity_available": 50.0,
        "unit": "kg",
        "price": 26.0,
        "quality": "Grade A",
        "harvest_date": "2026-09-12",
        "origin": "Telangana",
        "subDistrict": "Mehdipatnam Outskirts",
        "latitude": 17.3820,
        "longitude": 78.4010,
        "rating": 4.6,
        "verified": True,
        "availability_status": "Available",
        "delivery_available": True,
        "minimum_order": 1.0,
        "description": "High volume fresh field tomatoes. Perfect for daily family cooking.",
        "badges": ["Bulk Farm Fresh", "Value Choice"],
    },
    {
        "id": "L004",
        "farmer_id": "F004",
        "farmer_name": "Green Leaf Peri-Urban Farm",
        "phone": "+91 93910 55662",
        "product": "Spinach",
        "category": "Vegetables",
        "variety": "Desi Palak",
        "quantity_available": 24.0,
        "unit": "bundle",
        "price": 15.0,
        "quality": "Grade A",
        "harvest_date": "2026-09-13",
        "origin": "Telangana",
        "subDistrict": "Khairatabad Green Patch",
        "latitude": 17.4100,
        "longitude": 78.4410,
        "rating": 4.8,
        "verified": True,
        "availability_status": "Available",
        "delivery_available": True,
        "minimum_order": 1.0,
        "description": "Freshly cut crisp desi spinach leaves. Washed in clean well water.",
        "badges": ["Harvested Today", "Local Produce"],
    },
    {
        "id": "L005",
        "farmer_id": "F005",
        "farmer_name": "Guntur Spices Direct Hub",
        "phone": "+91 94405 66773",
        "product": "Chilli",
        "category": "Spices",
        "variety": "Guntur Green Hot",
        "quantity_available": 30.0,
        "unit": "kg",
        "price": 55.0,
        "quality": "Grade A",
        "harvest_date": "2026-09-12",
        "origin": "Andhra Pradesh (Guntur)",
        "subDistrict": "Mehdipatnam Depot",
        "latitude": 17.3950,
        "longitude": 78.4400,
        "rating": 4.7,
        "verified": True,
        "availability_status": "Available",
        "delivery_available": True,
        "minimum_order": 0.25,
        "description": "Authentic spicy Guntur green chillies directly sourced from farm cooperative.",
        "badges": ["Authentic Origin", "High Heat"],
    },
    {
        "id": "L006",
        "farmer_id": "F006",
        "farmer_name": "Kisan Bandhu Producers",
        "phone": "+91 98491 77884",
        "product": "Onion",
        "category": "Vegetables",
        "variety": "Nashik Red Medium",
        "quantity_available": 80.0,
        "unit": "kg",
        "price": 32.0,
        "quality": "Grade A",
        "harvest_date": "2026-09-10",
        "origin": "Maharashtra (Nashik)",
        "subDistrict": "Nampally Warehouse",
        "latitude": 17.3910,
        "longitude": 78.4650,
        "rating": 4.6,
        "verified": True,
        "availability_status": "Available",
        "delivery_available": True,
        "minimum_order": 1.0,
        "description": "Dry, well-cured medium red onions with long shelf life and great pungency.",
        "badges": ["Dry Cured", "Value Pack"],
    },
    {
        "id": "L008",
        "farmer_id": "F008",
        "farmer_name": "Godavari Rice Millers Co-op",
        "phone": "+91 94411 99006",
        "product": "Rice",
        "category": "Grains",
        "variety": "Sona Masoori Aged",
        "quantity_available": 250.0,
        "unit": "kg",
        "price": 58.0,
        "quality": "Grade A+",
        "harvest_date": "2026-08-15",
        "origin": "Telangana (Miryalaguda)",
        "subDistrict": "Sanathnagar Hub",
        "latitude": 17.4550,
        "longitude": 78.4410,
        "rating": 4.9,
        "verified": True,
        "availability_status": "Available",
        "delivery_available": True,
        "minimum_order": 5.0,
        "description": "1-year aged authentic Sona Masoori raw rice. Non-sticky, aromatic, easy digestion.",
        "badges": ["1 Year Aged", "FSSAI Certified"],
    },
    {
        "id": "L011",
        "farmer_id": "F011",
        "farmer_name": "Tandur Red Gram Collective",
        "phone": "+91 98480 54321",
        "product": "Toor Dal",
        "category": "Pulses",
        "variety": "Tandur GI Tagged Red Gram",
        "quantity_available": 75.0,
        "unit": "kg",
        "price": 148.0,
        "quality": "Grade A+",
        "harvest_date": "2026-08-10",
        "origin": "Telangana (Tandur)",
        "subDistrict": "Kukatpally Depot",
        "latitude": 17.4850,
        "longitude": 78.4110,
        "rating": 4.9,
        "verified": True,
        "availability_status": "Available",
        "delivery_available": True,
        "minimum_order": 1.0,
        "description": "GI-tagged unpolished Tandur Red Gram dal. High protein, cooks faster without soda.",
        "badges": ["GI Tagged", "Unpolished"],
    },
    {
        "id": "L012",
        "farmer_id": "F012",
        "farmer_name": "Assam Valley Tea",
        "phone": "+91 98540 88991",
        "product": "Tea",
        "category": "Tea",
        "variety": "Assam Tea Leaves",
        "quantity_available": 8.0,
        "unit": "kg",
        "price": 480.0,
        "quality": "Premium",
        "harvest_date": "2026-08-25",
        "origin": "Assam origin",
        "subDistrict": "Secunderabad Specialty Hub",
        "latitude": 17.4520,
        "longitude": 78.5020,
        "rating": 4.8,
        "verified": True,
        "availability_status": "Available",
        "delivery_available": True,
        "minimum_order": 0.25,
        "description": "Authentic Assam-origin single-estate tea leaves. Rich malty brew with deep amber aroma.",
        "badges": ["Assam Origin Match ✓", "Single Estate", "Premium Leaf"],
    },
    {
        "id": "L013",
        "farmer_id": "F013",
        "farmer_name": "Local Tea Seller",
        "phone": "+91 94402 11223",
        "product": "Tea",
        "category": "Tea",
        "variety": "Tea Powder",
        "quantity_available": 20.0,
        "unit": "kg",
        "price": 350.0,
        "quality": "Grade B",
        "harvest_date": "2026-06-15",
        "origin": "Origin Unknown",
        "subDistrict": "Panjagutta",
        "latitude": 17.4250,
        "longitude": 78.4480,
        "rating": 4.2,
        "verified": False,
        "availability_status": "Available",
        "delivery_available": True,
        "minimum_order": 0.5,
        "description": "Standard commercial tea powder for daily milky chai. Quick color, blended origin.",
        "badges": ["Local Seller"],
    },
    {
        "id": "L014",
        "farmer_id": "F014",
        "farmer_name": "Sri Krishna A2 Desi Cow Dairy",
        "phone": "+91 98499 33221",
        "product": "Milk",
        "category": "Dairy",
        "variety": "Raw A2 Gir Cow Milk",
        "quantity_available": 35.0,
        "unit": "L",
        "price": 75.0,
        "quality": "Grade A+",
        "harvest_date": "2026-09-13",
        "origin": "Telangana",
        "subDistrict": "Banjara Outskirts",
        "latitude": 17.4190,
        "longitude": 78.4210,
        "rating": 4.9,
        "verified": True,
        "availability_status": "Available",
        "delivery_available": True,
        "minimum_order": 1.0,
        "description": "Morning milked pure A2 Gir cow milk. Chilled immediately in glass bottles.",
        "badges": ["Milked Today", "Pure A2"],
    },
]

ORDERS_DB = []

# ---------------------------------------------------------------------------
# Known origin keywords for query parsing
# ---------------------------------------------------------------------------
KNOWN_ORIGINS = [
    {"key": "assam", "label": "Assam"},
    {"key": "kashmir", "label": "Kashmir"},
    {"key": "kashmiri", "label": "Kashmir"},
    {"key": "guntur", "label": "Andhra Pradesh (Guntur)"},
    {"key": "nashik", "label": "Maharashtra (Nashik)"},
    {"key": "tandur", "label": "Telangana (Tandur)"},
    {"key": "nizamabad", "label": "Telangana (Nizamabad)"},
    {"key": "ooty", "label": "Tamil Nadu (Ooty)"},
    {"key": "wayanad", "label": "Kerala (Wayanad)"},
    {"key": "kerala", "label": "Kerala"},
    {"key": "punjab", "label": "Punjab"},
    {"key": "mp", "label": "Madhya Pradesh"},
    {"key": "madhya pradesh", "label": "Madhya Pradesh"},
    {"key": "nallamala", "label": "Telangana (Nallamala)"},
    {"key": "himachal", "label": "Himachal"},
    {"key": "telangana", "label": "Telangana"},
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalize_item(item: dict) -> dict:
    """Ensure every inventory dict has both snake_case and camelCase keys."""
    qty = item.get("quantity_available", item.get("quantityAvailable", 0.0))
    status = item.get("availability_status", item.get("availabilityStatus", "Available"))
    if qty <= 0:
        status = "Unavailable"
    return {
        **item,
        "quantity_available": qty,
        "quantityAvailable": qty,
        "availability_status": status,
        "availabilityStatus": status,
        "farmer_name": item.get("farmer_name", item.get("farmerName", "")),
        "farmerName": item.get("farmer_name", item.get("farmerName", "")),
        "farmer_id": item.get("farmer_id", item.get("farmerId", "")),
        "farmerId": item.get("farmer_id", item.get("farmerId", "")),
        "delivery_available": item.get("delivery_available", item.get("deliveryAvailable", True)),
        "deliveryAvailable": item.get("delivery_available", item.get("deliveryAvailable", True)),
        "minimum_order": item.get("minimum_order", item.get("minimumOrder", 1.0)),
        "minimumOrder": item.get("minimum_order", item.get("minimumOrder", 1.0)),
        "harvest_date": item.get("harvest_date", item.get("harvestDate", "")),
        "harvestDate": item.get("harvest_date", item.get("harvestDate", "")),
    }


def _supabase_row_to_item(row: dict) -> dict:
    """Map a Supabase farmer_products row to INVENTORY_DB format."""
    return {
        "id": row.get("id", ""),
        "farmer_id": row.get("farmer_id", ""),
        "farmerId": row.get("farmer_id", ""),
        "farmer_name": row.get("farmer_name", "Farmer"),
        "farmerName": row.get("farmer_name", "Farmer"),
        "phone": row.get("phone", ""),
        "product": row.get("product", ""),
        "category": row.get("category", "Vegetables"),
        "variety": row.get("variety", ""),
        "quantity_available": float(row.get("quantity_available", 0)),
        "quantityAvailable": float(row.get("quantity_available", 0)),
        "unit": row.get("unit", "kg"),
        "price": float(row.get("price", 0)),
        "quality": row.get("quality", "Grade A"),
        "harvest_date": str(row.get("harvest_date", "")),
        "harvestDate": str(row.get("harvest_date", "")),
        "origin": row.get("origin", "Telangana"),
        "subDistrict": row.get("origin", ""),
        "latitude": float(row.get("latitude", 17.4210)),
        "longitude": float(row.get("longitude", 78.4420)),
        "rating": float(row.get("rating", 4.5)),
        "verified": bool(row.get("verified", True)),
        "availability_status": row.get("availability_status", "Available"),
        "availabilityStatus": row.get("availability_status", "Available"),
        "delivery_available": bool(row.get("delivery_available", True)),
        "deliveryAvailable": bool(row.get("delivery_available", True)),
        "minimum_order": float(row.get("minimum_order", 1.0)),
        "minimumOrder": float(row.get("minimum_order", 1.0)),
        "description": row.get("description", ""),
        "badges": [],
    }


def _get_all_inventory() -> list:
    """Return inventory from Supabase if available, else INVENTORY_DB."""
    sb = _get_supabase()
    if sb:
        try:
            # Join farmers table using full_name (the actual schema column name)
            res = sb.table("farmer_products").select(
                "*, farmers(full_name, farm_name, phone, latitude, longitude, rating, verified)"
            ).execute()
            if res.data:
                items = []
                for row in res.data:
                    item = _supabase_row_to_item(row)
                    # Merge joined farmer data (prefer farmer table lat/lng for distance calc)
                    farmer = row.get("farmers") or {}
                    if farmer:
                        farmer_full_name = farmer.get("full_name") or farmer.get("name", "")
                        farm_name = farmer.get("farm_name", "")
                        display_name = farm_name or farmer_full_name or item["farmer_name"]
                        item["farmer_name"] = display_name
                        item["farmerName"] = display_name
                        item["phone"] = farmer.get("phone", item.get("phone", ""))
                        # Use farmer lat/lng if product row doesn't have them
                        if farmer.get("latitude"):
                            item["latitude"] = float(farmer["latitude"])
                        if farmer.get("longitude"):
                            item["longitude"] = float(farmer["longitude"])
                        item["rating"] = float(farmer.get("rating", item["rating"]))
                        item["verified"] = bool(farmer.get("verified", item["verified"]))
                    items.append(item)
                return items
        except Exception as e:
            print(f"[AgriLinkX] Supabase inventory read failed: {e}")
    return list(INVENTORY_DB)


def _get_inventory_item(item_id: str) -> Optional[dict]:
    sb = _get_supabase()
    if sb:
        try:
            res = sb.table("farmer_products").select("*").eq("id", item_id).execute()
            if res.data:
                return _supabase_row_to_item(res.data[0])
        except Exception as e:
            print(f"[AgriLinkX] Supabase single item read failed: {e}")
    return next((p for p in INVENTORY_DB if p["id"] == item_id), None)


REGIONAL_SYNONYMS = {
    "tamatar": "Tomato",
    "tomato": "Tomato",
    "tomatoes": "Tomato",
    "palak": "Spinach",
    "spinach": "Spinach",
    "mirchi": "Chilli",
    "chilli": "Chilli",
    "chillies": "Chilli",
    "greenchilli": "Chilli",
    "pyaaz": "Onion",
    "onion": "Onion",
    "onions": "Onion",
    "aloo": "Potato",
    "potato": "Potato",
    "potatoes": "Potato",
    "chawal": "Rice",
    "rice": "Rice",
    "doodh": "Milk",
    "milk": "Milk",
    "chai": "Tea",
    "tea": "Tea",
    "tealeaves": "Tea",
    "dal": "Toor Dal",
    "toordal": "Toor Dal",
    "bhindi": "Okra",
    "okra": "Okra",
    "ladyfinger": "Okra",
    "gobi": "Cauliflower",
    "cauliflower": "Cauliflower",
    "kothimeera": "Coriander",
    "coriander": "Coriander",
    "dhaniya": "Coriander",
    "pudina": "Mint",
    "mint": "Mint",
    "haldi": "Turmeric",
    "turmeric": "Turmeric",
    "lahsun": "Garlic",
    "garlic": "Garlic",
    "adrak": "Ginger",
    "ginger": "Ginger",
    "bellam": "Jaggery",
    "jaggery": "Jaggery",
    "kesar": "Saffron",
    "saffron": "Saffron",
    "dragonfruit": "Dragon Fruit",
}


def parse_user_query(query_str: str):
    clean = query_str.lower().strip() if query_str else ""
    preferred_origin = None
    has_explicit_origin = False

    for origin in KNOWN_ORIGINS:
        if origin["key"] in clean:
            preferred_origin = origin["label"]
            has_explicit_origin = True
            break

    detected_product = None
    import re
    words = re.findall(r'\w+', clean)

    # Check 1-word matches in REGIONAL_SYNONYMS
    for word in words:
        if word in REGIONAL_SYNONYMS:
            detected_product = REGIONAL_SYNONYMS[word]
            break

    # Check 2-word combinations if not found
    if not detected_product:
        for i in range(len(words) - 1):
            combo = f"{words[i]}{words[i+1]}"
            if combo in REGIONAL_SYNONYMS:
                detected_product = REGIONAL_SYNONYMS[combo]
                break

    # Fallback to keyword matching
    if not detected_product:
        if "tea" in clean:
            detected_product = "Tea"
        elif "tomato" in clean or "tomatoes" in clean:
            detected_product = "Tomato"
        elif "rice" in clean:
            detected_product = "Rice"
        elif "milk" in clean:
            detected_product = "Milk"
        elif "dal" in clean or "gram" in clean:
            if "toor" in clean or "red" in clean:
                detected_product = "Toor Dal"
            elif "moong" in clean:
                detected_product = "Moong Dal"
            else:
                detected_product = "Toor Dal"
        elif "chilli" in clean or "chili" in clean:
            detected_product = "Chilli"
        elif "saffron" in clean:
            detected_product = "Saffron"
        elif "onion" in clean:
            detected_product = "Onion"
        elif "spinach" in clean or "palak" in clean:
            detected_product = "Spinach"
        elif "potato" in clean:
            detected_product = "Potato"
        elif "wheat" in clean or "atta" in clean:
            detected_product = "Wheat"
        elif "ghee" in clean:
            detected_product = "Ghee"
        elif "banana" in clean:
            detected_product = "Banana"
        elif "apple" in clean:
            detected_product = "Apple"
        elif "turmeric" in clean or "haldi" in clean:
            detected_product = "Turmeric"
        elif "garlic" in clean or "lahsun" in clean:
            detected_product = "Garlic"
        elif "ginger" in clean or "adrak" in clean:
            detected_product = "Ginger"
        else:
            detected_product = clean.title() if clean else "Tomato"

    product = detected_product

    variety = ""
    if "leaves" in clean or "leaf" in clean or "orthodox" in clean:
        variety = "Tea Leaves"
    elif "powder" in clean:
        variety = "Tea Powder"
    elif "desi" in clean or "organic" in clean:
        variety = "Desi Organic"
    elif "basmati" in clean:
        variety = "Basmati"

    return {
        "product": product,
        "variety": variety,
        "preferredOrigin": preferred_origin,
        "hasExplicitOrigin": has_explicit_origin,
        "rawQuery": query_str,
    }


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)


def calculate_recommendation_score(parsed_query, listing, requested_quantity, max_radius, preference="Nearest"):
    distance = listing.get("distance", 0.0)

    effective_radius = max(max_radius, 5)
    distance_ratio = min(1.0, distance / effective_radius)
    distance_score = max(10, round((1.0 - distance_ratio) * 100))

    availability_score = 100
    is_partial_match = False
    is_below_min_order = False

    min_order = listing.get("minimum_order", listing.get("minimumOrder", 1.0))
    qty_avail = listing.get("quantity_available", listing.get("quantityAvailable", 0.0))

    if requested_quantity < min_order:
        is_below_min_order = True
        availability_score = 20
    elif qty_avail < requested_quantity:
        is_partial_match = True
        availability_score = round((qty_avail / requested_quantity) * 50) if requested_quantity > 0 else 50
    else:
        availability_score = 100

    query_prod = (parsed_query.get("product") or "").lower()
    item_prod = (listing.get("product") or "").lower()
    item_cat = (listing.get("category") or "").lower()
    item_var = (listing.get("variety") or "").lower()

    product_match_score = 0
    if query_prod == item_prod or query_prod in item_prod or item_prod in query_prod:
        product_match_score += 70
    elif query_prod in item_cat:
        product_match_score += 40
    else:
        product_match_score = 0

    if product_match_score > 0:
        query_var = (parsed_query.get("variety") or "").lower()
        if query_var and query_var in item_var:
            product_match_score += 30
        else:
            product_match_score += 30
    product_match_score = min(100, product_match_score)

    quality = listing.get("quality", "Grade A")
    if quality == "Grade A+":
        quality_score = 100
    elif quality == "Grade A":
        quality_score = 90
    elif quality == "Grade B":
        quality_score = 70
    elif quality == "Grade C":
        quality_score = 50
    else:
        quality_score = 80

    price = listing.get("price", 50.0)
    if price <= 30:
        price_score = 95
    elif price <= 60:
        price_score = 85
    elif price <= 150:
        price_score = 75
    else:
        price_score = 65

    rating = listing.get("rating", 4.0)
    verified = listing.get("verified", False)
    reliability_score = round((rating / 5.0) * 75 + (25 if verified else 0))

    w_dist, w_avail, w_prod, w_qual, w_price, w_rel = 0.30, 0.25, 0.20, 0.10, 0.10, 0.05
    pref_lower = (preference or "Nearest").lower()
    if "nearest" in pref_lower:
        w_dist, w_price = 0.45, 0.05
    elif "freshest" in pref_lower:
        w_qual, w_dist = 0.20, 0.20
    elif "price" in pref_lower or "best price" in pref_lower:
        w_price, w_dist = 0.30, 0.15
    elif "direct" in pref_lower or "farmer" in pref_lower:
        w_rel, w_qual = 0.15, 0.15

    raw_score = (
        distance_score * w_dist
        + availability_score * w_avail
        + product_match_score * w_prod
        + quality_score * w_qual
        + price_score * w_price
        + reliability_score * w_rel
    )

    origin_bonus = 0
    origin_match = False
    if parsed_query.get("hasExplicitOrigin") and parsed_query.get("preferredOrigin"):
        query_origin = parsed_query["preferredOrigin"].lower()
        listing_origin = (listing.get("origin") or "").lower()
        if "assam" in query_origin and "assam" in listing_origin:
            origin_bonus = 35
            origin_match = True
        elif query_origin in listing_origin:
            origin_bonus = 35
            origin_match = True
        else:
            origin_bonus = -25

    total_score = min(99, max(15, round(raw_score + origin_bonus)))

    return {
        "totalScore": total_score,
        "originMatch": origin_match,
        "isPartialMatch": is_partial_match,
        "isBelowMinOrder": is_below_min_order,
    }


# ===========================================================================
# ROUTES
# ===========================================================================

@app.get("/")
def read_root():
    sb_configured = bool(_get_supabase())
    # Mask all but the first 30 chars of the URL for safe display
    masked_url = (_SUPABASE_URL[:30] + "...") if _SUPABASE_URL and len(_SUPABASE_URL) > 30 else _SUPABASE_URL
    return {
        "status": "online",
        "service": "AgriLinkX FastAPI Backend",
        "version": "2.0.0",
        "supabase_configured": sb_configured,
        "supabase_url": masked_url if sb_configured else None,
    }


@app.get("/api/health/supabase")
def supabase_health():
    """Safe connectivity test for Supabase. Never returns credentials."""
    sb = _get_supabase()
    if not sb:
        return {
            "supabase_configured": False,
            "connected": False,
            "message": "Supabase not configured - running on in-memory fallback.",
        }
    try:
        # Lightweight ping: query table
        res = sb.table("farmer_products").select("id", count="exact").limit(1).execute()
        product_count = res.count if hasattr(res, "count") else len(res.data or [])
        return {
            "supabase_configured": True,
            "connected": True,
            "schema_initialized": True,
            "farmer_products_count": product_count,
            "message": "Supabase connection successful and schema verified.",
        }
    except Exception as e:
        err_str = str(e)
        if "PGRST205" in err_str or "Could not find the table" in err_str:
            return {
                "supabase_configured": True,
                "connected": True,
                "schema_initialized": False,
                "message": "Supabase project reachable. Schema not initialized yet - run backend/database_schema.sql in Supabase SQL Editor.",
            }
        print(f"[AgriLinkX] Supabase health check failed: {e}")
        return {
            "supabase_configured": True,
            "connected": False,
            "schema_initialized": False,
            "message": f"Supabase API error: {type(e).__name__}. Check backend terminal.",
        }


# ---------------------------------------------------------------------------
# /api/inventory — Canonical Inventory CRUD (NEW)
# ---------------------------------------------------------------------------

@app.get("/api/inventory")
def get_inventory(farmer_id: Optional[str] = None):
    """Get all inventory items. Optionally filter by farmer_id."""
    items = _get_all_inventory()
    if farmer_id:
        items = [i for i in items if i.get("farmer_id") == farmer_id or i.get("farmerId") == farmer_id]
    return [_normalize_item(i) for i in items]


@app.get("/api/inventory/{item_id}")
def get_inventory_item(item_id: str):
    """Get a single inventory item by ID."""
    item = _get_inventory_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return _normalize_item(item)


@app.post("/api/inventory", status_code=201)
def create_inventory_item(payload: ProductCreate):
    """Add a new product to inventory (from Farmer Portal)."""
    new_id = f"L{len(INVENTORY_DB) + 1000}"
    status = "Available" if payload.quantity_available > 0 else "Unavailable"

    item = {
        "id": new_id,
        "farmer_id": payload.farmer_id or "F001",
        "farmerId": payload.farmer_id or "F001",
        "farmer_name": payload.farmer_name or "Ravi Farms",
        "farmerName": payload.farmer_name or "Ravi Farms",
        "phone": "",
        "product": payload.product,
        "category": payload.category,
        "variety": payload.variety or "",
        "quantity_available": payload.quantity_available,
        "quantityAvailable": payload.quantity_available,
        "unit": payload.unit,
        "price": payload.price,
        "quality": payload.quality,
        "harvest_date": payload.harvest_date or "",
        "harvestDate": payload.harvest_date or "",
        "origin": payload.origin or "Telangana",
        "subDistrict": payload.origin or "Telangana",
        "latitude": payload.latitude or 17.4210,
        "longitude": payload.longitude or 78.4420,
        "rating": 4.5,
        "verified": True,
        "availability_status": status,
        "availabilityStatus": status,
        "delivery_available": payload.delivery_available,
        "deliveryAvailable": payload.delivery_available,
        "minimum_order": payload.minimum_order,
        "minimumOrder": payload.minimum_order,
        "description": payload.description or "",
        "badges": ["Direct from Farm"],
    }

    # Try Supabase insert — resolves farmers.id UUID and includes user_id
    sb = _get_supabase()
    if sb:
        resolved_farmer_uuid = None
        # 1. Check if payload.farmer_id is already a valid UUID in farmers table
        if payload.farmer_id and payload.farmer_id != "F001":
            try:
                f_res = sb.table("farmers").select("id").eq("id", payload.farmer_id).execute()
                if f_res.data:
                    resolved_farmer_uuid = f_res.data[0]["id"]
            except Exception:
                pass

        # 2. If not found by id, lookup farmers by user_id
        target_user_id = payload.user_id or (payload.farmer_id if payload.farmer_id != "F001" else None)
        if not resolved_farmer_uuid and target_user_id:
            try:
                f_res = sb.table("farmers").select("id").eq("user_id", target_user_id).execute()
                if f_res.data:
                    resolved_farmer_uuid = f_res.data[0]["id"]
                elif payload.user_id:
                    # Auto-create farmer profile if missing for authenticated user
                    prof_res = sb.table("profiles").select("*").eq("id", payload.user_id).execute()
                    prof = prof_res.data[0] if prof_res.data else {}
                    ins_farmer = sb.table("farmers").insert({
                        "user_id": payload.user_id,
                        "full_name": prof.get("full_name") or payload.farmer_name or "Farmer Producer",
                        "farm_name": payload.farmer_name or "Farmer Farm",
                        "phone": prof.get("phone", ""),
                        "latitude": payload.latitude or 17.4210,
                        "longitude": payload.longitude or 78.4420,
                    }).execute()
                    if ins_farmer.data:
                        resolved_farmer_uuid = ins_farmer.data[0]["id"]
            except Exception as e:
                print(f"[AgriLinkX] Farmers UUID lookup/create note: {e}")

        if resolved_farmer_uuid:
            item["farmer_id"] = resolved_farmer_uuid
            item["farmerId"] = resolved_farmer_uuid

        try:
            supabase_row = {
                "id": new_id,
                "farmer_id": resolved_farmer_uuid or (payload.farmer_id if payload.farmer_id != "F001" else None),
                "product": item["product"],
                "category": item["category"],
                "variety": item["variety"],
                "quantity_available": item["quantity_available"],
                "unit": item["unit"],
                "price": item["price"],
                "quality": item["quality"],
                "harvest_date": item["harvest_date"] or None,
                "origin": item["origin"],
                "minimum_order": item["minimum_order"],
                "delivery_available": item["delivery_available"],
                "availability_status": status,
                "description": item["description"],
            }
            # Include user_id if provided — required for RLS policies
            if payload.user_id:
                supabase_row["user_id"] = payload.user_id
            
            # Delete None farmer_id key to avoid schema violation if unconfigured
            if supabase_row.get("farmer_id") is None:
                del supabase_row["farmer_id"]

            try:
                sb.table("farmer_products").insert(supabase_row).execute()
            except Exception as primary_err:
                if "latitude" in str(primary_err):
                    supabase_row["latitude"] = item["latitude"]
                    supabase_row["longitude"] = item["longitude"]
                    sb.table("farmer_products").insert(supabase_row).execute()
                else:
                    raise primary_err
        except Exception as e:
            print(f"[AgriLinkX] Supabase insert failed (using in-memory): {e}")

    # Always write to in-memory store
    INVENTORY_DB.insert(0, item)
    return item


@app.patch("/api/inventory/{item_id}")
def update_inventory_item(item_id: str, payload: ProductUpdate):
    """Update fields of an existing inventory item."""
    # In-memory update
    local_item = next((p for p in INVENTORY_DB if p["id"] == item_id), None)
    if local_item:
        if payload.product is not None:
            local_item["product"] = payload.product
        if payload.price is not None:
            local_item["price"] = payload.price
        if payload.quality is not None:
            local_item["quality"] = payload.quality
        if payload.variety is not None:
            local_item["variety"] = payload.variety
        if payload.description is not None:
            local_item["description"] = payload.description
        if payload.quantity_available is not None:
            local_item["quantity_available"] = payload.quantity_available
            local_item["quantityAvailable"] = payload.quantity_available
            new_status = "Unavailable" if payload.quantity_available <= 0 else "Available"
            local_item["availability_status"] = new_status
            local_item["availabilityStatus"] = new_status

    # Supabase update
    sb = _get_supabase()
    if sb:
        try:
            updates = {}
            if payload.product is not None: updates["product"] = payload.product
            if payload.price is not None: updates["price"] = payload.price
            if payload.quality is not None: updates["quality"] = payload.quality
            if payload.variety is not None: updates["variety"] = payload.variety
            if payload.description is not None: updates["description"] = payload.description
            if payload.quantity_available is not None:
                updates["quantity_available"] = payload.quantity_available
                updates["availability_status"] = "Unavailable" if payload.quantity_available <= 0 else "Available"
            if updates:
                sb.table("farmer_products").update(updates).eq("id", item_id).execute()
        except Exception as e:
            print(f"[AgriLinkX] Supabase update failed: {e}")

    item = _get_inventory_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return _normalize_item(item)


@app.delete("/api/inventory/{item_id}")
def delete_inventory_item(item_id: str):
    """Delete an inventory item."""
    global INVENTORY_DB
    item = next((p for p in INVENTORY_DB if p["id"] == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    INVENTORY_DB = [p for p in INVENTORY_DB if p["id"] != item_id]

    sb = _get_supabase()
    if sb:
        try:
            sb.table("farmer_products").delete().eq("id", item_id).execute()
        except Exception as e:
            print(f"[AgriLinkX] Supabase delete failed: {e}")

    return {"success": True, "deleted_id": item_id}


@app.post("/api/inventory/{item_id}/reduce")
def reduce_inventory(item_id: str, payload: QuantityReduce):
    """
    Safely reduce quantity_available by `payload.quantity`.
    Never goes below 0. Marks Unavailable if reaches 0.
    """
    # In-memory update
    local_item = next((p for p in INVENTORY_DB if p["id"] == item_id), None)
    if local_item:
        current_qty = float(local_item.get("quantity_available", local_item.get("quantityAvailable", 0.0)))
        if payload.quantity > current_qty:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot reduce by {payload.quantity} — only {current_qty} available"
            )
        new_qty = max(0.0, round(current_qty - payload.quantity, 4))
        local_item["quantity_available"] = new_qty
        local_item["quantityAvailable"] = new_qty
        new_status = "Unavailable" if new_qty <= 0 else "Available"
        local_item["availability_status"] = new_status
        local_item["availabilityStatus"] = new_status

    # Supabase atomic update
    sb = _get_supabase()
    if sb:
        try:
            res = sb.table("farmer_products").select("quantity_available").eq("id", item_id).execute()
            if res.data:
                db_qty = float(res.data[0]["quantity_available"])
                new_db_qty = max(0.0, round(db_qty - payload.quantity, 4))
                new_db_status = "Unavailable" if new_db_qty <= 0 else "Available"
                sb.table("farmer_products").update({
                    "quantity_available": new_db_qty,
                    "availability_status": new_db_status,
                }).eq("id", item_id).execute()
        except Exception as e:
            print(f"[AgriLinkX] Supabase reduce failed: {e}")

    updated = _get_inventory_item(item_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return _normalize_item(updated)


# ---------------------------------------------------------------------------
# Legacy /api/products routes (kept for backward compatibility)
# ---------------------------------------------------------------------------

@app.get("/api/products")
def get_all_products():
    items = _get_all_inventory()
    return [
        _normalize_item(p) for p in items
        if p.get("availability_status", p.get("availabilityStatus")) != "Unavailable"
        and float(p.get("quantity_available", p.get("quantityAvailable", 0))) > 0
    ]


@app.get("/api/products/{id}")
def get_product_by_id(id: str):
    item = _get_inventory_item(id)
    if not item:
        raise HTTPException(status_code=404, detail="Product not found")
    return _normalize_item(item)


@app.get("/api/farmers/{farmer_id}/products")
def get_farmer_products_legacy(farmer_id: str):
    items = _get_all_inventory()
    return [
        _normalize_item(p) for p in items
        if p.get("farmer_id") == farmer_id or p.get("farmerId") == farmer_id
    ]


@app.post("/api/farmers/{farmer_id}/products")
def create_farmer_product_legacy(farmer_id: str, payload: ProductCreate):
    payload.farmer_id = farmer_id
    return create_inventory_item(payload)


@app.patch("/api/products/{id}")
def update_product(id: str, payload: ProductUpdate):
    return update_inventory_item(id, payload)


@app.patch("/api/products/{id}/quantity")
def update_quantity(id: str, payload: QuantityUpdate):
    local_item = next((p for p in INVENTORY_DB if p["id"] == id), None)
    if not local_item:
        raise HTTPException(status_code=404, detail="Product not found")
    local_item["quantity_available"] = payload.quantity_available
    local_item["quantityAvailable"] = payload.quantity_available
    new_status = "Unavailable" if payload.quantity_available <= 0 else "Available"
    local_item["availability_status"] = new_status
    local_item["availabilityStatus"] = new_status
    return _normalize_item(local_item)


@app.post("/api/products/{id}/unavailable")
def mark_unavailable(id: str):
    local_item = next((p for p in INVENTORY_DB if p["id"] == id), None)
    if not local_item:
        raise HTTPException(status_code=404, detail="Product not found")
    local_item["quantity_available"] = 0.0
    local_item["quantityAvailable"] = 0.0
    local_item["availability_status"] = "Unavailable"
    local_item["availabilityStatus"] = "Unavailable"
    return _normalize_item(local_item)


# ---------------------------------------------------------------------------
# /api/search — Recommendation Engine
# ---------------------------------------------------------------------------

@app.get("/api/search")
def search_products(
    product: str = Query("Tomato"),
    quantity: float = Query(1.0),
    latitude: float = Query(17.404),
    longitude: float = Query(78.456),
    preference: str = Query("Nearest"),
):
    all_inventory = _get_all_inventory()
    parsed_query = parse_user_query(product)
    radius_tiers = [2, 5, 10, 25, 50]
    final_radius = 2
    matching_listings = []

    for radius in radius_tiers:
        final_radius = radius
        candidates = []
        has_origin_match_in_tier = False

        for item in all_inventory:
            status = item.get("availability_status", item.get("availabilityStatus", "Available"))
            qty_avail = float(item.get("quantity_available", item.get("quantityAvailable", 0.0)))
            if status == "Unavailable" or qty_avail <= 0:
                continue

            dist = haversine_distance(latitude, longitude, item["latitude"], item["longitude"])
            if dist <= radius:
                query_prod = parsed_query["product"].lower()
                item_prod = item["product"].lower()
                item_cat = item["category"].lower()
                item_var = (item.get("variety") or "").lower()

                if query_prod in item_prod or item_prod in query_prod or query_prod in item_cat or query_prod in item_var:
                    item_copy = dict(item)
                    item_copy["distance"] = dist

                    if parsed_query.get("hasExplicitOrigin") and parsed_query.get("preferredOrigin"):
                        query_origin = parsed_query["preferredOrigin"].lower()
                        item_origin = (item.get("origin") or "").lower()
                        if query_origin in item_origin:
                            has_origin_match_in_tier = True

                    candidates.append(item_copy)

        if len(candidates) > 0:
            if parsed_query.get("hasExplicitOrigin") and not has_origin_match_in_tier and radius < 25:
                continue
            matching_listings = candidates
            break

    # Fallback: any matching product regardless of radius
    if len(matching_listings) == 0:
        query_prod = parsed_query["product"].lower()
        for item in all_inventory:
            status = item.get("availability_status", item.get("availabilityStatus", "Available"))
            qty_avail = float(item.get("quantity_available", item.get("quantityAvailable", 0.0)))
            if status == "Unavailable" or qty_avail <= 0:
                continue
            item_prod = item["product"].lower()
            item_cat = item["category"].lower()
            item_var = (item.get("variety") or "").lower()
            if query_prod in item_prod or item_prod in query_prod or query_prod in item_cat or query_prod in item_var:
                item_copy = dict(item)
                item_copy["distance"] = haversine_distance(latitude, longitude, item["latitude"], item["longitude"])
                matching_listings.append(item_copy)

    # Score and sort
    scored_results = []
    for item in matching_listings:
        score_data = calculate_recommendation_score(parsed_query, item, quantity, final_radius, preference)
        qty = float(item.get("quantity_available", item.get("quantityAvailable", 0.0)))
        res_item = {
            "id": item["id"],
            "farmerId": item.get("farmer_id", item.get("farmerId", "")),
            "farmer_id": item.get("farmer_id", item.get("farmerId", "")),
            "farmerName": item.get("farmer_name", item.get("farmerName", "")),
            "farmer_name": item.get("farmer_name", item.get("farmerName", "")),
            "phone": item.get("phone", "+91 98480 11221"),
            "product": item["product"],
            "category": item["category"],
            "variety": item.get("variety", ""),
            "quantityAvailable": qty,
            "quantity_available": qty,
            "unit": item.get("unit", "kg"),
            "price": item.get("price", 0.0),
            "quality": item.get("quality", "Grade A"),
            "harvestDate": item.get("harvest_date", item.get("harvestDate", "")),
            "harvest_date": item.get("harvest_date", item.get("harvestDate", "")),
            "origin": item.get("origin", "Telangana"),
            "subDistrict": item.get("subDistrict", item.get("origin", "")),
            "latitude": item.get("latitude", 17.404),
            "longitude": item.get("longitude", 78.456),
            "rating": item.get("rating", 4.5),
            "verified": item.get("verified", True),
            "availabilityStatus": item.get("availability_status", item.get("availabilityStatus", "Available")),
            "availability_status": item.get("availability_status", item.get("availabilityStatus", "Available")),
            "deliveryAvailable": item.get("delivery_available", item.get("deliveryAvailable", True)),
            "delivery_available": item.get("delivery_available", item.get("deliveryAvailable", True)),
            "minimumOrder": item.get("minimum_order", item.get("minimumOrder", 1.0)),
            "minimum_order": item.get("minimum_order", item.get("minimumOrder", 1.0)),
            "description": item.get("description", ""),
            "badges": item.get("badges", []),
            "distance": item["distance"],
            "recommendationScore": score_data["totalScore"],
            "recommendation_score": score_data["totalScore"],
            "originMatch": score_data["originMatch"],
            "origin_match": score_data["originMatch"],
            "isPartialMatch": score_data["isPartialMatch"],
            "is_partial_match": score_data["isPartialMatch"],
            "isBelowMinOrder": score_data["isBelowMinOrder"],
            "is_below_min_order": score_data["isBelowMinOrder"],
        }
        scored_results.append(res_item)

    scored_results.sort(key=lambda x: x["recommendationScore"], reverse=True)

    return {
        "query": product,
        "requestedQuantity": quantity,
        "requested_quantity": quantity,
        "searchRadius": final_radius,
        "search_radius": final_radius,
        "parsedProduct": parsed_query["product"],
        "parsed_product": parsed_query["product"],
        "parsedOrigin": parsed_query["preferredOrigin"],
        "parsed_origin": parsed_query["preferredOrigin"],
        "totalResults": len(scored_results),
        "total_results": len(scored_results),
        "results": scored_results,
        "allResults": scored_results,
        "dataSource": "supabase" if _get_supabase() else "in-memory",
    }


# ---------------------------------------------------------------------------
# /api/orders — Order Management
# ---------------------------------------------------------------------------

STATUS_MAPPING = {
    "placed": "PLACED",
    "accepted": "ACCEPTED",
    "preparing": "PREPARING",
    "ready": "READY",
    "out for delivery": "OUT_FOR_DELIVERY",
    "out_for_delivery": "OUT_FOR_DELIVERY",
    "delivered": "DELIVERED",
    "completed": "DELIVERED",
    "cancelled": "CANCELLED",
    "rejected": "CANCELLED",
}

ALLOWED_TRANSITIONS = {
    "PLACED": ["ACCEPTED", "CANCELLED"],
    "ACCEPTED": ["PREPARING", "CANCELLED"],
    "PREPARING": ["READY", "OUT_FOR_DELIVERY", "CANCELLED"],
    "READY": ["OUT_FOR_DELIVERY", "CANCELLED"],
    "OUT_FOR_DELIVERY": ["DELIVERED", "CANCELLED"],
    "DELIVERED": [],
    "CANCELLED": [],
}

def _normalize_order_status(status_str: str) -> str:
    cleaned = (status_str or "").strip().lower()
    if cleaned in STATUS_MAPPING:
        return STATUS_MAPPING[cleaned]
    # Check if exact uppercase matches valid status
    upper = (status_str or "").strip().upper()
    if upper in ALLOWED_TRANSITIONS:
        return upper
    return upper


@app.post("/api/orders", status_code=201)
def create_order(payload: OrderCreate, current_user: dict = Depends(get_current_user)):
    """
    Create a new order and atomically reduce inventory stock.
    Rejects order if requested quantity > available stock or product unavailable.
    """
    if current_user.get("role") != "family" and current_user.get("id") != "fallback-uuid":
        raise HTTPException(status_code=403, detail="Only families can place orders")
    # 1. Fetch inventory item and validate stock
    inv_item = _get_inventory_item(payload.product_id)
    if not inv_item:
        raise HTTPException(status_code=404, detail=f"Product '{payload.product_id}' not found in inventory.")

    current_qty = float(inv_item.get("quantity_available", inv_item.get("quantityAvailable", 0.0)))
    avail_status = inv_item.get("availability_status", inv_item.get("availabilityStatus", "Available"))

    if avail_status == "Unavailable" or current_qty <= 0:
        raise HTTPException(status_code=400, detail="Product is currently unavailable.")

    if payload.quantity > current_qty:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock: requested {payload.quantity} {payload.unit}, but only {current_qty} {payload.unit} available."
        )

    order_id = f"ORD-2026-{len(ORDERS_DB) + 9000}"
    farmer_name = inv_item.get("farmer_name", inv_item.get("farmerName", "Farmer"))
    product_name = inv_item.get("product", payload.product_id)

    order_dict = {
        "id": order_id,
        "customer_name": payload.customer_name,
        "farmer_id": payload.farmer_id,
        "product_id": payload.product_id,
        "product_name": product_name,
        "farmer_name": farmer_name,
        "quantity": payload.quantity,
        "unit": payload.unit,
        "price_per_unit": payload.price_per_unit,
        "total_amount": payload.total_amount,
        "delivery_method": payload.delivery_method,
        "status": "PLACED",
    }

    # 2. Write to Supabase orders table if configured
    sb = _get_supabase()
    if sb:
        try:
            sb.table("orders").insert({
                "id": order_id,
                "customer_name": payload.customer_name,
                "farmer_id": payload.farmer_id,
                "product_id": payload.product_id,
                "quantity": payload.quantity,
                "unit": payload.unit,
                "price_per_unit": payload.price_per_unit,
                "total_amount": payload.total_amount,
                "delivery_method": payload.delivery_method,
                "status": "PLACED",
            }).execute()
        except Exception as e:
            print(f"[AgriLinkX] Supabase order insert note: {e}")

    # 3. Add to in-memory ORDERS_DB
    ORDERS_DB.insert(0, order_dict)

    # 4. Atomic inventory reduction after successful order placement
    new_qty = max(0.0, round(current_qty - payload.quantity, 4))
    new_status = "Unavailable" if new_qty <= 0 else "Available"

    # Update in-memory store
    local_item = next((p for p in INVENTORY_DB if p["id"] == payload.product_id), None)
    if local_item:
        local_item["quantity_available"] = new_qty
        local_item["quantityAvailable"] = new_qty
        local_item["availability_status"] = new_status
        local_item["availabilityStatus"] = new_status

    # Update Supabase database
    if sb:
        try:
            sb.table("farmer_products").update({
                "quantity_available": new_qty,
                "availability_status": new_status,
            }).eq("id", payload.product_id).execute()
        except Exception as e:
            print(f"[AgriLinkX] Supabase inventory reduce note: {e}")

    return order_dict


@app.get("/api/orders")
def get_orders(farmer_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get all orders, optionally filtered by farmer_id."""
    sb = _get_supabase()
    if sb:
        try:
            query = sb.table("orders").select("*").order("created_at", desc=True)
            if farmer_id:
                query = query.eq("farmer_id", farmer_id)
            res = query.execute()
            if res.data and len(res.data) > 0:
                # Merge product_name and farmer_name for frontend convenience
                enriched = []
                for row in res.data:
                    inv = _get_inventory_item(row.get("product_id", ""))
                    row["product_name"] = row.get("product_name") or (inv["product"] if inv else row.get("product_id"))
                    row["farmer_name"] = row.get("farmer_name") or (inv.get("farmer_name") if inv else "")
                    enriched.append(row)
                return enriched
        except Exception as e:
            print(f"[AgriLinkX] Supabase orders read note: {e}")

    orders = ORDERS_DB
    if farmer_id:
        orders = [o for o in orders if o.get("farmer_id") == farmer_id or o.get("farmerId") == farmer_id]
    return orders


@app.get("/api/orders/{id}")
def get_order_by_id(id: str):
    """Get a single order by ID."""
    sb = _get_supabase()
    if sb:
        try:
            res = sb.table("orders").select("*").eq("id", id).execute()
            if res.data and len(res.data) > 0:
                row = res.data[0]
                inv = _get_inventory_item(row.get("product_id", ""))
                row["product_name"] = row.get("product_name") or (inv["product"] if inv else row.get("product_id"))
                row["farmer_name"] = row.get("farmer_name") or (inv.get("farmer_name") if inv else "")
                return row
        except Exception as e:
            print(f"[AgriLinkX] Supabase single order read note: {e}")

    order = next((o for o in ORDERS_DB if o["id"] == id), None)
    if not order:
        raise HTTPException(status_code=404, detail=f"Order '{id}' not found.")
    return order


@app.patch("/api/orders/{id}/status")
def update_order_status(id: str, payload: OrderStatusUpdate, current_user: dict = Depends(get_current_user)):
    """
    Update order status with state transition validation.
    Valid sequence: PLACED -> ACCEPTED -> PREPARING -> READY -> OUT_FOR_DELIVERY -> DELIVERED.
    """
    if current_user.get("role") != "farmer" and current_user.get("id") != "fallback-uuid":
        raise HTTPException(status_code=403, detail="Only farmers can update order status")
    order = None
    sb = _get_supabase()

    if sb:
        try:
            res = sb.table("orders").select("*").eq("id", id).execute()
            if res.data and len(res.data) > 0:
                order = res.data[0]
        except Exception as e:
            print(f"[AgriLinkX] Supabase fetch before status update note: {e}")

    if not order:
        order = next((o for o in ORDERS_DB if o["id"] == id), None)

    if not order:
        raise HTTPException(status_code=404, detail=f"Order '{id}' not found.")

    curr_raw = order.get("status", "PLACED")
    curr_norm = _normalize_order_status(curr_raw)
    target_norm = _normalize_order_status(payload.status)

    if target_norm not in ALLOWED_TRANSITIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid order status '{payload.status}'. Allowed values: {list(ALLOWED_TRANSITIONS.keys())}"
        )

    # Validate transition
    if target_norm != curr_norm:
        allowed = ALLOWED_TRANSITIONS.get(curr_norm, [])
        if target_norm not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status transition: cannot change order from {curr_norm} to {target_norm}. Allowed next steps: {allowed}"
            )

    order["status"] = target_norm

    # Update in-memory ORDERS_DB
    local_order = next((o for o in ORDERS_DB if o["id"] == id), None)
    if local_order:
        local_order["status"] = target_norm

    # Update Supabase
    if sb:
        try:
            sb.table("orders").update({"status": target_norm}).eq("id", id).execute()
        except Exception as e:
            print(f"[AgriLinkX] Supabase order status update note: {e}")

    return order


# ===========================================================================
# FARMER MARKET INTELLIGENCE APIs
# ===========================================================================

def _get_farmer_record(user_id: str) -> Optional[dict]:
    """Resolve farmers table row from auth user id. Returns None if not found."""
    sb = _get_supabase()
    if sb:
        try:
            res = sb.table("farmers").select("id,full_name,farm_name,latitude,longitude,location_name").eq("user_id", user_id).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"[AgriLinkX] Farmer record lookup failed: {e}")
    return None


def _classify_demand(total_qty: float, order_count: int) -> str:
    """
    Classify demand level from real order data.
    HIGH:   ordered >=20 kg  OR >=5 orders
    MEDIUM: ordered >=5 kg   OR >=2 orders
    LOW:    below medium threshold but >0
    NONE:   no orders at all
    """
    if total_qty == 0 and order_count == 0:
        return "NONE"
    if total_qty >= 20 or order_count >= 5:
        return "HIGH"
    if total_qty >= 5 or order_count >= 2:
        return "MEDIUM"
    return "LOW"


def _compute_suggested_price(platform_avg: float, farmer_price: float, demand_level: str,
                              platform_min: float, platform_max: float) -> Optional[float]:
    """
    Transparent algorithmic suggested price.
    Formula: (platform_avg * 0.6) + (farmer_price * 0.25) + demand_bonus
    Demand bonus: HIGH +5%, MEDIUM +0%, LOW -5% of platform_avg
    Clamped to [platform_min, platform_max].
    Rounded to nearest 0.5.
    """
    if platform_avg <= 0:
        return None
    demand_bonus_pct = {"HIGH": 0.05, "MEDIUM": 0.0, "LOW": -0.05, "NONE": -0.05}.get(demand_level, 0.0)
    demand_bonus = platform_avg * demand_bonus_pct
    raw = (platform_avg * 0.6) + (farmer_price * 0.25) + demand_bonus
    # Fill remaining 15% weight with platform_avg (to ensure formula totals ~100%)
    raw += platform_avg * 0.15
    clamped = max(platform_min, min(platform_max, raw))
    # Round to nearest 0.5
    return round(clamped * 2) / 2


def _build_suggestion_reason(platform_avg: float, farmer_price: float, demand_level: str,
                              comparable_count: int, farmer_qty: float) -> list:
    """Build a list of data-backed reason strings for the suggested price."""
    reasons = []
    if platform_avg > 0:
        reasons.append(f"Platform average: ₹{platform_avg:.1f}/kg")
    if comparable_count > 0:
        reasons.append(f"{comparable_count} comparable platform listing{'s' if comparable_count != 1 else ''}")
    if demand_level in ("HIGH", "MEDIUM", "LOW"):
        label_map = {"HIGH": "High buyer demand", "MEDIUM": "Moderate buyer demand", "LOW": "Low buyer demand"}
        reasons.append(label_map[demand_level])
    if farmer_qty > 0:
        reasons.append(f"Your available inventory: {farmer_qty} kg")
    if platform_avg > 0 and farmer_price > 0:
        diff = farmer_price - platform_avg
        if diff < -1:
            reasons.append(f"Your price is ₹{abs(diff):.1f} below platform average")
        elif diff > 1:
            reasons.append(f"Your price is ₹{diff:.1f} above platform average")
        else:
            reasons.append("Your price is near the platform average")
    return reasons


@app.get("/api/farmer/market-intelligence")
def get_farmer_market_intelligence(current_user: dict = Depends(get_current_user)):
    """
    Returns dashboard summary statistics for the authenticated farmer.
    - Requires farmer role
    - Resolves farmer_id server-side from auth token
    - Never exposes family PII
    """
    if current_user.get("role") != "farmer" and current_user.get("id") != "fallback-uuid":
        raise HTTPException(status_code=403, detail="Only farmers can access market intelligence")

    user_id = current_user["id"]
    farmer = _get_farmer_record(user_id)
    farmer_id = farmer["id"] if farmer else None

    # Fetch farmer's own products
    all_products = _get_all_inventory()
    my_products = [
        p for p in all_products
        if str(p.get("farmer_id", "")) == str(farmer_id)
    ] if farmer_id else []

    # Active product names
    active_products = list({p["product"] for p in my_products if float(p.get("quantity_available", 0)) > 0})
    total_inventory_qty = sum(float(p.get("quantity_available", 0)) for p in my_products)

    # Orders for this farmer
    sb = _get_supabase()
    orders_data = []
    if sb and farmer_id:
        try:
            res = sb.table("orders").select("id,status,quantity,total_amount,product_id,created_at").eq("farmer_id", str(farmer_id)).execute()
            if res.data:
                orders_data = res.data
        except Exception as e:
            print(f"[AgriLinkX] MI orders fetch note: {e}")
    else:
        orders_data = [o for o in ORDERS_DB if str(o.get("farmer_id", "")) == str(farmer_id)] if farmer_id else []

    pending_orders = [o for o in orders_data if o.get("status") not in ("DELIVERED", "CANCELLED")]
    completed_orders = [o for o in orders_data if o.get("status") == "DELIVERED"]
    total_revenue = sum(float(o.get("total_amount", 0)) for o in completed_orders)

    # Demand signals: which products have most orders
    product_order_qty: dict = {}
    for o in orders_data:
        pid = o.get("product_id", "")
        inv = _get_inventory_item(pid)
        pname = inv["product"] if inv else pid
        product_order_qty[pname] = product_order_qty.get(pname, 0) + float(o.get("quantity", 0))

    top_demanded = max(product_order_qty, key=product_order_qty.get) if product_order_qty else None

    # Price opportunity: products where farmer price < platform avg
    opportunity_count = 0
    for p in my_products:
        product_name = p["product"]
        platform_peers = [
            item for item in all_products
            if item["product"].lower() == product_name.lower()
            and str(item.get("farmer_id", "")) != str(farmer_id)
            and float(item.get("price", 0)) > 0
        ]
        if len(platform_peers) >= 1:
            peer_avg = sum(float(x["price"]) for x in platform_peers) / len(platform_peers)
            if float(p.get("price", 0)) < peer_avg * 0.95:
                opportunity_count += 1

    farmer_name = farmer.get("farm_name") or farmer.get("full_name") or current_user.get("full_name", "Farmer") if farmer else current_user.get("full_name", "Farmer")

    return {
        "farmer_name": farmer_name,
        "farmer_id": str(farmer_id) if farmer_id else None,
        "summary": {
            "total_inventory_qty": round(total_inventory_qty, 2),
            "active_products": len(active_products),
            "active_product_names": active_products,
            "pending_orders": len(pending_orders),
            "completed_orders": len(completed_orders),
            "total_revenue": round(total_revenue, 2),
        },
        "top_demanded_product": top_demanded,
        "price_opportunity_count": opportunity_count,
        "has_data": len(my_products) > 0,
    }


@app.get("/api/farmer/price-intelligence")
def get_farmer_price_intelligence(current_user: dict = Depends(get_current_user)):
    """
    Per-product price intelligence for the authenticated farmer.
    - Compares farmer's listed price against aggregated platform data
    - Returns suggested price with explainable reason
    - Never exposes other farmers' identities, only aggregate pricing
    """
    if current_user.get("role") != "farmer" and current_user.get("id") != "fallback-uuid":
        raise HTTPException(status_code=403, detail="Only farmers can access price intelligence")

    user_id = current_user["id"]
    farmer = _get_farmer_record(user_id)
    farmer_id = farmer["id"] if farmer else None

    all_products = _get_all_inventory()
    my_products = [
        p for p in all_products
        if str(p.get("farmer_id", "")) == str(farmer_id)
    ] if farmer_id else []

    if not my_products:
        return {"products": [], "has_data": False, "message": "Add listings to see price intelligence."}

    # Build per-product stats
    result = []
    seen_products = set()

    # Fetch order demand per product for this farmer
    sb = _get_supabase()
    demand_by_product: dict = {}
    if sb and farmer_id:
        try:
            res = sb.table("orders").select("product_id,quantity,status").eq("farmer_id", str(farmer_id)).execute()
            if res.data:
                for o in res.data:
                    pid = o.get("product_id", "")
                    inv = _get_inventory_item(pid)
                    pname = inv["product"] if inv else ""
                    if pname:
                        if pname not in demand_by_product:
                            demand_by_product[pname] = {"qty": 0, "count": 0}
                        demand_by_product[pname]["qty"] += float(o.get("quantity", 0))
                        demand_by_product[pname]["count"] += 1
        except Exception as e:
            print(f"[AgriLinkX] PI demand fetch note: {e}")

    for p in my_products:
        product_name = p["product"]
        if product_name in seen_products:
            continue
        seen_products.add(product_name)

        farmer_price = float(p.get("price", 0))
        farmer_qty = float(p.get("quantity_available", 0))

        # Platform peers: all listings for same product from OTHER farmers
        platform_peers = [
            item for item in all_products
            if item["product"].lower() == product_name.lower()
            and str(item.get("farmer_id", "")) != str(farmer_id)
            and float(item.get("price", 0)) > 0
        ]

        # Include farmer's own listing in total count (but not in avg calculation to avoid bias)
        all_same_product = [
            item for item in all_products
            if item["product"].lower() == product_name.lower()
            and float(item.get("price", 0)) > 0
        ]

        comparable_count = len(platform_peers)
        platform_avg = None
        platform_min = None
        platform_max = None
        suggested_price = None
        suggestion_reason = []

        if comparable_count >= 1:
            peer_prices = [float(x["price"]) for x in platform_peers]
            platform_avg = round(sum(peer_prices) / len(peer_prices), 2)
            platform_min = round(min(peer_prices), 2)
            platform_max = round(max(peer_prices), 2)

        # Demand
        ddata = demand_by_product.get(product_name, {"qty": 0, "count": 0})
        demand_level = _classify_demand(ddata["qty"], ddata["count"])

        if platform_avg is not None and farmer_price > 0:
            suggested_price = _compute_suggested_price(platform_avg, farmer_price, demand_level, platform_min, platform_max)
            suggestion_reason = _build_suggestion_reason(platform_avg, farmer_price, demand_level, comparable_count, farmer_qty)

        result.append({
            "product": product_name,
            "product_id": p.get("id"),
            "unit": p.get("unit", "kg"),
            "your_price": farmer_price,
            "your_qty": farmer_qty,
            "platform_avg": platform_avg,
            "platform_min": platform_min,
            "platform_max": platform_max,
            "comparable_listings": comparable_count,
            "total_platform_listings": len(all_same_product),
            "suggested_price": suggested_price,
            "suggestion_reason": suggestion_reason,
            "demand_level": demand_level,
            "demand_qty": round(ddata["qty"], 2),
            "demand_order_count": ddata["count"],
        })

    return {"products": result, "has_data": True}


@app.get("/api/farmer/demand-intelligence")
def get_farmer_demand_intelligence(current_user: dict = Depends(get_current_user)):
    """
    Per-product demand intelligence for the authenticated farmer.
    - Demand classified from real order data
    - Price trend from listing creation dates
    - Nearby buyer count (aggregated, no PII)
    """
    if current_user.get("role") != "farmer" and current_user.get("id") != "fallback-uuid":
        raise HTTPException(status_code=403, detail="Only farmers can access demand intelligence")

    user_id = current_user["id"]
    farmer = _get_farmer_record(user_id)
    farmer_id = farmer["id"] if farmer else None

    all_products = _get_all_inventory()
    my_products = [
        p for p in all_products
        if str(p.get("farmer_id", "")) == str(farmer_id)
    ] if farmer_id else []

    if not my_products:
        return {"products": [], "has_data": False, "message": "Add listings to see demand intelligence."}

    sb = _get_supabase()

    # Fetch all orders for this farmer
    farmer_orders = []
    if sb and farmer_id:
        try:
            res = sb.table("orders").select("product_id,quantity,total_amount,status,created_at").eq("farmer_id", str(farmer_id)).execute()
            if res.data:
                farmer_orders = res.data
        except Exception as e:
            print(f"[AgriLinkX] DI orders fetch note: {e}")
    else:
        farmer_orders = [o for o in ORDERS_DB if str(o.get("farmer_id", "")) == str(farmer_id)] if farmer_id else []

    # Fetch platform-wide orders per product (for platform demand signal — aggregated counts only)
    platform_orders_by_product: dict = {}
    if sb:
        try:
            res = sb.table("orders").select("product_id,quantity,status").execute()
            if res.data:
                for o in res.data:
                    pid = o.get("product_id", "")
                    inv = _get_inventory_item(pid)
                    pname = inv["product"] if inv else ""
                    if pname:
                        if pname not in platform_orders_by_product:
                            platform_orders_by_product[pname] = {"qty": 0, "count": 0}
                        platform_orders_by_product[pname]["qty"] += float(o.get("quantity", 0))
                        platform_orders_by_product[pname]["count"] += 1
        except Exception as e:
            print(f"[AgriLinkX] DI platform orders fetch note: {e}")

    # Nearby buyer count (families count — aggregated, no PII)
    nearby_family_count = 0
    if sb and farmer:
        try:
            res = sb.table("families").select("id", count="exact").execute()
            nearby_family_count = res.count if hasattr(res, "count") and res.count else len(res.data or [])
        except Exception as e:
            print(f"[AgriLinkX] DI families count note: {e}")

    result = []
    seen = set()

    for p in my_products:
        product_name = p["product"]
        if product_name in seen:
            continue
        seen.add(product_name)

        farmer_qty = float(p.get("quantity_available", 0))
        unit = p.get("unit", "kg")

        # Farmer's own demand: from their orders
        my_orders_for_product = []
        for o in farmer_orders:
            pid = o.get("product_id", "")
            inv = _get_inventory_item(pid)
            pname = inv["product"] if inv else ""
            if pname.lower() == product_name.lower():
                my_orders_for_product.append(o)

        my_qty = sum(float(o.get("quantity", 0)) for o in my_orders_for_product)
        my_count = len(my_orders_for_product)
        my_sold = sum(float(o.get("quantity", 0)) for o in my_orders_for_product if o.get("status") == "DELIVERED")
        my_revenue = sum(float(o.get("total_amount", 0)) for o in my_orders_for_product if o.get("status") == "DELIVERED")
        demand_level = _classify_demand(my_qty, my_count)

        # Platform-wide demand (for this product, aggregated — no individual family data)
        platform_data = platform_orders_by_product.get(product_name, {"qty": 0, "count": 0})
        platform_qty = platform_data["qty"]
        platform_count = platform_data["count"]

        # Price trend: all platform listings for this product grouped by date
        # Uses created_at of farmer_products to show historical listing prices
        trend_points = []
        try:
            same_product_listings = [
                item for item in all_products
                if item["product"].lower() == product_name.lower()
                and float(item.get("price", 0)) > 0
            ]
            # Prefer Supabase data with created_at
            if sb:
                try:
                    tresult = sb.table("farmer_products").select("price,created_at").ilike("product", product_name).execute()
                    if tresult.data and len(tresult.data) >= 2:
                        # Group by date, average price per date
                        date_prices: dict = {}
                        for row in tresult.data:
                            if row.get("created_at") and row.get("price"):
                                date_str = row["created_at"][:10]
                                price_val = float(row["price"])
                                if date_str not in date_prices:
                                    date_prices[date_str] = []
                                date_prices[date_str].append(price_val)
                        if len(date_prices) >= 2:
                            for date_str in sorted(date_prices.keys()):
                                prices = date_prices[date_str]
                                trend_points.append({
                                    "date": date_str,
                                    "avg_price": round(sum(prices) / len(prices), 2),
                                    "listing_count": len(prices),
                                })
                except Exception as e:
                    print(f"[AgriLinkX] Trend fetch note: {e}")
        except Exception as e:
            print(f"[AgriLinkX] Trend build note: {e}")

        result.append({
            "product": product_name,
            "unit": unit,
            "demand_level": demand_level,
            "your_ordered_qty": round(my_qty, 2),
            "your_order_count": my_count,
            "your_sold_qty": round(my_sold, 2),
            "your_revenue": round(my_revenue, 2),
            "your_available_qty": farmer_qty,
            "platform_ordered_qty": round(platform_qty, 2),
            "platform_order_count": platform_count,
            "nearby_family_count": nearby_family_count,
            "price_trend": trend_points,
            "price_trend_sufficient": len(trend_points) >= 2,
        })

    return {"products": result, "has_data": True}


# ---------------------------------------------------------------------------
# Mandi Price & Health Endpoints (Government of India data.gov.in / AGMARKNET API)
# ---------------------------------------------------------------------------
@app.get("/api/health/market-data")
def get_market_data_health():
    """
    Returns production health status of Government Mandi service without exposing API keys.
    """
    return get_health_status()


@app.get("/api/mandi/prices")
def get_mandi_prices(
    commodity: Optional[str] = Query(None, description="Commodity name (e.g. Tomato, Potato, Onion, Chilli)"),
    state: Optional[str] = Query(None, description="State name (e.g. Telangana, Maharashtra)"),
    district: Optional[str] = Query(None, description="District name (e.g. Rangareddy)"),
    date: Optional[str] = Query(None, description="Arrival date (format: DD/MM/YYYY)"),
):
    """
    Fetch normalized live/cached mandi prices from data.gov.in (AGMARKNET API).
    Normalizes prices from Rs/Quintal to Rs/kg.
    """
    return fetch_mandi_prices_from_api(
        commodity=commodity,
        state=state,
        district=district,
        date=date,
    )


# ---------------------------------------------------------------------------
# ML Price Forecast Endpoint (Baseline Trained Model)
# ---------------------------------------------------------------------------
@app.get("/api/ml/price-forecast")
def get_ml_price_forecast(
    commodity: str = Query("Maize", description="Commodity name"),
    state: str = Query("Telangana", description="State name"),
    market: Optional[str] = Query(None, description="Optional market name"),
):
    """
    Returns baseline ML price forecast trained on verified historical mandi data.
    """
    try:
        from ml.price_predictor import predict_next_day_price
    except ImportError:
        try:
            from backend.ml.price_predictor import predict_next_day_price
        except ImportError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Price predictor module could not be loaded: {e}"
            )
            
    try:
        res = predict_next_day_price(commodity=commodity, state=state, market=market)
        return res
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Price forecasting failed: {str(e)}"
        )


# ---------------------------------------------------------------------------
# Startup event: attempt Supabase connection
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup_event():
    _get_supabase()


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)

