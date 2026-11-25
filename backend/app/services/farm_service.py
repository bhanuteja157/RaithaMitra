# backend/app/services/farm_service.py
"""
Farm Persistence Service with Local Prototype Persistence Adapter.
Implements the shared digital farm context across all 16 modules.
"""
from typing import List, Optional, Dict
from datetime import datetime, date, timezone
import uuid
from backend.app.schemas.farm import Farm, FarmCreate, FarmUpdate, FarmSummary
from backend.app.engines.biophysical import calculate_crop_water_demand, estimate_root_zone_moisture

class FarmService:
    def __init__(self):
        # In-memory prototype store with seed farms for realistic immediate demonstration
        self._farms: Dict[str, Farm] = {}
        self._seed_default_farms()

    def _seed_default_farms(self):
        default_farm = Farm(
            id="farm_001",
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

    def list_farms(self) -> List[Farm]:
        return list(self._farms.values())

    def get_farm(self, farm_id: str) -> Optional[Farm]:
        return self._farms.get(farm_id)

    def create_farm(self, farm_in: FarmCreate) -> Farm:
        new_id = f"farm_{uuid.uuid4().hex[:6]}"
        now = datetime.now(timezone.utc)
        new_farm = Farm(
            id=new_id,
            created_at=now,
            updated_at=now,
            **farm_in.model_dump()
        )
        self._farms[new_id] = new_farm
        return new_farm

    def update_farm(self, farm_id: str, farm_update: FarmUpdate) -> Optional[Farm]:
        farm = self._farms.get(farm_id)
        if not farm:
            return None
        update_data = farm_update.model_dump(exclude_unset=True)
        updated_dict = farm.model_dump()
        updated_dict.update(update_data)
        updated_dict["updated_at"] = datetime.now(timezone.utc)
        updated_farm = Farm(**updated_dict)
        self._farms[farm_id] = updated_farm
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
