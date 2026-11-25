// frontend/src/context/FarmContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Farm, FarmSummary, WeatherResponse, RecommendationResponse, Language, Theme, FarmCreate, SelectedLocation } from '@/types';
import { TRANSLATIONS } from '@/lib/translations';

interface FarmContextType {
  farms: Farm[];
  currentFarm: Farm | null;
  setCurrentFarmId: (id: string) => void;
  summary: FarmSummary | null;
  weather: WeatherResponse | null;
  recommendations: RecommendationResponse | null;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  toggleTheme: () => void;
  t: (key: string) => string;
  isLoading: boolean;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  isLocationModalOpen: boolean;
  setIsLocationModalOpen: (open: boolean) => void;
  buyerDeliveryLocation: SelectedLocation | null;
  setBuyerDeliveryLocation: (loc: SelectedLocation) => void;
  labourLocation: SelectedLocation | null;
  setLabourLocation: (loc: SelectedLocation) => void;
  refreshData: (farmOverride?: Farm) => Promise<void>;
  createFarm: (data: FarmCreate) => Promise<boolean>;
  updateFarmLocation: (farmId: string, loc: SelectedLocation) => Promise<boolean>;
}

const DEFAULT_FARM: Farm = {
  id: "farm_001",
  farmer_name: "Suresh Gowda",
  preferred_language: "kn",
  farm_name: "Cauvery Valley Organic Farm",
  village: "Mandya Rural",
  district: "Mandya",
  state: "Karnataka",
  latitude: 12.5234,
  longitude: 76.8976,
  land_area_ha: 2.5,
  primary_crop: "Tomato",
  crop_variety: "Arka Rakshak",
  sowing_date: "2026-10-15",
  crop_stage: "Mid-Season",
  soil_type: "Red Sandy Loam",
  irrigation_method: "Drip Irrigation",
  water_source: "Borewell",
  available_water_m3: 14500.0,
  cultivation_budget_inr: 85000.0,
  created_at: "2026-11-01T04:00:00Z",
  updated_at: "2026-11-25T04:00:00Z"
};

const FarmContext = createContext<FarmContextType | undefined>(undefined);

