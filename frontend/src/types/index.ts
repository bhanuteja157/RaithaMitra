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
