// frontend/src/types/index.ts

export type Language = 'en' | 'kn' | 'hi';
export type Theme = 'light' | 'dark';

export interface Farm {
  id: string;
  farmer_name: string;
  preferred_language: Language;
  farm_name: string;
  village: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  land_area_ha: number;
  primary_crop: string;
  crop_variety?: string;
  sowing_date: string;
  crop_stage: 'Initial' | 'Crop Development' | 'Mid-Season' | 'Late Season' | 'Harvest Ready';
  soil_type: string;
  irrigation_method: 'Drip Irrigation' | 'Sprinkler' | 'Flood / Furrow' | 'Rainfed' | 'Canal Basin';
  water_source: 'Borewell' | 'Open Well' | 'Canal' | 'Farm Pond / Tank' | 'River / Stream' | 'Rainwater Only';
  available_water_m3: number;
  cultivation_budget_inr: number;
  pin_code?: string;
  formatted_address?: string;
  location_source?: 'gps' | 'map' | 'search' | 'manual';
  location_accuracy_m?: number;
  created_at: string;
  updated_at: string;
}

export interface FarmSummary {
  farm: Farm;
  soil_moisture_pct: number;
  crop_health_status: string;
  daily_water_demand_mm: number;
  total_expenses_inr: number;
  estimated_yield_tonnes: number;
  expected_revenue_inr: number;
  risk_level: 'low' | 'medium' | 'high';
  last_updated: string;
}

export interface CurrentWeather {
  time: string;
  temperature_c: number;
  relative_humidity_pct: number;
  precipitation_mm: number;
  rain_probability_pct: number;
  wind_speed_kmh: number;
  wind_direction_deg: number;
  weather_code: number;
  condition_text: string;
  et0_fao56_mm: number;
}

export interface DailyForecast {
  date: string;
  temp_max_c: number;
  temp_min_c: number;
  precipitation_sum_mm: number;
  rain_probability_max_pct: number;
  et0_fao56_mm: number;
  condition_text: string;
}

export interface WeatherResponse {
  latitude: number;
  longitude: number;
  elevation_m: number;
  timezone: string;
  current: CurrentWeather;
  daily_forecast: DailyForecast[];
  provenance: {
    source: string;
    timestamp: string;
    quality: string;
    is_live: boolean;
  };
}

export interface SupportingData {
  key_metrics: Record<string, any>;
  source: string;
  timestamp: string;
  data_quality: 'live' | 'measured' | 'user_provided' | 'estimated' | 'simulated';
  uncertainty: string;
}

export interface FarmRecommendation {
  id: string;
  category: 'irrigation' | 'nutrition' | 'crop_protection' | 'market' | 'risk';
  priority: 'critical' | 'high' | 'medium' | 'low';
  action: string;
  reason: string;
  supporting_data: SupportingData;
  alternative_action?: string;
}

export interface RecommendationResponse {
  farm_id: string;
  generated_at: string;
  overall_risk_level: 'low' | 'medium' | 'high';
  recommendations: FarmRecommendation[];
  active_advisories_count: number;
}

export interface GovernmentScheme {
  id: string;
  name: string;
  name_kannada?: string;
  name_hindi?: string;
  nodal_agency: string;
  objective: string;
  financial_benefit: string;
  eligibility_criteria: string[];
  required_documents: string[];
  application_portal: string;
  category: string;
  applicable_states: string[];
}

export type FarmCreate = Omit<Farm, 'id' | 'created_at' | 'updated_at'>;
export type FarmUpdate = Partial<FarmCreate>;

export type LocationSource = 'gps' | 'map' | 'search' | 'manual';

export interface SelectedLocation {
  latitude: number;
  longitude: number;
  village: string;
  district: string;
  state: string;
  country?: string;
  pin_code?: string;
  formatted_address?: string;
  location_source: LocationSource;
  location_accuracy_m?: number;
  updated_at: string;
}

