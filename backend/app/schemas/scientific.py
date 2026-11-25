# backend/app/schemas/scientific.py
"""
Unified Scientific Module Schemas for AD-04 (RaithaMitra Scientific Agricultural Intelligence).
Implements the standardized Section 9 output envelope for Centralized Decision Engine consumption.
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime


class ScientificModuleOutput(BaseModel):
    farm_id: Optional[str] = None
    module: str
    source: str
    timestamp: datetime
    units: Dict[str, str]
    data_quality: Literal[
        "live", "measured", "modeled", "user_provided", "estimated", "demonstration", "unavailable"
    ]
    is_live: bool = False
    assumptions: List[str] = Field(default_factory=list)
    uncertainty: str
    results: Dict[str, Any]
    recommended_actions: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# P0: Scientific Precision Irrigation
# ---------------------------------------------------------------------------
class IrrigationRequest(BaseModel):
    farm_id: Optional[str] = None
    latitude: float = Field(default=12.5234, ge=-90, le=90)
    longitude: float = Field(default=76.8976, ge=-180, le=180)
    crop_type: str = Field(default="Tomato", min_length=2)
    crop_stage: Literal["Initial", "Crop Development", "Mid-Season", "Late Season", "Harvest Ready"] = "Mid-Season"
    crop_coefficient_kc: Optional[float] = Field(default=None, gt=0.05, le=2.0, description="Optional Kc override")
    farm_area_ha: float = Field(default=2.5, gt=0, le=10000, description="Farm area in hectares")
    reference_et0_mm: Optional[float] = Field(default=None, ge=0, le=25, description="ET0 in mm/day (fetched from Open-Meteo if omitted)")
    effective_rainfall_mm: Optional[float] = Field(default=None, ge=0, le=500, description="Effective rainfall in mm/day")
    soil_type: str = Field(default="Red Sandy Loam")
    available_water_m3: float = Field(default=14500.0, ge=0, description="Available irrigation water in cubic meters")
    irrigation_method: Literal["Drip Irrigation", "Sprinkler", "Flood / Furrow", "Rainfed", "Canal Basin"] = "Drip Irrigation"
    irrigation_efficiency: Optional[float] = Field(default=None, gt=0.1, le=1.0, description="Application efficiency (0.1 to 1.0)")
    flow_rate_m3_per_hr: Optional[float] = Field(default=None, gt=0, le=5000, description="Pump/system flow rate in m3/hr")


# ---------------------------------------------------------------------------
# P1: Soil & Nutrient Intelligence
# ---------------------------------------------------------------------------
class SoilAnalysisRequest(BaseModel):
    farm_id: Optional[str] = None
    latitude: float = Field(default=12.5234, ge=-90, le=90)
    longitude: float = Field(default=76.8976, ge=-180, le=180)
    crop_type: str = Field(default="Tomato", min_length=2)
    soil_texture: str = Field(default="Red Sandy Loam")
    nitrogen_kg_ha: Optional[float] = Field(default=None, ge=0, le=2000, description="Available N in kg/ha")
    phosphorus_kg_ha: Optional[float] = Field(default=None, ge=0, le=1000, description="Available P in kg/ha")
    potassium_kg_ha: Optional[float] = Field(default=None, ge=0, le=3000, description="Available K in kg/ha")
    soil_ph: Optional[float] = Field(default=None, ge=3.0, le=10.5, description="Soil pH (1:2.5 water)")
    organic_carbon_pct: Optional[float] = Field(default=None, ge=0, le=15.0, description="Organic Carbon %")
    soil_moisture_pct: Optional[float] = Field(default=None, ge=0, le=100.0, description="Volumetric soil moisture %")
    measurement_source: Literal["laboratory_soil_health_card", "field_sensor", "user_estimate"] = "laboratory_soil_health_card"
    fetch_soilgrids: bool = Field(default=False, description="Optionally query ISRIC SoilGrids v2.0 modeled properties")


# ---------------------------------------------------------------------------
# P1: Predictive Agricultural & Financial Simulation (Monte Carlo)
# ---------------------------------------------------------------------------
class FinancialSimulationRequest(BaseModel):
    farm_id: Optional[str] = None
    crop_type: str = Field(default="Tomato")
    farm_area_ha: float = Field(default=2.5, gt=0, le=10000)
    expected_yield_t_per_ha: float = Field(default=25.0, gt=0, le=200)
    yield_std_pct: float = Field(default=15.0, ge=0, le=60, description="Yield volatility %")
    market_price_inr_per_t: float = Field(default=22000.0, gt=0, le=500000)
    price_std_pct: float = Field(default=20.0, ge=0, le=80, description="Price volatility %")
    crop_loss_pct: float = Field(default=8.0, ge=0, le=95, description="Expected post-harvest/pest loss %")
    water_availability_pct: float = Field(default=85.0, ge=10, le=150, description="Water availability % of full requirement")
    cultivation_expenses_inr: float = Field(default=85000.0, ge=0)
    transportation_expenses_inr: float = Field(default=18000.0, ge=0)
    num_trials: int = Field(default=5000, ge=100, le=20000)
    random_seed: int = Field(default=42, ge=0)


# ---------------------------------------------------------------------------
# P2: Digital Farm Twin
# ---------------------------------------------------------------------------
class FarmZoneInput(BaseModel):
    zone_name: str
    area_ha: float = Field(..., gt=0)
    soil_type: str = "Red Sandy Loam"
    irrigation_applied_mm: float = Field(default=0.0, ge=0)


class FarmTwinRequest(BaseModel):
    farm_id: Optional[str] = None
    latitude: float = Field(default=12.5234, ge=-90, le=90)
    longitude: float = Field(default=76.8976, ge=-180, le=180)
    farm_area_ha: float = Field(default=2.5, gt=0)
    crop_type: str = Field(default="Tomato")
    sowing_date: str = Field(default="2026-10-15")
    crop_stage: Literal["Initial", "Crop Development", "Mid-Season", "Late Season", "Harvest Ready"] = "Mid-Season"
    soil_type: str = Field(default="Red Sandy Loam")
    available_water_m3: float = Field(default=14500.0, ge=0)
    recent_irrigation_mm: float = Field(default=12.0, ge=0)
    cultivation_expenses_inr: float = Field(default=85000.0, ge=0)
    rainfall_scenario_multiplier: float = Field(default=1.0, ge=0.0, le=3.0)
    irrigation_deficit_pct: float = Field(default=0.0, ge=0.0, le=80.0)
    zones: List[FarmZoneInput] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# P3: Satellite & Geospatial Intelligence
# ---------------------------------------------------------------------------
class SatelliteRequest(BaseModel):
    farm_id: Optional[str] = None
    latitude: float = Field(default=12.5234, ge=-90, le=90)
    longitude: float = Field(default=76.8976, ge=-180, le=180)
    boundary_geojson: Optional[Dict[str, Any]] = None
    nir_band: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Sentinel-2 B8 NIR reflectance (0-1)")
    red_band: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Sentinel-2 B4 Red reflectance (0-1)")
    swir_band: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Sentinel-2 B11 SWIR reflectance (0-1)")
    blue_band: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Sentinel-2 B2 Blue reflectance (0-1)")
    green_band: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Sentinel-2 B3 Green reflectance (0-1)")
    red_edge_band: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Sentinel-2 B5 Red Edge reflectance (0-1)")
    use_demo_observation: bool = Field(default=True, description="Allow clearly labelled demonstration data when Sentinel-2 credentials are unavailable")
