# backend/app/schemas/farm.py
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from datetime import date, datetime

class FarmBase(BaseModel):
    farmer_name: str = Field(..., description="Full name of farmer")
    preferred_language: Literal["en", "kn", "hi"] = Field("en", description="Preferred UI language")
    farm_name: str = Field(..., description="Name or label of the farm")
    village: str = Field(..., description="Village or Taluk")
    district: str = Field(..., description="District")
    state: str = Field(..., description="State")
    latitude: float = Field(..., ge=-90, le=90, description="Latitude")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude")
    land_area_ha: float = Field(..., gt=0, description="Total landholding in hectares")
    primary_crop: str = Field(..., description="Primary cultivated crop")
    crop_variety: Optional[str] = Field(None, description="Cultivar or variety")
    sowing_date: date = Field(..., description="Sowing or transplanting date")
    crop_stage: Literal["Initial", "Crop Development", "Mid-Season", "Late Season", "Harvest Ready"] = Field(
        "Mid-Season", description="Current phenological stage"
    )
    soil_type: str = Field(..., description="Soil texture type")
    irrigation_method: Literal["Drip Irrigation", "Sprinkler", "Flood / Furrow", "Rainfed", "Canal Basin"] = Field(
        "Drip Irrigation", description="Primary irrigation system"
    )
    water_source: Literal["Borewell", "Open Well", "Canal", "Farm Pond / Tank", "River / Stream", "Rainwater Only"] = Field(
        "Borewell", description="Water resource"
    )
    available_water_m3: float = Field(default=10000.0, ge=0, description="Estimated available water volume in cubic meters")
    cultivation_budget_inr: float = Field(default=50000.0, ge=0, description="Allocated seasonal cultivation budget in INR")

class FarmCreate(FarmBase):
    pass

class FarmUpdate(BaseModel):
    farmer_name: Optional[str] = None
    preferred_language: Optional[Literal["en", "kn", "hi"]] = None
    farm_name: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    land_area_ha: Optional[float] = None
    primary_crop: Optional[str] = None
    crop_variety: Optional[str] = None
    sowing_date: Optional[date] = None
    crop_stage: Optional[Literal["Initial", "Crop Development", "Mid-Season", "Late Season", "Harvest Ready"]] = None
    soil_type: Optional[str] = None
    irrigation_method: Optional[Literal["Drip Irrigation", "Sprinkler", "Flood / Furrow", "Rainfed", "Canal Basin"]] = None
    water_source: Optional[Literal["Borewell", "Open Well", "Canal", "Farm Pond / Tank", "River / Stream", "Rainwater Only"]] = None
    available_water_m3: Optional[float] = None
    cultivation_budget_inr: Optional[float] = None

class Farm(FarmBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class FarmSummary(BaseModel):
    farm: Farm
    soil_moisture_pct: float
    crop_health_status: str
    daily_water_demand_mm: float
    total_expenses_inr: float
    estimated_yield_tonnes: float
    expected_revenue_inr: float
    risk_level: Literal["low", "medium", "high"]
    last_updated: datetime
