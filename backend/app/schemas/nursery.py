# backend/app/schemas/nursery.py
"""
Pydantic Schemas for Feature 18: Intelligent Nursery and Bio-Input Marketplace.
Supports nearby supplier discovery, product inventory, supplier comparison,
inquiries, and deterministic procurement optimization.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime

DataSourceType = Literal["direct_nursery_inventory", "google_places_supplier", "demo_data"]
AvailabilityStatusType = Literal["in_stock", "low_stock", "pre_order_only", "out_of_stock", "contact_nursery"]

class NurseryBase(BaseModel):
    name: str = Field(..., description="Nursery or enterprise trade name")
    license_number: Optional[str] = Field(None, description="Horticulture / seed trading license number")
    contact_person: str = Field(..., description="Proprietor or contact representative")
    phone: str = Field(..., description="Phone number for calls / WhatsApp inquiries")
    email: Optional[str] = Field(None, description="Email contact")
    address: str = Field(..., description="Street or rural address")
    village_or_taluk: Optional[str] = Field(None, description="Village, Hobli or Taluk")
    district: str = Field(..., description="District")
    state: str = Field(..., description="State")
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    is_verified: bool = Field(False, description="Whether inspected and certified by state horticulture")
    rating: float = Field(default=4.5, ge=1.0, le=5.0)
    data_source: DataSourceType = Field("direct_nursery_inventory")
    google_place_id: Optional[str] = None
    website_uri: Optional[str] = None
    google_maps_uri: Optional[str] = None
    opening_hours: Optional[str] = None

class Nursery(NurseryBase):
    id: str
    owner_user_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    distance_km: Optional[float] = None
    product_count: int = 0
    is_demo: bool = False

    model_config = ConfigDict(from_attributes=True)

class NurseryProductBase(BaseModel):
    nursery_id: str
    crop_name: str = Field(..., description="Target crop e.g. Tomato, Chilli, Mango, Banana")
    variety_name: str = Field(..., description="Specific variety or commercial product trade name")
    biotechnology_category: str = Field(..., description="Category from BiotechCategoryType")
    description: str
    price_per_unit: Optional[float] = Field(None, ge=0, description="Price per unit in INR. None if contact for quote")
    pricing_unit: str = Field("per_seedling", description="e.g. per_seedling, per_sapling, per_kg, per_packet_500g, per_liter")
    available_quantity: Optional[int] = Field(None, ge=0, description="Current stock. None if confirmation required")
    minimum_order_quantity: int = Field(default=1, ge=1)
    certification_info: Optional[str] = Field(None, description="e.g. ICAR-IIHR Certified, SSCA True-to-type, NPOP Organic")
    availability_status: AvailabilityStatusType = Field("in_stock")
    data_source: DataSourceType = Field("direct_nursery_inventory")

class NurseryProductCreate(NurseryProductBase):
    pass

class NurseryProductUpdate(BaseModel):
    crop_name: Optional[str] = None
    variety_name: Optional[str] = None
    biotechnology_category: Optional[str] = None
    description: Optional[str] = None
    price_per_unit: Optional[float] = None
    pricing_unit: Optional[str] = None
    available_quantity: Optional[int] = None
    minimum_order_quantity: Optional[int] = None
    certification_info: Optional[str] = None
    availability_status: Optional[AvailabilityStatusType] = None

class NurseryProduct(NurseryProductBase):
    id: str
    last_updated: datetime
    nursery_name: Optional[str] = None
    nursery_phone: Optional[str] = None
    nursery_district: Optional[str] = None
    nursery_state: Optional[str] = None
    nursery_latitude: Optional[float] = None
    nursery_longitude: Optional[float] = None
    distance_km: Optional[float] = None
    is_demo: bool = False

    model_config = ConfigDict(from_attributes=True)

class NurseryInquiryCreate(BaseModel):
    nursery_id: str
    product_id: Optional[str] = None
    farmer_name: str = Field(..., min_length=2)
    farmer_phone: str = Field(..., min_length=10)
    farmer_location: str
    required_quantity: int = Field(default=100, gt=0)
    intended_sowing_date: Optional[str] = None
    notes: Optional[str] = None

class NurseryInquiry(BaseModel):
    id: str
    nursery_id: str
    product_id: Optional[str] = None
    farmer_name: str
    farmer_phone: str
    farmer_location: str
    required_quantity: int
    intended_sowing_date: Optional[str] = None
    notes: Optional[str] = None
    status: Literal["submitted", "acknowledged", "fulfilled", "cancelled"] = "submitted"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProcurementCalculationRequest(BaseModel):
    crop_name: str
    variety_name: Optional[str] = None
    biotech_category: Optional[str] = None
    required_quantity: int = Field(..., gt=0, description="Number of seedlings, saplings, or units needed")
    farmer_latitude: float = Field(..., ge=-90, le=90)
    farmer_longitude: float = Field(..., ge=-180, le=180)
    farmer_budget_inr: float = Field(..., ge=0)
    max_distance_km: float = Field(default=100.0, ge=1.0)

class ProcurementOption(BaseModel):
    product_id: str
    nursery_id: str
    nursery_name: str
    crop_name: str
    variety_name: str
    biotechnology_category: str
    distance_km: float
    price_per_unit: Optional[float]
    pricing_unit: str
    required_quantity: int
    planting_material_cost: Optional[float]
    transportation_cost: Optional[float]
    total_procurement_cost: Optional[float]
    is_budget_feasible: bool
    budget_surplus_or_deficit: Optional[float]
    certification_info: Optional[str]
    availability_status: str
    phone_number: str
    directions_url: Optional[str]
    suitability_score: float = Field(..., ge=0, le=100, description="Deterministic multi-objective score")
    recommendation_rationale: str
    limitations: str
    is_demo: bool = False
    data_source: str = "direct_inventory"

class ProcurementOptimizationResponse(BaseModel):
    optimal_option: Optional[ProcurementOption]
    comparison_options: List[ProcurementOption]
    farmer_budget_inr: float
    required_quantity: int
    calculation_formula: Dict[str, str]
    generated_at: datetime = Field(default_factory=datetime.utcnow)

class SupplierComparisonRequest(BaseModel):
    product_ids: List[str] = Field(..., min_length=1, max_length=6)
    farmer_latitude: float
    farmer_longitude: float
    required_quantity: int = Field(default=100, gt=0)
    farmer_budget_inr: Optional[float] = None

class SupplierComparisonResponse(BaseModel):
    items: List[ProcurementOption]
    comparison_matrix: Dict[str, Any]
