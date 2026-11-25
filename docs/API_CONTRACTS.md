# RaithaMitra (ರೈತ ಮಿತ್ರ) — API Contracts & Specifications

**Protocol:** HTTP/1.1 & HTTP/2  
**Format:** JSON (`application/json`)  
**Base URL:** `http://127.0.0.1:8000/api/v1`  
**OpenAPI Specification:** `http://127.0.0.1:8000/docs`

---

## 1. System Health

### `GET /api/v1/health`
Checks backend service availability and connectivity to local storage and external APIs.

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "app_name": "RaithaMitra Agricultural Intelligence",
  "version": "1.0.0",
  "timestamp": "2026-11-25T09:55:00Z",
  "environment": "development",
  "services": {
    "database": "operational_local_adapter",
    "weather_service": "operational_open_meteo",
    "decision_engine": "operational_rule_based"
  }
}
```

---

## 2. Farm Management

### `GET /api/v1/farms`
Returns all farms accessible to the authenticated context.

**Response:** `200 OK`
```json
[
  {
    "id": "farm_001",
    "farmer_name": "Suresh Gowda",
    "preferred_language": "kn",
    "farm_name": "Cauvery Valley Organic Farm",
    "village": "Mandya Rural",
    "district": "Mandya",
    "state": "Karnataka",
    "latitude": 12.5234,
    "longitude": 76.8976,
    "land_area_ha": 2.5,
    "primary_crop": "Tomato",
    "crop_variety": "Arka Rakshak",
    "sowing_date": "2026-10-15",
    "crop_stage": "Mid-Season",
    "soil_type": "Red Sandy Loam",
    "irrigation_method": "Drip Irrigation",
    "water_source": "Borewell",
    "available_water_m3": 12000.0,
    "cultivation_budget_inr": 85000.0,
    "created_at": "2026-11-01T04:00:00Z",
    "updated_at": "2026-11-25T04:00:00Z"
  }
]
```

### `POST /api/v1/farms`
Registers a new farm profile during farmer onboarding.

**Request Body:**
```json
{
  "farmer_name": "Ananya Sharma",
  "preferred_language": "hi",
  "farm_name": "Narmada Green Acres",
  "village": "Hoshangabad",
  "district": "Narmadapuram",
  "state": "Madhya Pradesh",
  "latitude": 22.7533,
  "longitude": 77.7249,
  "land_area_ha": 3.0,
  "primary_crop": "Wheat",
  "crop_variety": "Sharbati",
  "sowing_date": "2026-11-05",
  "crop_stage": "Initial",
  "soil_type": "Black Cotton Soil",
  "irrigation_method": "Sprinkler",
  "water_source": "Canal",
  "available_water_m3": 25000.0,
  "cultivation_budget_inr": 110000.0
}
```

**Response:** `201 Created` (returns created farm object with auto-assigned `id`).

### `GET /api/v1/farms/{farm_id}`
Returns details for a single farm.

### `PATCH /api/v1/farms/{farm_id}`
Updates editable attributes of a farm profile.

---

## 3. Live Weather & Agrometeorology

### `GET /api/v1/weather`
Retrieves live weather observations and 7-day forecast from Open-Meteo for specified latitude and longitude.

**Query Parameters:**
- `lat` (float, required): Latitude (e.g., `12.5234`)
- `lon` (float, required): Longitude (e.g., `76.8976`)

**Response:** `200 OK`
```json
{
  "latitude": 12.5234,
  "longitude": 76.8976,
  "elevation_m": 680.0,
  "timezone": "Asia/Kolkata",
  "current": {
    "time": "2026-11-25T09:30:00Z",
    "temperature_c": 28.4,
    "relative_humidity_pct": 58,
    "precipitation_mm": 0.0,
    "rain_probability_pct": 12,
    "wind_speed_kmh": 9.2,
    "wind_direction_deg": 110,
    "weather_code": 1,
    "condition_text": "Mainly Clear",
    "et0_fao56_mm": 4.6
  },
  "daily_forecast": [
    {
      "date": "2026-11-25",
      "temp_max_c": 31.2,
      "temp_min_c": 19.5,
      "precipitation_sum_mm": 0.0,
      "rain_probability_max_pct": 15,
      "et0_fao56_mm": 4.6
    }
  ],
  "provenance": {
    "source": "Open-Meteo High Resolution Weather API",
    "timestamp": "2026-11-25T09:30:00Z",
    "quality": "live_telemetry"
  }
}
```

---

## 4. Centralized Decision Intelligence

### `GET /api/v1/recommendations`
Generates prioritized, evidence-grounded agronomic actions for a farm.

**Query Parameters:**
- `farm_id` (string, required): Target farm ID.

**Response:** `200 OK`
```json
{
  "farm_id": "farm_001",
  "generated_at": "2026-11-25T09:35:00Z",
  "overall_risk_level": "medium",
  "recommendations": [
    {
      "id": "rec_001",
      "category": "irrigation",
      "priority": "high",
      "action": "Schedule 2.5 hours drip cycle at 06:00 tomorrow",
      "reason": "Mid-season Tomato crop daily water demand is 4.8mm/day. Soil moisture in the top 20cm is declining toward the management allowed depletion threshold.",
      "supporting_data": {
        "et0_mm": 4.6,
        "crop_coefficient_kc": 1.15,
        "crop_water_demand_mm": 5.29,
        "forecasted_rain_mm": 0.0
      },
      "data_source": "FAO-56 Dual Crop Coefficient & Open-Meteo",
      "uncertainty": "±6%",
      "alternative_action": "Postpone by 12 hours if canal supply arrives this evening."
    }
  ]
}
```

---

## 5. Government Schemes

### `GET /api/v1/schemes`
Retrieves government agricultural schemes filtered by state, crop, and farmer category.

**Query Parameters:**
- `state` (optional): e.g., `Karnataka`
- `category` (optional): `all`, `small_marginal`, `general`

---

## 6. Agricultural Biotechnology Intelligence (BioIntel)

### `GET /api/v1/biotech/research`
Fetches live peer-reviewed scientific agricultural research from Europe PMC REST API with asynchronous caching, timeout handling, and evidence synthesis.

**Query Parameters:**
- `crop` (required): e.g. `Tomato`, `Rice`, `Banana`, `Chilli`
- `problem` (optional): e.g. `bacterial wilt`, `drought tolerance`
- `category` (optional): e.g. `biofertilizers`, `disease_resistant_varieties`
- `page_size` (optional, default: 10)

**Response:** `200 OK`
```json
{
  "crop": "Tomato",
  "query_used": "\"Tomato\" AND (biofertilizer OR (microbial consortium))",
  "total_results": 10,
  "papers": [
    {
      "title": "Application of microbial consortium biofertilizer enhances growth, physiological parameters, and fruit yield in Solanum lycopersicum L.",
      "authors": ["Kumar, R.", "Shashidhar, H.E.", "Gopalakrishnan, S."],
      "pub_year": 2024,
      "doi": "10.1016/j.scienta.2024.112890",
      "article_url": "https://doi.org/10.1016/j.scienta.2024.112890",
      "journal_title": "Scientia Horticulturae",
      "evidence_type": "established_practice",
      "is_open_access": true
    }
  ],
  "evidence_summary": "Based on 10 peer-reviewed agricultural studies...",
  "data_source": "Europe PMC Live REST API",
  "is_live": true,
  "cached": false
}
```

### `GET /api/v1/biotech/crop-varieties`
Retrieves institutionally verified crop cultivars, hybrids, tissue-cultured plantlets, and grafted rootstocks.

**Query Parameters:**
- `crop` (optional): `Tomato`, `Rice`, `Banana`, `Chilli`, `Mango`
- `category` (optional): Biotech category filter

### `POST /api/v1/biotech/recommendations`
Generates personalized, evidence-grounded biotechnology recommendations and provides standardized payload for Centralized Decision Engine.

**Request Body:**
```json
{
  "farm_id": "farm_001",
  "crop_type": "Tomato",
  "soil_type": "Red Sandy Loam",
  "soil_ph": 6.5,
  "water_availability": "Limited / Low",
  "cultivation_budget_inr": 75000.0,
  "previous_crop_diseases": ["Bacterial Wilt", "Tomato Leaf Curl Virus"]
}
```

---

## 7. Intelligent Nursery Marketplace & Procurement Optimization

### `GET /api/v1/nurseries/nearby`
Discovers nearby agricultural nurseries and suppliers via Google Places API (New) with fallback to clearly labelled demonstration nursery network.

**Query Parameters:**
- `lat` (required): Latitude
- `lon` (required): Longitude
- `radius_km` (optional, default: 50.0): 5, 10, 25, 50, 100
- `crop` (optional): e.g. `Tomato`

### `GET /api/v1/nurseries/products`
Searches verified planting materials, seeds, tissue-cultured plants, and biological inputs with distance, price, and category filters.

### `POST /api/v1/biotech/procurement-optimize`
Deterministic procurement optimizer calculating planting material cost, transportation freight, and budget suitability score.

**Request Body:**
```json
{
  "crop_name": "Tomato",
  "required_quantity": 5000,
  "farmer_latitude": 13.3409,
  "farmer_longitude": 77.1010,
  "farmer_budget_inr": 20000.0,
  "max_distance_km": 50.0
}
```

**Response:** `200 OK`
```json
{
  "optimal_option": {
    "product_id": "prod_demo_001",
    "nursery_name": "Tumakuru Bio-Horticulture Research Nursery",
    "variety_name": "Arka Rakshak F1 Hybrid Seedlings",
    "distance_km": 12.4,
    "price_per_unit": 1.25,
    "planting_material_cost": 6250.0,
    "transportation_cost": 398.8,
    "total_procurement_cost": 6648.8,
    "is_budget_feasible": true,
    "budget_surplus_or_deficit": 13351.2,
    "suitability_score": 92.5
  },
  "calculation_formula": {
    "planting_material_cost": "Required quantity × Price per unit",
    "transportation_cost": "Base logistics rate (₹250) + (Distance in km × ₹12/km)",
    "total_procurement_cost": "Planting material cost + Transportation cost"
  }
}
```

### `POST /api/v1/nurseries/products`
Creates a new certified product listing (Authorized Nursery Seller / Buyer Dashboard capability).

### `PATCH /api/v1/nurseries/products/{id}`
Updates product price, stock availability, or description.

### `POST /api/v1/nurseries/inquiries`
Submits a farmer purchase/availability inquiry to the nursery.

### `POST /api/v1/nurseries/compare`
Compares 2 to 6 supplier options side-by-side with landed costs and certifications.

