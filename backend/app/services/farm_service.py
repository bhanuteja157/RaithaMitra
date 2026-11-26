# backend/app/services/farm_service.py
"""
Farm Persistence Service with Local Prototype Persistence Adapter.
Implements the shared digital farm context across all 16 modules.
"""
from typing import List, Optional, Dict
from datetime import datetime, date, timezone
import uuid
from backend.app.db.database import get_db_connection
from backend.app.schemas.farm import Farm, FarmCreate, FarmUpdate, FarmSummary
from backend.app.engines.biophysical import calculate_crop_water_demand, estimate_root_zone_moisture

class FarmService:
    def __init__(self):
        # In-memory cache backed by SQLite farms table for ownership & cross-module consistency
        self._farms: Dict[str, Farm] = {}
        self._seed_default_farms()

    def _seed_default_farms(self):
        default_farm = Farm(
            id="farm_001",
            farmer_id="usr_farmer",
            farmer_name="Suresh Gowda",
            preferred_language="kn",
            farm_name="Cauvery Valley Organic Farm",
            village="Mandya Rural",
            district="Mandya",
            state="Karnataka",
            latitude=12.5234,
            longitude=76.8976,
            land_area_ha=2.5,
            primary_crop="Tomato",
            crop_variety="Arka Rakshak",
            sowing_date=date(2026, 10, 15),
            crop_stage="Mid-Season",
            soil_type="Red Sandy Loam",
            irrigation_method="Drip Irrigation",
            water_source="Borewell",
            available_water_m3=14500.0,
            cultivation_budget_inr=85000.0,
            created_at=datetime(2026, 11, 1, 4, 0, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 11, 25, 4, 0, 0, tzinfo=timezone.utc)
        )
        second_farm = Farm(
            id="farm_002",
            farmer_id="usr_farmer2",
            farmer_name="Ramesh Patil",
            preferred_language="en",
            farm_name="Krishna Basin Agro Field",
            village="Bagalkot Rural",
            district="Bagalkot",
            state="Karnataka",
            latitude=16.1800,
            longitude=75.6900,
            land_area_ha=4.0,
            primary_crop="Wheat",
            crop_variety="DWR-162",
            sowing_date=date(2026, 11, 2),
            crop_stage="Crop Development",
            soil_type="Black Cotton Soil",
            irrigation_method="Sprinkler",
            water_source="Canal",
            available_water_m3=32000.0,
            cultivation_budget_inr=120000.0,
            created_at=datetime(2026, 11, 5, 4, 0, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 11, 25, 4, 0, 0, tzinfo=timezone.utc)
        )
        self._farms[default_farm.id] = default_farm
        self._farms[second_farm.id] = second_farm

    def _row_to_farm(self, row) -> Farm:
        d = dict(row)
        cached = self._farms.get(d["id"])
        return Farm(
            id=d["id"],
            farmer_id=d.get("farmer_id"),
            farmer_name=d["farmer_name"],
            preferred_language=cached.preferred_language if cached else "en",
            farm_name=d["farm_name"],
            village=d["village"],
            district=d["district"],
            state=d["state"],
            latitude=float(d["latitude"]),
            longitude=float(d["longitude"]),
            land_area_ha=float(d["land_area_ha"]),
            primary_crop=d["primary_crop"],
            crop_variety=d.get("crop_variety"),
            sowing_date=d["sowing_date"],
            crop_stage=d.get("crop_stage") or "Mid-Season",
            soil_type=d["soil_type"],
            irrigation_method=d.get("irrigation_method") or "Drip Irrigation",
            water_source=d.get("water_source") or "Borewell",
            available_water_m3=float(d["available_water_m3"]) if d.get("available_water_m3") is not None else 0.0,
            cultivation_budget_inr=float(d["cultivation_budget_inr"]) if d.get("cultivation_budget_inr") is not None else 0.0,
            pin_code=cached.pin_code if cached else None,
            formatted_address=cached.formatted_address if cached else None,
            location_source=cached.location_source if cached else None,
            location_accuracy_m=cached.location_accuracy_m if cached else None,
            created_at=d["created_at"],
            updated_at=d["updated_at"],
        )

    def list_farms(self, farmer_id: Optional[str] = None) -> List[Farm]:
        try:
            conn = get_db_connection()
            try:
                if farmer_id:
                    rows = conn.execute("SELECT * FROM farms WHERE farmer_id = ? ORDER BY created_at ASC", (farmer_id,)).fetchall()
                else:
                    rows = conn.execute("SELECT * FROM farms ORDER BY created_at ASC").fetchall()
                if rows:
                    return [self._row_to_farm(r) for r in rows]
            finally:
                conn.close()
        except Exception:
            pass
        if farmer_id:
            return [f for f in self._farms.values() if f.farmer_id == farmer_id]
        return list(self._farms.values())

    def get_farm(self, farm_id: str) -> Optional[Farm]:
        try:
            conn = get_db_connection()
            try:
                row = conn.execute("SELECT * FROM farms WHERE id = ?", (farm_id,)).fetchone()
                if row:
                    return self._row_to_farm(row)
            finally:
                conn.close()
        except Exception:
            pass
        return self._farms.get(farm_id)

    def create_farm(self, farm_in: FarmCreate, farmer_id: str = "usr_farmer") -> Farm:
        new_id = f"farm_{uuid.uuid4().hex[:6]}"
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()
        new_farm = Farm(
            id=new_id,
            farmer_id=farmer_id,
            created_at=now,
            updated_at=now,
            **farm_in.model_dump()
        )
        self._farms[new_id] = new_farm
        try:
            conn = get_db_connection()
            try:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO farms (
                        id, farmer_id, farmer_name, farm_name, village, district, state,
                        latitude, longitude, land_area_ha, primary_crop, crop_variety,
                        sowing_date, crop_stage, soil_type, irrigation_method, water_source,
                        available_water_m3, cultivation_budget_inr, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        new_id, farmer_id, new_farm.farmer_name, new_farm.farm_name,
                        new_farm.village, new_farm.district, new_farm.state,
                        new_farm.latitude, new_farm.longitude, new_farm.land_area_ha,
                        new_farm.primary_crop, new_farm.crop_variety, str(new_farm.sowing_date),
                        new_farm.crop_stage, new_farm.soil_type, new_farm.irrigation_method,
                        new_farm.water_source, new_farm.available_water_m3,
                        new_farm.cultivation_budget_inr, now_iso, now_iso,
                    ),
                )
                conn.commit()
            finally:
                conn.close()
        except Exception:
            pass
        return new_farm

    def update_farm(self, farm_id: str, farm_update: FarmUpdate) -> Optional[Farm]:
        farm = self.get_farm(farm_id)
        if not farm:
            return None
        update_data = farm_update.model_dump(exclude_unset=True)
        updated_dict = farm.model_dump()
        updated_dict.update(update_data)
        now = datetime.now(timezone.utc)
        updated_dict["updated_at"] = now
        updated_farm = Farm(**updated_dict)
        self._farms[farm_id] = updated_farm
        try:
            conn = get_db_connection()
            try:
                conn.execute(
                    """
                    UPDATE farms SET
                        farmer_name = ?, farm_name = ?, village = ?, district = ?, state = ?,
                        latitude = ?, longitude = ?, land_area_ha = ?, primary_crop = ?,
                        crop_variety = ?, sowing_date = ?, crop_stage = ?, soil_type = ?,
                        irrigation_method = ?, water_source = ?, available_water_m3 = ?,
                        cultivation_budget_inr = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        updated_farm.farmer_name, updated_farm.farm_name, updated_farm.village,
                        updated_farm.district, updated_farm.state, updated_farm.latitude,
                        updated_farm.longitude, updated_farm.land_area_ha, updated_farm.primary_crop,
                        updated_farm.crop_variety, str(updated_farm.sowing_date), updated_farm.crop_stage,
                        updated_farm.soil_type, updated_farm.irrigation_method, updated_farm.water_source,
                        updated_farm.available_water_m3, updated_farm.cultivation_budget_inr,
                        now.isoformat(), farm_id,
                    ),
                )
                conn.commit()
            finally:
                conn.close()
        except Exception:
            pass
        return updated_farm

    def get_farm_summary(self, farm_id: str, et0_mm: float = 4.6, recent_rain_mm: float = 0.0) -> Optional[FarmSummary]:
        farm = self.get_farm(farm_id)
        if not farm:
            return None
        
        water_demand = calculate_crop_water_demand(farm.primary_crop, farm.crop_stage, et0_mm)
        soil_moisture = estimate_root_zone_moisture(farm.soil_type, recent_rain_mm, water_demand)
        
        # Calculate agronomic health and risk rating
        if soil_moisture < 12.0:
            health = "Water Stress Warning"
            risk = "high"
        elif soil_moisture > 35.0:
            health = "Waterlogged Risk"
            risk = "medium"
        else:
            health = "Vigorous / Optimal"
            risk = "low"

        # Projected yield and economics based on land area and crop
        crop_multipliers = {
            "tomato": {"yield_t_ha": 25.0, "price_per_t": 22000, "cost_ha": 35000},
            "wheat": {"yield_t_ha": 4.5, "price_per_t": 26000, "cost_ha": 25000},
            "rice": {"yield_t_ha": 5.2, "price_per_t": 24000, "cost_ha": 30000},
            "cotton": {"yield_t_ha": 2.2, "price_per_t": 68000, "cost_ha": 38000},
        }
        crop_info = crop_multipliers.get(farm.primary_crop.lower(), {"yield_t_ha": 4.0, "price_per_t": 25000, "cost_ha": 28000})
        
        est_yield = round(crop_info["yield_t_ha"] * farm.land_area_ha, 1)
        est_cost = round(crop_info["cost_ha"] * farm.land_area_ha, 2)
        est_revenue = round(est_yield * crop_info["price_per_t"], 2)

        return FarmSummary(
            farm=farm,
            soil_moisture_pct=soil_moisture,
            crop_health_status=health,
            daily_water_demand_mm=water_demand,
            total_expenses_inr=est_cost,
            estimated_yield_tonnes=est_yield,
            expected_revenue_inr=est_revenue,
            risk_level=risk,
            last_updated=datetime.now(timezone.utc)
        )

farm_service = FarmService()