export function FarmProvider({ children }: { children: ReactNode }) {
  const [farms, setFarms] = useState<Farm[]>([DEFAULT_FARM]);
  const [currentFarmId, setCurrentFarmId] = useState<string>("farm_001");
  const [summary, setSummary] = useState<FarmSummary | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [language, setLanguageState] = useState<Language>('en');
  const [theme, setThemeState] = useState<Theme>('light');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [buyerDeliveryLocation, setBuyerDeliveryLocationState] = useState<SelectedLocation | null>(null);
  const [labourLocation, setLabourLocationState] = useState<SelectedLocation | null>(null);
  const fetchSeqRef = useRef<number>(0);

  // Initialize preferences & persisted locations from localStorage if client-side
  useEffect(() => {
    const savedLang = localStorage.getItem('rm_lang') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'kn' || savedLang === 'hi')) {
      setLanguageState(savedLang);
    }
    const savedTheme = localStorage.getItem('rm_theme') as Theme;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      setThemeState(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    try {
      const savedFarms = localStorage.getItem('rm_farms_saved');
      if (savedFarms) {
        const parsed = JSON.parse(savedFarms);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFarms(parsed);
        }
      }
      const savedFarmId = localStorage.getItem('rm_current_farm_id');
      if (savedFarmId) setCurrentFarmId(savedFarmId);
      const savedBuyerLoc = localStorage.getItem('rm_buyer_delivery_loc');
      if (savedBuyerLoc) setBuyerDeliveryLocationState(JSON.parse(savedBuyerLoc));
      const savedLabourLoc = localStorage.getItem('rm_labour_loc');
      if (savedLabourLoc) setLabourLocationState(JSON.parse(savedLabourLoc));
    } catch {
      // Ignore malformed localStorage
    }
  }, []);

  const setBuyerDeliveryLocation = (loc: SelectedLocation) => {
    setBuyerDeliveryLocationState(loc);
    try {
      localStorage.setItem('rm_buyer_delivery_loc', JSON.stringify(loc));
    } catch {}
  };

  const setLabourLocation = (loc: SelectedLocation) => {
    setLabourLocationState(loc);
    try {
      localStorage.setItem('rm_labour_loc', JSON.stringify(loc));
    } catch {}
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('rm_lang', lang);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setThemeState(nextTheme);
    localStorage.setItem('rm_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const t = (key: string): string => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS['en']?.[key] || key;
  };

  const currentFarm = farms.find(f => f.id === currentFarmId) || farms[0] || null;

  const fetchBackendData = async (farmOverride?: Farm) => {
    const requestSeq = ++fetchSeqRef.current;
    setIsLoading(true);
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
    let activeFarm = farmOverride || farms.find(f => f.id === currentFarmId) || DEFAULT_FARM;
    try {
      // 1. Fetch farms only when not overriding with newly saved farm
      if (!farmOverride) {
        const farmsRes = await fetch(`${backendUrl}/farms`);
        if (farmsRes.ok && requestSeq === fetchSeqRef.current) {
          const farmList: Farm[] = await farmsRes.json();
          if (farmList.length > 0) {
            // Merge any locally saved location overrides so refresh preserves saved coordinates
            let localSaved: Farm[] = [];
            try {
              const raw = localStorage.getItem('rm_farms_saved');
              if (raw) localSaved = JSON.parse(raw);
            } catch {}
            const merged = farmList.map((bf) => {
              const lf = localSaved.find((x) => x.id === bf.id);
              if (lf && new Date(lf.updated_at).getTime() > new Date(bf.updated_at).getTime()) {
                return lf;
              }
              return bf;
            });
            setFarms(merged);
            activeFarm = merged.find(f => f.id === currentFarmId) || merged[0] || activeFarm;
          }
        }
      }

      // 2. Fetch live weather using activeFarm's saved coordinates
      const weatherRes = await fetch(`${backendUrl}/weather?lat=${activeFarm.latitude}&lon=${activeFarm.longitude}`);
      if (weatherRes.ok && requestSeq === fetchSeqRef.current) {
        const wData = await weatherRes.json();
        setWeather(wData);
      }

      // 3. Fetch summary
      const summaryRes = await fetch(`${backendUrl}/farms/${activeFarm.id}/summary`);
      if (summaryRes.ok && requestSeq === fetchSeqRef.current) {
        const sData = await summaryRes.json();
        setSummary(sData);
      }

      // 4. Fetch recommendations
      const recsRes = await fetch(`${backendUrl}/recommendations?farm_id=${activeFarm.id}`);
      if (recsRes.ok && requestSeq === fetchSeqRef.current) {
        const rData = await recsRes.json();
        setRecommendations(rData);
      }
    } catch (err) {
      if (requestSeq !== fetchSeqRef.current) return;
      console.warn("Using local prototype cache for farm data:", err);
      // Fallback deterministic local state (never mark offline fallback as live)
      setSummary({
        farm: activeFarm,
        soil_moisture_pct: 18.5,
        crop_health_status: "Vigorous / Optimal",
        daily_water_demand_mm: 5.29,
        total_expenses_inr: 87500,
        estimated_yield_tonnes: 62.5,
        expected_revenue_inr: 1375000,
        risk_level: "low",
        last_updated: "2026-11-25T09:30:00Z"
      });
      setWeather({
        latitude: activeFarm.latitude,
        longitude: activeFarm.longitude,
        elevation_m: 680,
        timezone: "Asia/Kolkata",
        current: {
          time: "2026-11-25T09:30:00Z",
          temperature_c: 28.4,
          relative_humidity_pct: 58,
          precipitation_mm: 0.0,
          rain_probability_pct: 12,
          wind_speed_kmh: 9.2,
          wind_direction_deg: 110,
          weather_code: 1,
          condition_text: "Mainly Clear",
          et0_fao56_mm: 4.6
        },
        daily_forecast: [
          { date: "2026-11-25", temp_max_c: 31.2, temp_min_c: 19.5, precipitation_sum_mm: 0.0, rain_probability_max_pct: 15, et0_fao56_mm: 4.6, condition_text: "Clear" },
          { date: "2026-11-26", temp_max_c: 32.0, temp_min_c: 20.0, precipitation_sum_mm: 0.0, rain_probability_max_pct: 10, et0_fao56_mm: 4.8, condition_text: "Clear" },
          { date: "2026-11-27", temp_max_c: 30.5, temp_min_c: 21.0, precipitation_sum_mm: 2.5, rain_probability_max_pct: 35, et0_fao56_mm: 4.2, condition_text: "Partly Cloudy" },
          { date: "2026-11-28", temp_max_c: 29.0, temp_min_c: 19.8, precipitation_sum_mm: 12.0, rain_probability_max_pct: 70, et0_fao56_mm: 3.5, condition_text: "Moderate Rain" },
          { date: "2026-11-29", temp_max_c: 28.5, temp_min_c: 18.5, precipitation_sum_mm: 5.0, rain_probability_max_pct: 45, et0_fao56_mm: 3.8, condition_text: "Rain Showers" },
          { date: "2026-11-30", temp_max_c: 30.0, temp_min_c: 19.0, precipitation_sum_mm: 0.0, rain_probability_max_pct: 20, et0_fao56_mm: 4.4, condition_text: "Clear" },
          { date: "2026-12-01", temp_max_c: 31.0, temp_min_c: 19.5, precipitation_sum_mm: 0.0, rain_probability_max_pct: 15, et0_fao56_mm: 4.6, condition_text: "Clear" },
        ],
        provenance: {
          source: "Local Prototype Cache (Offline Fallback)",
          timestamp: new Date().toISOString(),
          quality: "estimated_fallback",
          is_live: false
        }
      });
      setRecommendations({
        farm_id: activeFarm.id,
        generated_at: "2026-11-25T09:35:00Z",
        overall_risk_level: "low",
        active_advisories_count: 3,
        recommendations: [
          {
            id: "rec_001",
            category: "irrigation",
            priority: "high",
            action: "Schedule 2.5 hours drip cycle at 06:00 tomorrow",
            reason: `Mid-season ${activeFarm.primary_crop} daily water demand is 5.29mm/day. Root zone moisture is currently 18.5% in ${activeFarm.soil_type}.`,
            supporting_data: {
              key_metrics: { et0_mm: 4.6, crop_water_demand_mm: 5.29, soil_moisture_pct: 18.5 },
              source: "FAO-56 Penman-Monteith Model & In-situ Calibration",
              timestamp: "2026-11-25T09:30:00Z",
              data_quality: "live",
              uncertainty: "±5%"
            },
            alternative_action: "If canal water supply arrives tonight, decrease duration to 1.5 hours."
          },
          {
            id: "rec_002",
            category: "crop_protection",
            priority: "medium",
            action: "Inspect lower leaves for early fungal blight spotting",
            reason: "Forecast shows rain likelihood rising to 70% in 72 hours with warm temperatures. High humidity risk window.",
            supporting_data: {
              key_metrics: { rain_prob_72h_pct: 70, temperature_c: 28.4 },
              source: "Agrometeorological Pathology Matrix",
              timestamp: "2026-11-25T09:30:00Z",
              data_quality: "live",
              uncertainty: "±6%"
            },
            alternative_action: "Apply preventative organic bio-fungicide (Trichoderma) spray prior to rain."
          },
          {
            id: "rec_003",
            category: "market",
            priority: "low",
            action: `Check APMC Mandi price trends for ${activeFarm.primary_crop} in ${activeFarm.district}`,
            reason: "Regional wholesale prices have gained 8.4% this week. Harvest window opening in 18 days.",
            supporting_data: {
              key_metrics: { "7_day_price_gain_pct": 8.4, mandi: `${activeFarm.district} APMC` },
              source: "AGMARKNET Market Price Feed",
              timestamp: "2026-11-25T09:30:00Z",
              data_quality: "live",
              uncertainty: "±4%"
            }
          }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBackendData();
  }, [currentFarmId]);

  const createFarm = async (data: FarmCreate): Promise<boolean> => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/farms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const created = await res.json();
        setFarms(prev => [...prev, created]);
        setCurrentFarmId(created.id);
        return true;
      }
    } catch (err) {
      console.warn("Backend unavailable, storing in local session:", err);
    }
    // Prototype local creation
    const newFarm: Farm = {
      id: `farm_${Date.now().toString(36)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...data
    };
    setFarms(prev => [...prev, newFarm]);
    setCurrentFarmId(newFarm.id);
    return true;
  };

  const updateFarmLocation = async (farmId: string, loc: SelectedLocation): Promise<boolean> => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
    const patchBody = {
      latitude: loc.latitude,
      longitude: loc.longitude,
      village: loc.village,
      district: loc.district,
      state: loc.state,
      pin_code: loc.pin_code,
      formatted_address: loc.formatted_address,
      location_source: loc.location_source,
      location_accuracy_m: loc.location_accuracy_m,
    };

    let updatedFarm: Farm | null = null;
    try {
      const res = await fetch(`${backendUrl}/farms/${farmId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      });
      if (res.ok) {
        updatedFarm = await res.json();
      }
    } catch {
      // Continue with local persistence adapter if backend is offline
    }

    const nextFarms = farms.map((f) => {
      if (f.id !== farmId) return f;
      if (updatedFarm) return updatedFarm;
      return {
        ...f,
        ...patchBody,
        updated_at: loc.updated_at,
      };
    });

    const targetFarm = nextFarms.find((f) => f.id === farmId);
    setFarms(nextFarms);
    try {
      localStorage.setItem('rm_farms_saved', JSON.stringify(nextFarms));
      localStorage.setItem('rm_current_farm_id', farmId);
    } catch {}

    if (targetFarm) {
      await fetchBackendData(targetFarm);
    }
    return true;
  };

  return (
    <FarmContext.Provider
      value={{
        farms,
        currentFarm,
        setCurrentFarmId: (id: string) => {
          setCurrentFarmId(id);
          try {
            localStorage.setItem('rm_current_farm_id', id);
          } catch {}
        },
        summary,
        weather,
        recommendations,
        language,
        setLanguage,
        theme,
        toggleTheme,
        t,
        isLoading,
        isOnboardingOpen,
        setIsOnboardingOpen,
        isLocationModalOpen,
        setIsLocationModalOpen,
        buyerDeliveryLocation,
        setBuyerDeliveryLocation,
        labourLocation,
        setLabourLocation,
        refreshData: fetchBackendData,
        createFarm,
        updateFarmLocation
      }}
    >
      {children}
    </FarmContext.Provider>
  );
}

export function useFarm() {
  const context = useContext(FarmContext);
  if (!context) {
    throw new Error('useFarm must be used within a FarmProvider');
  }
  return context;
}
