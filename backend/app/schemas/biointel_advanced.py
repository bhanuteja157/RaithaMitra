# backend/app/schemas/biointel_advanced.py
"""
Pydantic Schemas for AD-05: Advanced BioIntel & Scientific Procurement Intelligence.
Covers 12-provider status, GBIF taxonomy, NCBI E-utilities, Ensembl Plants,
Indian agricultural evidence, National Nursery Portal, Google Routes,
OR-Tools CP-SAT optimization, Evidence Validation, and Unified Workflow.
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime

DataClassificationType = Literal[
    "Verified measured data",
    "Official documented information",
    "Supplier-reported data",
    "Scientific research evidence",
    "Model-estimated data",
    "Forecast data",
    "Cached data",
    "Simulated demonstration data",
    "Unavailable data",
]

EvidenceQualityType = Literal["Strong", "Moderate", "Limited", "Insufficient"]

ProviderStatusType = Literal[
    "Connected and verified",
    "Configured but unverified",
    "Missing credentials",
    "Temporarily unavailable",
    "Official resource only",
    "Local service operational",
]


class ProviderStatusItem(BaseModel):
    provider_name: str
    status: ProviderStatusType
    endpoint_or_library: str
    last_successful_retrieval: Optional[str] = None
    missing_configuration: Optional[str] = None
    data_classification: DataClassificationType
    fallback_availability: str
    known_limitations: str


class EvidenceRecord(BaseModel):
    record_id: str
    title: str
    source_provider: str
    source_url_or_id: str
    retrieval_timestamp: str
    publication_or_observation_date: Optional[str] = None
    geographic_applicability: str = "India / Semi-Arid & Tropical Regions"
    crop_or_species_id: str
    cultivar_id: Optional[str] = None
    data_classification: DataClassificationType
    evidence_quality: EvidenceQualityType
    known_limitations: str
    publication_type: Optional[str] = None  # field_trial, lab_experiment, review_article, preprint


class GBIFSpeciesMatch(BaseModel):
    input_crop_name: str
    accepted_scientific_name: str
    common_names: List[str] = Field(default_factory=list)
    taxon_key: Optional[int] = None
    genus: Optional[str] = None
    family: Optional[str] = None
    synonyms: List[str] = Field(default_factory=list)
    match_type: str = "EXACT"
    confidence: Optional[int] = None
    ambiguous_candidates: List[str] = Field(default_factory=list)
    source_provider: str = "GBIF Species API"
    is_live: bool = False
    limitations: str = "Taxonomy validation confirms species identity only; does not prove local cultivation suitability or seed stock."


class NCBIGeneRecord(BaseModel):
    gene_id: str
    symbol: str
    description: str
    organism: str
    chromosome: Optional[str] = None
    source_url: str


class NCBIGeneticEvidence(BaseModel):
    organism_validated: str
    taxonomy_id: Optional[str] = None
    genes: List[NCBIGeneRecord] = Field(default_factory=list)
    pubmed_articles: List[Dict[str, Any]] = Field(default_factory=list)
    nucleotide_accessions: List[str] = Field(default_factory=list)
    is_live: bool = False
    limitations: str = "Gene records do not imply a commercial cultivar carries the gene without cultivar-specific evidence. No DNA sequencing is performed."


class EnsemblPlantGenomics(BaseModel):
    species_requested: str
    ensembl_species_name: Optional[str] = None
    is_supported: bool = False
    assembly_name: Optional[str] = None
    release_version: Optional[str] = None
    gene_annotations: List[Dict[str, Any]] = Field(default_factory=list)
    is_live: bool = False
    limitations: str = "Genomic annotations are supporting evidence only and do not guarantee commercial field resistance."


class IndianAgEvidenceRecord(BaseModel):
    crop_name: str
    commercial_variety: str
    institution: str
    documented_traits: List[str]
    recommended_regions: List[str]
    planting_season: str
    climate_requirements: str
    soil_requirements: str
    evidence_url: str
    publication_date: str
    verification_date: str
    approved_for_commercial_cultivation: bool = True


class NNPResourceInfo(BaseModel):
    portal_name: str = "National Nursery Portal (National Horticulture Board)"
    portal_url: str = "https://nhb.gov.in/nnp"
    public_api_available: bool = False
    verification_workflow: List[str]
    limitations: str = "No authorized public REST API verified; portal registration alone does not guarantee live stock or current pricing."


class RouteDistanceResult(BaseModel):
    supplier_id: str
    distance_km: float
    duration_minutes: Optional[float] = None
    distance_type: Literal["Google Routes road distance", "Straight-line estimate (Haversine)"]
    route_available: bool = False
    estimated_transport_cost_inr: float
    transport_cost_type: str = "Estimated freight (not supplier-confirmed delivery)"


class SupplierOfferInput(BaseModel):
    product_id: str
    nursery_id: str
    nursery_name: str
    variety_name: str
    crop_name: str
    biotechnology_category: str
    unit_price_inr: Optional[float] = Field(default=None, ge=0)
    pricing_unit: str = "per_seedling"
    available_quantity: Optional[int] = Field(default=None, ge=0)
    minimum_order_quantity: int = Field(default=1, ge=1)
    is_verified: bool = False
    is_demo: bool = False
    inventory_fresh: bool = True
    freshness_status: str = "Confirmed"
    distance_km: float = Field(default=20.0, ge=0)
    distance_type: str = "Straight-line estimate (Haversine)"
    fixed_transport_inr: float = Field(default=250.0, ge=0)
    per_km_rate_inr: float = Field(default=12.0, ge=0)
    round_trip: bool = False


class ORToolsProcurementRequest(BaseModel):
    required_quantity: int = Field(..., gt=0)
    farmer_budget_inr: float = Field(..., ge=0)
    crop_name: str = "Tomato"
    allow_partial_fulfillment: bool = True
    allow_demo_inventory: bool = False
    offers: List[SupplierOfferInput] = Field(default_factory=list)


class SupplierAllocation(BaseModel):
    product_id: str
    nursery_id: str
    nursery_name: str
    variety_name: str
    quantity_allocated: int
    unit_price_inr: float
    product_cost_inr: float
    transportation_cost_inr: float
    subtotal_inr: float
    distance_km: float
    distance_type: str
    is_demo: bool


class ORToolsProcurementResponse(BaseModel):
    optimization_status: Literal["Optimal", "Feasible", "Infeasible", "Unknown"]
    solver_used: str
    required_quantity: int
    fulfilled_quantity: int
    unfulfilled_quantity: int
    total_product_cost_inr: float
    total_transportation_cost_inr: float
    total_procurement_cost_inr: float
    farmer_budget_inr: float
    budget_utilization_pct: float
    remaining_budget_inr: float
    budget_feasible: bool
    allocations: List[SupplierAllocation] = Field(default_factory=list)
    excluded_offers: List[Dict[str, str]] = Field(default_factory=list)
    explanation: str
    is_partial_plan: bool = False


class UnifiedBioIntelRequest(BaseModel):
    farm_id: Optional[str] = "farm_001"
    farmer_name: Optional[str] = "Suresh Gowda"
    latitude: float = Field(default=12.5234, ge=-90, le=90)
    longitude: float = Field(default=76.8976, ge=-180, le=180)
    crop_name: str = Field(default="Tomato", min_length=2)
    farm_area_ha: float = Field(default=0.809, gt=0, description="2 acres ≈ 0.809 ha")
    required_seedlings: int = Field(default=5000, gt=0)
    farmer_budget_inr: float = Field(default=15000.0, ge=0)
    water_availability: Literal["Limited / Low", "Moderate / Adequate", "Abundant / Canal"] = "Limited / Low"
    previous_crop_diseases: List[str] = Field(default_factory=lambda: ["Bacterial Wilt", "Tomato Leaf Curl Virus"])
    soil_type: str = "Red Sandy Loam"
    soil_ph: Optional[float] = 6.5
    nitrogen_kg_ha: Optional[float] = None
    phosphorus_kg_ha: Optional[float] = None
    potassium_kg_ha: Optional[float] = None
    language: Literal["en", "kn", "hi"] = "en"
    include_genomics: bool = True
    allow_demo_inventory: bool = True
    search_radius_km: float = Field(default=50.0, ge=5.0, le=100.0)


class UnifiedBioIntelResponse(BaseModel):
    farm_id: Optional[str]
    crop_id: str
    crop_variety: str
    module: str = "biointel_advanced_unified"
    source: str
    timestamp: str
    data_quality: str
    species_validation: GBIFSpeciesMatch
    scientific_research: List[Dict[str, Any]]
    genetic_evidence: Optional[NCBIGeneticEvidence] = None
    genomic_evidence: Optional[EnsemblPlantGenomics] = None
    indian_agricultural_evidence: List[IndianAgEvidenceRecord]
    climate_suitability: Dict[str, Any]
    soil_suitability: Dict[str, Any]
    disease_resistance: List[str]
    drought_tolerance: str
    recommended_interventions: List[Dict[str, Any]]
    nearby_suppliers: List[Dict[str, Any]]
    national_nursery_portal: NNPResourceInfo
    procurement_plan: ORToolsProcurementResponse
    procurement_cost: float
    budget_feasibility: bool
    evidence_validation: Dict[str, Any]
    evidence_quality: EvidenceQualityType
    grounded_explanation: str
    gemini_used: bool = False
    provider_statuses: List[ProviderStatusItem]
    sources: List[str]
    assumptions: List[str]
    limitations: List[str]
    missing_data: List[str]
    recommended_actions: List[str]
