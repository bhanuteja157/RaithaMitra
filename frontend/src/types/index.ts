// frontend/src/types/index.ts

export type Language = 'en' | 'kn' | 'hi';
export type Theme = 'light' | 'dark';
export type UserRole = 'farmer' | 'buyer' | 'labour' | 'driver' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  preferred_language: Language;
  village?: string;
  district?: string;
  state?: string;
  created_at: string;
}

export interface Farm {
  id: string;
  farmer_id?: string;
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

export interface WeatherCurrent {
  temperature_c: number;
  relative_humidity_pct: number;
  wind_speed_kmh: number;
  precipitation_probability_pct: number;
  precipitation_mm: number;
  surface_pressure_hpa: number;
  condition: string;
  icon: string;
}

export interface WeatherDailyForecast {
  date: string;
  temp_max_c: number;
  temp_min_c: number;
  precipitation_probability_pct: number;
  precipitation_sum_mm: number;
  condition: string;
  icon: string;
  evapotranspiration_mm: number;
}

export interface WeatherResponse {
  latitude: number;
  longitude: number;
  elevation_m: number;
  timezone: string;
  current: WeatherCurrent;
  daily: WeatherDailyForecast[];
  et0_fao56_mm_day: number;
  irrigation_recommendation: string;
  source: string;
  timestamp: string;
}

export interface SupportingData {
  primary_driver: string;
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

export interface FarmCreate {
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
}

// ==========================================
// FLAGSHIP 1: LABOUR CONNECT
// ==========================================
export interface LabourJob {
  id: string;
  farmer_id: string;
  farmer_name: string;
  farm_id?: string;
  title: string;
  job_type: string;
  crop_type: string;
  work_location: string;
  work_date: string;
  working_hours: string;
  wage_per_day: number;
  required_workers: number;
  hired_workers_count: number;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  applications?: LabourApplication[];
}

export interface LabourApplication {
  id: string;
  job_id: string;
  labour_id: string;
  labour_name: string;
  labour_phone?: string;
  status: 'applied' | 'accepted' | 'rejected' | 'completed';
  applied_at: string;
  wages_earned: number;
}

export interface LabourProfile {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  skills: string[];
  daily_wage_rate: number;
  availability_status: 'available' | 'busy' | 'unavailable';
  location: string;
  rating: number;
  total_jobs_completed: number;
  total_earnings: number;
}

// ==========================================
// FLAGSHIP 2: SMART BIDDING
// ==========================================
export interface BiddingListing {
  id: string;
  farmer_id: string;
  farmer_name: string;
  farm_id?: string;
  crop_name: string;
  variety?: string;
  quantity_kg: number;
  min_price_per_kg: number;
  harvest_date: string;
  location: string;
  bidding_deadline: string;
  status: 'active' | 'confirmed' | 'expired' | 'cancelled';
  highest_bid_id?: string;
  highest_bid_amount?: number;
  buyer_count: number;
  created_at: string;
  bids?: BiddingBid[];
  intelligence?: {
    highest_eligible_offer: number;
    has_bids: boolean;
    total_sale_value_inr: number;
    expected_baseline_revenue_inr: number;
    premium_gain_inr: number;
    premium_gain_pct: number;
    competing_buyers_count: number;
    is_above_reserve: boolean;
    highest_bidder?: string;
  };
}

export interface BiddingBid {
  id: string;
  listing_id: string;
  buyer_id: string;
  buyer_name: string;
  buyer_phone?: string;
  bid_per_kg: number;
  total_amount: number;
  status: 'submitted' | 'accepted' | 'outbid' | 'rejected';
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  listing_id: string;
  bid_id: string;
  farmer_id: string;
  farmer_name: string;
  buyer_id: string;
  buyer_name: string;
  buyer_phone?: string;
  crop_name: string;
  quantity_kg: number;
  price_per_kg: number;
  total_amount: number;
  pickup_location: string;
  delivery_location: string;
  status: 'confirmed' | 'transport_arranged' | 'fulfilled';
  created_at: string;
}

// ==========================================
// FLAGSHIP 3: TRANSPORT CONNECT
// ==========================================
export interface TransportVehicle {
  id: string;
  driver_id: string;
  driver_name: string;
  driver_phone: string;
  vehicle_type: string;
  vehicle_reg_number: string;
  capacity_kg: number;
  base_fare_per_km: number;
  service_area: string;
  availability_status: 'available' | 'on_trip' | 'unavailable';
  approx_distance_km?: number;
}

export interface TransportBooking {
  id: string;
  farmer_id: string;
  farmer_name: string;
  driver_id: string;
  driver_name: string;
  driver_phone?: string;
  purchase_order_id?: string;
  produce_type: string;
  weight_kg: number;
  pickup_location: string;
  delivery_destination: string;
  pickup_time: string;
  vehicle_type: string;
  estimated_distance_km: number;
  total_fare: number;
  status: 'requested' | 'accepted' | 'pickup_scheduled' | 'picked_up' | 'in_transit' | 'delivered' | 'rejected' | 'cancelled';
  created_at: string;
  updated_at: string;
}

// Legacy Flagship publication models for backward compatibility
export interface BioIntelPublication {
  id: string;
  title: string;
  authors: string;
  journal: string;
  pub_year: number;
  abstract: string;
  doi?: string;
  europe_pmc_url?: string;
  relevance_score: number;
  key_takeaways: string[];
}

export interface CertifiedNursery {
  id: string;
  name: string;
  organization: string;
  state: string;
  district: string;
  specialization: string[];
  contact_number: string;
  email?: string;
  license_status: string;
  verified: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
  message: string;
}

// ==========================================
// FLAGSHIP 4 & EXTENDED: BIOTECH & NURSERY MARKETPLACE
// ==========================================
export type BiotechCategoryType =
  | 'disease_resistant_varieties'
  | 'drought_tolerant_varieties'
  | 'hybrid_varieties'
  | 'tissue_cultured_plants'
  | 'grafted_plants'
  | 'biofertilizers'
  | 'biopesticides'
  | 'beneficial_soil_microorganisms'
  | 'biological_nutrient_management'
  | 'agricultural_waste_bioconversion';

export type EvidenceType = 'peer_reviewed' | 'field_trial' | 'extension_study' | 'institutional_recommendation';

export interface FarmerProfileInput {
  crop: string;
  soil_type?: string;
  target_problem?: string;
  budget_inr?: number;
  available_water?: string;
  land_area_ha?: number;
  farmer_location?: string;
}

export interface EuropePmcPaper {
  id: string;
  source: string;
  pmcid?: string;
  doi?: string;
  title: string;
  author_string: string;
  journal_title?: string;
  pub_year?: number;
  abstract_text?: string;
  isOpenAccess: boolean;
  citation_count: number;
  europe_pmc_url?: string;
  doi_url?: string;
  relevance_explanation: string;
  evidence_type: EvidenceType;
  practical_takeaways: string[];
}

export interface BiotechResearchResponse {
  crop: string;
  target_problem: string;
  query_used: string;
  total_results: number;
  cached: boolean;
  retrieved_at: string;
  evidence_summary: string;
  papers: EuropePmcPaper[];
}

export interface CentralizedDecisionPayload {
  source_module: string;
  crop: string;
  risk_category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence_score: number;
  evidence_summary: string;
  recommended_actions: string[];
  scientific_grounding: string;
  water_constraint_impact?: string;
  financial_constraint_impact?: string;
  conflicting_factors?: string[];
  data_quality: string;
}

export interface BiotechRecommendation {
  id: string;
  crop: string;
  category: BiotechCategoryType;
  category_label: string;
  problem_targeted: string;
  recommended_variety_or_product: string;
  scientific_rationale: string;
  confidence_score: number;
  expected_benefit: string;
  evidence_citations: string[];
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

// ==========================================
// SMART LOCATION SELECTOR TYPES
// ==========================================
export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formatted_address: string;
  village_or_town?: string;
  district?: string;
  state?: string;
  country?: string;
  pin_code?: string;
  display_name: string;
  place_id?: string;
  source: 'nominatim' | 'google_maps' | 'reverse_geocode';
}

export interface SmartLocationState {
  latitude: number;
  longitude: number;
  formatted_address: string;
  village_or_town: string;
  district: string;
  state: string;
  pin_code: string;
  source: 'gps' | 'map' | 'search' | 'manual';
  accuracy_m?: number;
}

export interface SelectedLocation {
  latitude: number;
  longitude: number;
  formatted_address: string;
  village?: string;
  village_or_town?: string;
  district?: string;
  state?: string;
  pin_code?: string;
  source?: 'gps' | 'map' | 'search' | 'manual';
  location_source?: 'gps' | 'map' | 'search' | 'manual';
  accuracy_m?: number;
  location_accuracy_m?: number;
  updated_at?: string;
}
