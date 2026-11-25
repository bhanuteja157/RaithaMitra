# backend/app/schemas/biotech.py
"""
Pydantic Schemas for Feature 17: Agricultural Biotechnology Intelligence (BioIntel).
Models live scientific research (Europe PMC), verified crop varieties,
biotechnology recommendations, and centralized decision engine payloads.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime

BiotechCategoryType = Literal[
    "biofertilizers",
    "biopesticides",
    "disease_resistant_varieties",
    "drought_tolerant_varieties",
    "hybrid_varieties",
    "tissue_cultured_plants",
    "grafted_plants",
    "beneficial_soil_microorganisms",
    "biological_nutrient_management",
    "agricultural_waste_bioconversion",
]

class ScientificPaper(BaseModel):
    title: str = Field(..., description="Research article title")
    abstract_text: Optional[str] = Field(None, description="Abstract summary or excerpt")
    authors: List[str] = Field(default_factory=list, description="Authors list")
    pub_year: Optional[int] = Field(None, description="Year of publication")
    doi: Optional[str] = Field(None, description="Digital Object Identifier")
    article_url: Optional[str] = Field(None, description="URL to access article")
    journal_title: Optional[str] = Field(None, description="Journal or publisher source")
    pmid: Optional[str] = Field(None, description="PubMed / Europe PMC identifier")
    evidence_type: Literal["established_practice", "peer_reviewed_study", "experimental_study"] = Field(
        "peer_reviewed_study", description="Distinction between laboratory trial and established practice"
    )
    is_open_access: bool = Field(True, description="Whether paper is Open Access")

class BiotechResearchResponse(BaseModel):
    crop: str
    problem: Optional[str] = None
    category: Optional[str] = None
    query_used: str
    total_results: int
    papers: List[ScientificPaper]
    evidence_summary: str
    data_source: str = "Europe PMC REST API"
    is_live: bool = True
    cached: bool = False
    fetched_at: datetime = Field(default_factory=datetime.utcnow)

class FarmerProfileInput(BaseModel):
    farm_id: Optional[str] = None
    farmer_name: Optional[str] = "Farmer"
    farm_location: Optional[str] = "Tumakuru, Karnataka"
    latitude: float = Field(default=13.3409, ge=-90, le=90)
    longitude: float = Field(default=77.1010, ge=-180, le=180)
    crop_type: str = Field(default="Tomato", description="Crop being cultivated")
    soil_type: str = Field(default="Red Sandy Loam", description="Soil classification")
    soil_ph: Optional[float] = Field(default=6.5, ge=3.0, le=10.0, description="Soil pH level")
    npk_values: Optional[Dict[str, float]] = Field(
        default_factory=lambda: {"N": 120.0, "P": 45.0, "K": 60.0},
        description="Soil N-P-K nutrient values (kg/ha)"
    )
    water_availability: Literal["Limited / Low", "Moderate / Adequate", "Abundant / Canal"] = Field(
        default="Limited / Low", description="Water availability rating"
    )
    climate_conditions: Optional[str] = Field(default="Semi-arid, High summer temperatures")
    land_area_ha: float = Field(default=1.0, gt=0, description="Land area in hectares")
    cultivation_budget_inr: float = Field(default=60000.0, ge=0, description="Budget in INR")
    previous_crop_diseases: List[str] = Field(
        default_factory=list,
        description="Previous disease incidence (e.g. Bacterial Wilt, Leaf Curl, Nematodes)"
    )

class BiotechRecommendation(BaseModel):
    id: str
    crop_name: str
    variety_or_intervention_name: str
    biotechnology_category: BiotechCategoryType
    category_label: str
    expected_agricultural_benefits: List[str]
    suitable_soil_conditions: str
    water_requirements: str
    disease_resistance: Optional[str] = None
    scientific_evidence: str
    evidence_paper_doi: Optional[str] = None
    evidence_strength: Literal[
        "Strong (Peer-reviewed meta-analysis)",
        "Moderate (Field trials)",
        "Preliminary (Lab study)"
    ]
    limitations: str
    estimated_cost_inr: Optional[float] = None
    estimated_cost_unit: Optional[str] = None
    find_nearby_suppliers_query: str
    nursery_search_category: str
    is_established_practice: bool = True

class CentralizedDecisionPayload(BaseModel):
    """
    Standardized payload format consumable by Centralized Decision Engine (Requirement 12)
    """
    recommended_crop_variety: str
    biotechnology_intervention: str
    biotechnology_category: str
    supporting_scientific_evidence: str
    evidence_strength: str
    soil_suitability: str
    water_suitability: str
    supplier_availability_status: str
    estimated_procurement_cost_inr: Optional[float] = None
    farmer_budget_inr: float
    budget_compatibility: Literal["Within Budget", "Exceeds Budget", "Pending Quote"]
    recommendation_limitations: str
    generated_timestamp: str

class BiotechRecommendationResponse(BaseModel):
    farmer_profile: FarmerProfileInput
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    total_recommendations: int
    recommendations: List[BiotechRecommendation]
    centralized_decision_payload: CentralizedDecisionPayload

class CropVarietyProfile(BaseModel):
    crop: str
    variety_name: str
    category: BiotechCategoryType
    category_label: str
    institution: str
    maturity_days: int
    yield_potential: str
    disease_resistance: List[str]
    soil_tolerance: str
    water_requirement: str
    seed_rate_per_ha: str
    description: str
    is_certified: bool = True
    model_config = ConfigDict(from_attributes=True)