export interface GeocodeSearchResult {
  display_name: string;
  latitude: number;
  longitude: number;
  village_or_locality?: string;
  district?: string;
  state?: string;
  country?: string;
  pin_code?: string;
  place_type?: string;
}

export interface GeocodeSearchResponse {
  query: string;
  results: GeocodeSearchResult[];
  attribution: string;
  cached: boolean;
  is_live: boolean;
  error_message?: string;
}

export interface ReverseGeocodeResponse {
  latitude: number;
  longitude: number;
  formatted_address?: string;
  village_or_locality?: string;
  district?: string;
  state?: string;
  country?: string;
  pin_code?: string;
  attribution: string;
  cached: boolean;
  is_live: boolean;
  unavailable_reason?: string;
}

// =============================================================================
// FEATURE 17 & 18 TYPES: BIOINTEL & NURSERY MARKETPLACE
// =============================================================================

export type BiotechCategoryType =
  | 'biofertilizers'
  | 'biopesticides'
  | 'disease_resistant_varieties'
  | 'drought_tolerant_varieties'
  | 'hybrid_varieties'
  | 'tissue_cultured_plants'
  | 'grafted_plants'
  | 'beneficial_soil_microorganisms'
  | 'biological_nutrient_management'
  | 'agricultural_waste_bioconversion';

export interface ScientificPaper {
  title: string;
  abstract_text?: string;
  authors: string[];
  pub_year?: number;
  doi?: string;
  article_url?: string;
  journal_title?: string;
  pmid?: string;
  evidence_type: 'established_practice' | 'peer_reviewed_study' | 'experimental_study';
  is_open_access: boolean;
}

export interface BiotechResearchResponse {
  crop: string;
  problem?: string;
  category?: string;
  query_used: string;
  total_results: number;
  papers: ScientificPaper[];
  evidence_summary: string;
  data_source: string;
  is_live: boolean;
  cached: boolean;
  fetched_at: string;
}

export interface FarmerProfileInput {
  farm_id?: string;
  farmer_name?: string;
  farm_location?: string;
  latitude: number;
  longitude: number;
  crop_type: string;
  soil_type: string;
  soil_ph?: number;
  npk_values?: Record<string, number>;
  water_availability: 'Limited / Low' | 'Moderate / Adequate' | 'Abundant / Canal';
  climate_conditions?: string;
  land_area_ha: number;
  cultivation_budget_inr: number;
  previous_crop_diseases: string[];
}

export interface BiotechRecommendation {
  id: string;
  crop_name: string;
  variety_or_intervention_name: string;
  biotechnology_category: BiotechCategoryType;
  category_label: string;
  expected_agricultural_benefits: string[];
  suitable_soil_conditions: string;
  water_requirements: string;
  disease_resistance?: string;
  scientific_evidence: string;
  evidence_paper_doi?: string;
  evidence_strength:
    | 'Strong (Peer-reviewed meta-analysis)'
    | 'Moderate (Field trials)'
    | 'Preliminary (Lab study)';
  limitations: string;
  estimated_cost_inr?: number;
  estimated_cost_unit?: string;
  find_nearby_suppliers_query: string;
  nursery_search_category: string;
  is_established_practice: boolean;
}

export interface CentralizedDecisionPayload {
  recommended_crop_variety: string;
  biotechnology_intervention: string;
  biotechnology_category: string;
  supporting_scientific_evidence: string;
  evidence_strength: string;
  soil_suitability: string;
  water_suitability: string;
  supplier_availability_status: string;
  estimated_procurement_cost_inr?: number;
  farmer_budget_inr: number;
  budget_compatibility: 'Within Budget' | 'Exceeds Budget' | 'Pending Quote';
  recommendation_limitations: string;
  generated_timestamp: string;
}

export interface BiotechRecommendationResponse {
  farmer_profile: FarmerProfileInput;
  generated_at: string;
  total_recommendations: number;
  recommendations: BiotechRecommendation[];
  centralized_decision_payload: CentralizedDecisionPayload;
}

