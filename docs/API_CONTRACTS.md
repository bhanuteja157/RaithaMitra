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
