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
}

// Flagship 1: Labour Connect
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

// Flagship 2: Smart Bidding
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

// Flagship 3: Transport Connect
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

// Flagship 4: BioIntel
export interface BioIntelPublication {
  id: string;
  title: string;
  authors: string;
  year: string;
  journal: string;
  doi?: string;
  source_link: string;
  abstract: string;
  is_open_access: boolean;
  farmer_takeaway: string;
  scientific_status: string;
}

export interface NurserySupplier {
  id: string;
  name: string;
  location: string;
  phone: string;
  verified: boolean;
  agency: string;
  available_supplies: string[];
  official_portal: string;
}
