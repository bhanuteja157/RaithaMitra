// frontend/src/context/FarmContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Farm, FarmSummary, WeatherResponse, RecommendationResponse, Language, Theme, FarmCreate, User, UserRole, SelectedLocation } from '@/types';
import { TRANSLATIONS } from '@/lib/translations';
import { clearUserSnapshots } from '@/lib/offline/database';

interface FarmContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  role: UserRole;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  token: string | null;
  login: (credentials: { email: string; password: string; role?: UserRole }) => Promise<{ success: boolean; error?: string; redirect_url?: string }>;
  registerUser: (data: any) => Promise<{ success: boolean; error?: string; redirect_url?: string }>;
  sendOtp: (phone: string, countryCode?: string) => Promise<{ success: boolean; masked_phone?: string; cooldown_seconds?: number; sms_configured?: boolean; demo_mode?: boolean; notice?: string; error?: string }>;
  verifyOtp: (phone: string, otp: string, countryCode?: string) => Promise<{ success: boolean; status?: 'authenticated' | 'needs_registration'; verification_token?: string; masked_phone?: string; redirect_url?: string; error?: string }>;
  registerWithOtp: (payload: { verification_token: string; name: string; role: UserRole; preferred_language?: string }) => Promise<{ success: boolean; redirect_url?: string; error?: string }>;
  logout: () => Promise<void>;
  switchDemoUser: (role: UserRole) => Promise<void>;
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

const DEFAULT_USER: User = {
  id: "usr_farmer",
  email: "farmer@raithamitra.in",
  name: "Suresh Gowda",
  phone: "",
  role: "farmer",
  preferred_language: "kn",
  village: "Mandya Rural",
  district: "Mandya",
  state: "Karnataka",
  created_at: "2026-11-01T04:00:00Z"
};