export interface CropVarietyProfile {
  crop: string;
  variety_name: string;
  category: BiotechCategoryType;
  category_label: string;
  institution: string;
  maturity_days: number;
  yield_potential: string;
  disease_resistance: string[];
  soil_tolerance: string;
  water_requirement: string;
  seed_rate_per_ha: string;
  description: string;
  is_certified: boolean;
}

export interface Nursery {
  id: string;
  name: string;
  license_number?: string;
  contact_person: string;
  phone: string;
  email?: string;
  address: string;
  village_or_taluk?: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  is_verified: boolean;
  rating: number;
  data_source: 'direct_nursery_inventory' | 'google_places_supplier' | 'demo_data';
  google_place_id?: string;
  website_uri?: string;
  google_maps_uri?: string;
  opening_hours?: string;
  owner_user_id?: string;
  created_at: string;
  updated_at: string;
  distance_km?: number;
  product_count: number;
  is_demo: boolean;
}

export interface NurseryProduct {
  id: string;
  nursery_id: string;
  crop_name: string;
  variety_name: string;
  biotechnology_category: string;
  description: string;
  price_per_unit?: number;
  pricing_unit: string;
  available_quantity?: number;
  minimum_order_quantity: number;
  certification_info?: string;
  availability_status: 'in_stock' | 'low_stock' | 'pre_order_only' | 'out_of_stock' | 'contact_nursery';
  data_source: 'direct_nursery_inventory' | 'google_places_supplier' | 'demo_data';
  last_updated: string;
  nursery_name?: string;
  nursery_phone?: string;
  nursery_district?: string;
  nursery_state?: string;
  nursery_latitude?: number;
  nursery_longitude?: number;
  distance_km?: number;
  is_demo: boolean;
}

export interface NurseryProductCreate {
  nursery_id: string;
  crop_name: string;
  variety_name: string;
  biotechnology_category: string;
  description: string;
  price_per_unit?: number;
  pricing_unit?: string;
  available_quantity?: number;
  minimum_order_quantity?: number;
  certification_info?: string;
  availability_status?: 'in_stock' | 'low_stock' | 'pre_order_only' | 'out_of_stock' | 'contact_nursery';
  data_source?: 'direct_nursery_inventory' | 'google_places_supplier' | 'demo_data';
}

export interface NurseryInquiry {
  id: string;
  nursery_id: string;
  product_id?: string;
  farmer_name: string;
  farmer_phone: string;
  farmer_location: string;
  required_quantity: number;
  intended_sowing_date?: string;
  notes?: string;
  status: 'submitted' | 'acknowledged' | 'fulfilled' | 'cancelled';
  created_at: string;
}

export interface NurseryInquiryCreate {
  nursery_id: string;
  product_id?: string;
  farmer_name: string;
  farmer_phone: string;
  farmer_location: string;
  required_quantity: number;
  intended_sowing_date?: string;
  notes?: string;
}

export interface ProcurementOption {
  product_id: string;
  nursery_id: string;
  nursery_name: string;
  crop_name: string;
  variety_name: string;
  biotechnology_category: string;
  distance_km: number;
  price_per_unit?: number;
  pricing_unit: string;
  required_quantity: number;
  planting_material_cost?: number;
  transportation_cost?: number;
  total_procurement_cost?: number;
  is_budget_feasible: boolean;
  budget_surplus_or_deficit?: number;
  certification_info?: string;
  availability_status: string;
  phone_number: string;
  directions_url?: string;
  suitability_score: number;
  recommendation_rationale: string;
  limitations: string;
  is_demo: boolean;
  data_source: string;
}

export interface ProcurementOptimizationResponse {
  optimal_option?: ProcurementOption;
  comparison_options: ProcurementOption[];
  farmer_budget_inr: number;
  required_quantity: number;
  calculation_formula: Record<string, string>;
  generated_at: string;
}

export interface SupplierComparisonResponse {
  items: ProcurementOption[];
  comparison_matrix: {
    lowest_cost_option?: number;
    closest_option_km?: number;
    highest_rated_supplier?: string;
  };
}