const DEFAULT_FARM: Farm = {
  id: "farm_001",
  farmer_id: "usr_farmer",
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
  const [currentUser, setCurrentUser] = useState<User>(DEFAULT_USER);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);
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

  // Initialize preferences & persisted user/farm state from localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('rm_lang') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'kn' || savedLang === 'hi' || savedLang === 'te')) {
      setLanguageState(savedLang);
      document.documentElement.lang = savedLang;
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
    const savedUser = localStorage.getItem('rm_user');
    const savedToken = localStorage.getItem('rm_token');
    const savedIsDemo = localStorage.getItem('rm_is_demo');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
        setIsAuthenticated(true);
        setIsDemoMode(savedIsDemo === 'true');
        setToken(savedToken || null);
      } catch (e) {}
    } else {
      // Unauthenticated first-time visitor
      setIsAuthenticated(false);
      setIsDemoMode(false);
      setToken(null);
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

  const login = async (credentials: { email: string; password: string; role?: UserRole }) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.detail || 'Login failed' };
      }
      const user: User = data.user;
      setCurrentUser(user);
      setIsAuthenticated(true);
      setIsDemoMode(Boolean(user.is_demo));
      setToken(data.access_token);
      localStorage.setItem('rm_user', JSON.stringify(user));
      localStorage.setItem('rm_token', data.access_token);
      localStorage.setItem('rm_is_demo', user.is_demo ? 'true' : 'false');
      return { success: true, redirect_url: data.redirect_url };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error connecting to backend' };
    }
  };

  const registerUser = async (data: any) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.detail || 'Registration failed' };
      }
      const user: User = resData.user;
      setCurrentUser(user);
      setIsAuthenticated(true);
      setIsDemoMode(false);
      setToken(resData.access_token);
      localStorage.setItem('rm_user', JSON.stringify(user));
      localStorage.setItem('rm_token', resData.access_token);
      localStorage.setItem('rm_is_demo', 'false');
      return { success: true, redirect_url: resData.redirect_url };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const sendOtp = async (phone: string, countryCode = '+91') => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, country_code: countryCode }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.detail || 'Failed to send OTP' };
      return {
        success: true,
        masked_phone: data.masked_phone,
        cooldown_seconds: data.cooldown_seconds,
        sms_configured: data.sms_configured,
        demo_mode: data.demo_mode,
        notice: data.notice,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error connecting to OTP service' };
    }
  };

  const verifyOtp = async (phone: string, otp: string, countryCode = '+91') => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, country_code: countryCode }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.detail || 'Invalid verification code' };

      if (data.status === 'authenticated' && data.user) {
        const user: User = data.user;
        setCurrentUser(user);
        setIsAuthenticated(true);
        setIsDemoMode(Boolean(user.is_demo));
        setToken(data.access_token);
        localStorage.setItem('rm_user', JSON.stringify(user));
        localStorage.setItem('rm_token', data.access_token);
        localStorage.setItem('rm_is_demo', user.is_demo ? 'true' : 'false');
        return { success: true, status: 'authenticated' as const, redirect_url: data.redirect_url };
      }

      return {
        success: true,
        status: 'needs_registration' as const,
        verification_token: data.verification_token,
        masked_phone: data.masked_phone,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error verifying OTP' };
    }
  };

  const registerWithOtp = async (payload: {
    verification_token: string;
    name: string;
    role: UserRole;
    preferred_language?: string;
  }) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/auth/otp/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.detail || 'Registration failed' };
      const user: User = data.user;
      setCurrentUser(user);
      setIsAuthenticated(true);
      setIsDemoMode(false);
      setToken(data.access_token);
      localStorage.setItem('rm_user', JSON.stringify(user));
      localStorage.setItem('rm_token', data.access_token);
      localStorage.setItem('rm_is_demo', 'false');
      return { success: true, redirect_url: data.redirect_url };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during registration' };
    }
  };

  const logout = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      if (token) {
        await fetch(`${backendUrl}/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (err) {
      console.warn("Logout API call warning:", err);
    } finally {
      const prevUid = currentUser?.id;
      if (prevUid) {
        clearUserSnapshots(prevUid, false).catch(() => {});
      }
      setIsAuthenticated(false);
      setIsDemoMode(false);
      setToken(null);
      setCurrentUser(DEFAULT_USER);
      setSummary(null);
      setWeather(null);
      setRecommendations(null);
      localStorage.removeItem('rm_user');
      localStorage.removeItem('rm_token');
      localStorage.removeItem('rm_is_demo');
      localStorage.removeItem('rm_farms_saved');
      localStorage.removeItem('rm_current_farm_id');
    }
  };

  const switchDemoUser = async (role: UserRole) => {
    if (currentUser?.id) {
      clearUserSnapshots(currentUser.id, false).catch(() => {});
    }
    localStorage.removeItem('rm_farms_saved');
    localStorage.removeItem('rm_current_farm_id');
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/auth/demo-accounts`);
      if (res.ok) {
        const accounts: any[] = await res.json();
        const found = accounts.find((a: any) => a.role === role);
        if (found) {
          const demoUser: User = {
            id: found.id || (found.role === 'buyer' ? 'usr_buyer1' : `usr_${found.role}`),
            email: found.email,
            name: found.name,
            phone: found.phone || "",
            role: found.role,
            preferred_language: found.role === 'buyer' ? 'en' : 'kn',
            village: found.role === 'farmer' ? "Mandya Rural" : found.role === 'labour' ? "Maddur" : "Mandya",
            district: "Mandya",
            state: "Karnataka",
            created_at: new Date().toISOString(),
            is_demo: true
          };
          setCurrentUser(demoUser);
          setIsAuthenticated(true);
          setIsDemoMode(true);
          setToken(`rm_demo_token_${found.role}`);
          localStorage.setItem('rm_user', JSON.stringify(demoUser));
          localStorage.setItem('rm_token', `rm_demo_token_${found.role}`);
          localStorage.setItem('rm_is_demo', 'true');
          return;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch demo accounts from backend, falling back to local defaults:", err);
    }
    // Fallback switch
    const localFallback: User = {
      ...DEFAULT_USER,
      role: role,
      name: role === 'farmer' ? "Suresh Gowda" :
            role === 'buyer' ? "Bengaluru Fresh Foods Co" :
            role === 'labour' ? "Basavaraj Koravara" :
            role === 'driver' ? "Manjunath Transport" : "Administrator",
      email: `${role}@raithamitra.in`,
      is_demo: true
    };
    setCurrentUser(localFallback);
    setIsAuthenticated(true);
    setIsDemoMode(true);
    setToken(`rm_demo_token_${role}`);
    localStorage.setItem('rm_user', JSON.stringify(localFallback));
    localStorage.setItem('rm_token', `rm_demo_token_${role}`);
    localStorage.setItem('rm_is_demo', 'true');
  };

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
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  };

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setThemeState(next);
    localStorage.setItem('rm_theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const t = (key: string): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
    return (dict as Record<string, string>)[key] || (TRANSLATIONS.en as Record<string, string>)[key] || key;
  };

  const currentFarm = farms.find(f => f.id === currentFarmId) || farms[0] || null;

  // Unified data fetcher with sequence counter to prevent race conditions
  const fetchBackendData = async (farmOverride?: Farm) => {
    const activeFarm = farmOverride || currentFarm;
    if (!activeFarm) return;

    const seq = ++fetchSeqRef.current;
    setIsLoading(true);
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

    try {
      // 1. Fetch live weather using current farm coordinates
      const weatherRes = await fetch(`${backendUrl}/weather?lat=${activeFarm.latitude}&lon=${activeFarm.longitude}`);
      if (weatherRes.ok && seq === fetchSeqRef.current) {
        const weatherData = await weatherRes.json();
        setWeather(weatherData);
      }

      // 2. Fetch farm summary with Authorization header
      const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('rm_token') : null);
      const authHeaders: Record<string, string> = activeToken ? { Authorization: `Bearer ${activeToken}` } : {};
      const summaryRes = await fetch(`${backendUrl}/farms/${activeFarm.id}/summary`, { headers: authHeaders });
      if (summaryRes.ok && seq === fetchSeqRef.current) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      } else if (seq === fetchSeqRef.current) {
        setSummary(null);
      }

      // 3. Fetch centralized agronomic recommendations
      const recRes = await fetch(`${backendUrl}/recommendations?farm_id=${activeFarm.id}&lang=${language}`, { headers: authHeaders });
      if (recRes.ok && seq === fetchSeqRef.current) {
        const recData = await recRes.json();
        setRecommendations(recData);
      } else if (seq === fetchSeqRef.current) {
        setRecommendations(null);
      }
    } catch (err) {
      console.warn("Backend unavailable; displaying honest unavailable states:", err);
      if (seq !== fetchSeqRef.current) return;
      setWeather(null);
      setSummary(null);
      setRecommendations(null);
    } finally {
      if (seq === fetchSeqRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchBackendData();
  }, [currentFarmId, language]);

  const createFarm = async (data: FarmCreate): Promise<boolean> => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('rm_token') : null);
      const res = await fetch(`${backendUrl}/farms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
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
      village: loc.village || loc.village_or_town || 'Local Farm',
      district: loc.district || 'Mandya',
      state: loc.state || 'Karnataka',
      pin_code: loc.pin_code || '',
      formatted_address: loc.formatted_address,
      location_source: loc.source || loc.location_source || 'map',
      location_accuracy_m: loc.accuracy_m || loc.location_accuracy_m,
    };

    let updatedFarm: Farm | null = null;
    try {
      const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('rm_token') : null);
      const res = await fetch(`${backendUrl}/farms/${farmId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
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
        updated_at: new Date().toISOString(),
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
        currentUser,
        setCurrentUser,
        role: currentUser.role,
        isAuthenticated,
        isDemoMode,
        token,
        login,
        registerUser,
        sendOtp,
        verifyOtp,
        registerWithOtp,
        logout,
        switchDemoUser,
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
