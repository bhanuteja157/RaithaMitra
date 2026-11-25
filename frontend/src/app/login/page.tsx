// frontend/src/app/login/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFarm } from '@/context/FarmContext';
import { UserRole, Language } from '@/types';
import { MobileOtpFlow } from '@/components/auth/MobileOtpFlow';
import {
  Sprout,
  Building2,
  Users,
  Truck,
  Sparkles,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Lock,
  Mail,
  Phone,
  MapPin,
  Check,
  Globe,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, registerUser, switchDemoUser, language, setLanguage, setIsOnboardingOpen } = useFarm();

  const [activeTab, setActiveTab] = useState<'otp' | 'signin' | 'register' | 'demo'>('otp');
  const [selectedRole, setSelectedRole] = useState<UserRole>('farmer');
  
  // Sign In state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Registration state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regVillage, setRegVillage] = useState('Mandya Rural');
  const [regDistrict, setRegDistrict] = useState('Mandya');
  
  // Role-specific fields
  const [buyerType, setBuyerType] = useState<'individual' | 'business'>('business');
  const [businessName, setBusinessName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['Harvesting', 'Transplantation']);
  const [dailyWage, setDailyWage] = useState<number>(600);
  const [vehicleType, setVehicleType] = useState('Tata Ace');
  const [regNumber, setRegNumber] = useState('KA-11-EA-4521');
  const [capacityKg, setCapacityKg] = useState<number>(1500);
  const [baseFarePerKm, setBaseFarePerKm] = useState<number>(30);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const PRIMARY_ROLES: { role: UserRole; title: string; subtitle: string; icon: any; color: string; desc: string }[] = [
    {
      role: 'farmer',
      title: 'Farmer Profile',
      subtitle: 'ಕೃಷಿಕ / किसान',
      icon: Sprout,
      color: 'from-emerald-500 to-green-600',
      desc: 'Smart irrigation, agronomic intelligence, harvest listing, and labour hiring.'
    },
    {
      role: 'buyer',
      title: 'Buyer Profile',
      subtitle: 'ಖರೀದಿದಾರ / खरीदार',
      icon: Building2,
      color: 'from-blue-500 to-cyan-600',
      desc: 'Direct farm-gate produce procurement, transparent bidding, and purchase orders.'
    },
    {
      role: 'labour',
      title: 'Labour Profile',
      subtitle: 'ಕಾರ್ಮಿಕ / श्रमिक',
      icon: Users,
      color: 'from-amber-500 to-orange-600',
      desc: 'Find nearby agricultural work, register skills, and track daily wages directly.'
    },
    {
      role: 'driver',
      title: 'Driver Profile',
      subtitle: 'ಚಾಲಕ / चालक',
      icon: Truck,
      color: 'from-purple-500 to-indigo-600',
      desc: 'Farm produce freight logistics, booking acceptance, and route delivery tracking.'
    }
  ];

  const DEMO_PERSONAS = [
    {
      role: 'farmer' as UserRole,
      name: 'Suresh Gowda',
      email: 'farmer@raithamitra.in',
      location: 'Cauvery Valley Farm, Mandya',
      crop: 'Tomato (Arka Rakshak, 2.5 ha)',
      redirect: '/',
      icon: Sprout
    },
    {
      role: 'buyer' as UserRole,
      name: 'Bengaluru Fresh Foods Co',
      email: 'buyer1@raithamitra.in',
      location: 'Yeshwanthpur APMC Yard',
      crop: 'Licensed Wholesale Produce Buyer',
      redirect: '/dashboard/buyer',
      icon: Building2
    },
    {
      role: 'labour' as UserRole,
      name: 'Basavaraj Koravara',
      email: 'labour@raithamitra.in',
      location: 'Mandya Rural',
      crop: 'Harvesting & Transplantation Specialist',
      redirect: '/dashboard/labour',
      icon: Users
    },
    {
      role: 'driver' as UserRole,
      name: 'Manjunath Transport',
      email: 'driver@raithamitra.in',
      location: 'Mandya Highway Hub',
      crop: 'Tata Ace (1.5T Freight Carrier)',
      redirect: '/dashboard/driver',
      icon: Truck
    }
  ];

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await login({
        email: loginEmail,
        password: loginPassword,
        role: selectedRole
      });
      if (res.success && res.redirect_url) {
        router.push(res.redirect_url);
      } else {
        setErrorMsg(res.error || 'Invalid credentials or role mismatch.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login connection failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const payload: any = {
        name: regName,
        email: regEmail,
        phone: regPhone,
        password: regPassword,
        role: selectedRole,
        preferred_language: language,
        village: regVillage,
        district: regDistrict,
        state: 'Karnataka'
      };

      if (selectedRole === 'buyer') {
        payload.buyer_type = buyerType;
        payload.business_name = businessName || regName;
        payload.delivery_address = deliveryAddress || `${regVillage}, ${regDistrict}`;
      } else if (selectedRole === 'labour') {
        payload.skills = selectedSkills;
        payload.daily_wage_rate = dailyWage;
      } else if (selectedRole === 'driver') {
        payload.vehicle_type = vehicleType;
        payload.vehicle_reg_number = regNumber;
        payload.capacity_kg = capacityKg;
        payload.base_fare_per_km = baseFarePerKm;
      }

      const res = await registerUser(payload);
      if (res.success) {
        if (selectedRole === 'farmer') {
          setIsOnboardingOpen(true);
        }
        router.push(res.redirect_url || '/');
      } else {
        setErrorMsg(res.error || 'Registration failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration connection failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (persona: typeof DEMO_PERSONAS[0]) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await switchDemoUser(persona.role);
      router.push(persona.redirect);
    } catch (err: any) {
      setErrorMsg(err.message || 'Demo login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dark min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center py-8 px-4 bg-[#030907] text-[#F7F5ED]">
      {/* Outer-Space Sky & Subtle Starfield */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-gradient-to-b from-[#020706] via-[#061410] to-[#0b2318]">
        <div
          className="absolute inset-0 opacity-45"
          style={{
            backgroundImage:
              'radial-gradient(1px 1px at 14% 12%, rgba(255,255,255,0.75), transparent), radial-gradient(1px 1px at 38% 8%, rgba(186,230,253,0.7), transparent), radial-gradient(1.5px 1.5px at 72% 14%, rgba(255,255,255,0.65), transparent), radial-gradient(1px 1px at 88% 9%, rgba(167,243,208,0.6), transparent), radial-gradient(1px 1px at 56% 18%, rgba(255,255,255,0.5), transparent)',
          }}
        />

        {/* Realistic Earth-Observation Satellite in Upper-Left */}
        <svg
          viewBox="0 0 180 100"
          aria-hidden="true"
          className="hidden sm:block absolute top-6 left-6 md:top-10 md:left-12 w-36 md:w-44 opacity-85 drop-shadow-[0_6px_18px_rgba(56,189,248,0.28)]"
        >
          <defs>
            <linearGradient id="rmSatPanel" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="rmSatBody" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
          </defs>
          {/* Left solar wing */}
          <rect x="8" y="34" width="52" height="22" rx="2" fill="url(#rmSatPanel)" stroke="#7dd3fc" strokeOpacity="0.45" strokeWidth="1" />
          <line x1="25" y1="34" x2="25" y2="56" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="0.8" />
          <line x1="42" y1="34" x2="42" y2="56" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="0.8" />
          <line x1="8" y1="45" x2="60" y2="45" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="0.8" />
          {/* Right solar wing */}
          <rect x="114" y="34" width="52" height="22" rx="2" fill="url(#rmSatPanel)" stroke="#7dd3fc" strokeOpacity="0.45" strokeWidth="1" />
          <line x1="131" y1="34" x2="131" y2="56" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="0.8" />
          <line x1="148" y1="34" x2="148" y2="56" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="0.8" />
          <line x1="114" y1="45" x2="166" y2="45" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="0.8" />
          {/* Connecting boom */}
          <rect x="60" y="43" width="54" height="4" fill="#94a3b8" />
          {/* Main satellite bus */}
          <rect x="74" y="29" width="26" height="32" rx="4" fill="url(#rmSatBody)" stroke="#cbd5e1" strokeWidth="1" />
          <circle cx="87" cy="45" r="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
          <circle cx="87" cy="45" r="2.2" fill="#38bdf8" />
          {/* Dish & sensor */}
          <path d="M80 61 L87 72 L94 61 Z" fill="#94a3b8" />
        </svg>

        {/* Curved Earth Horizon & Aerial Green Agricultural Fields */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[18%] sm:top-[16%] w-[165vw] sm:w-[140vw] h-[140vh] rounded-[50%] overflow-hidden border-t border-sky-300/40 shadow-[0_-18px_70px_rgba(56,189,248,0.28)]">
          <img
            src="/images/agriculture/indian-farmland-sunrise.jpg"
            alt="Aerial green agricultural fields"
            className="w-full h-full object-cover object-center opacity-55 scale-105"
          />
          <img
            src="/images/agriculture/satellite-farmland.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover opacity-35 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-sky-400/15 via-[#0b2b1d]/65 to-[#04110b]/95" />
        </div>
      </div>

      {/* Centered Translucent Dark-Green Glassmorphic Login Card */}
      <div className="relative z-10 w-full max-w-2xl bg-[#0b2318]/82 backdrop-blur-xl border border-emerald-400/25 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden p-6 md:p-8 space-y-5 rm-animate-in">
        {/* Brand & Language Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-400/15">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-[#2b6a47] to-[#173C2B] border border-emerald-400/30 text-white shadow-lg">
              <Sprout className="w-6 h-6 text-[#86efac]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl font-semibold text-white tracking-tight">
                  RaithaMitra
                </h1>
                <span className="text-[11px] px-2 py-0.5 font-semibold rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  ರೈತ ಮಿತ್ರ
                </span>
              </div>
              <p className="text-xs text-[#C9A35C] font-medium">
                From Seed to Sale, One Intelligent Companion.
              </p>
            </div>
          </div>

          {/* Multilingual Selector */}
          <div className="flex items-center gap-1 bg-[#071810]/80 border border-emerald-400/20 rounded-xl p-1 self-start sm:self-auto">
            <Globe className="w-3.5 h-3.5 text-emerald-300/80 ml-2" />
            {(['en', 'kn', 'hi'] as Language[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLanguage(l)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  language === l
                    ? 'bg-[#2b6a47] text-white shadow-sm'
                    : 'text-emerald-100/75 hover:bg-white/10'
                }`}
              >
                {l === 'en' ? 'English' : l === 'kn' ? 'ಕನ್ನಡ' : 'हिंदी'}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation Mode Tabs */}
        <div className="grid grid-cols-4 gap-1.5 p-1.5 bg-[#071810]/80 border border-emerald-400/15 rounded-2xl">
          <button
            type="button"
            onClick={() => { setActiveTab('otp'); setErrorMsg(null); }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'otp'
                ? 'bg-[#2b6a47] text-white shadow-sm'
                : 'text-emerald-100/70 hover:text-white hover:bg-white/5'
            }`}
          >
            Mobile OTP
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('signin'); setErrorMsg(null); }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'signin'
                ? 'bg-[#2b6a47] text-white shadow-sm'
                : 'text-emerald-100/70 hover:text-white hover:bg-white/5'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setErrorMsg(null); }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'register'
                ? 'bg-[#2b6a47] text-white shadow-sm'
                : 'text-emerald-100/70 hover:text-white hover:bg-white/5'
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('demo'); setErrorMsg(null); }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1 ${
              activeTab === 'demo'
                ? 'bg-[#b48332] text-white shadow-sm'
                : 'text-[#e2c285] hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Demo</span>
          </button>
        </div>

        {activeTab === 'otp' && (
          <div className="rounded-2xl bg-[#071810]/65 border border-emerald-400/15 p-4">
            <MobileOtpFlow />
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: Sign In & TAB 2: Register (Role Cards Selection) */}
        {(activeTab === 'signin' || activeTab === 'register') && (
          <div className="space-y-4">
            <div className="text-center md:text-left">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                {activeTab === 'signin' ? 'Select Profile Category to Sign In' : 'Select Registration Category'}
              </h2>
              <p className="text-xs text-zinc-500">
                Choose your primary role in the rural economic network.
              </p>
            </div>

            {/* Exactly Four Primary Role-Selection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {PRIMARY_ROLES.map((r) => {
                const Icon = r.icon;
                const isSelected = selectedRole === r.role;
                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => { setSelectedRole(r.role); setErrorMsg(null); }}
                    className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 shadow-md ring-2 ring-emerald-500/30'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${r.color} text-white flex items-center justify-center shadow-md`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">
                        {r.title}
                      </h3>
                      <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {r.subtitle}
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2">
                      {r.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 1: SIGN IN FORM */}
        {activeTab === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Email Address or Mobile ID
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder={
                      selectedRole === 'farmer' ? 'farmer@raithamitra.in' :
                      selectedRole === 'buyer' ? 'buyer1@raithamitra.in' : 'labour@raithamitra.in'
                    }
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Account Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span>{isSubmitting ? 'Authenticating...' : `Sign In as ${selectedRole.toUpperCase()}`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* TAB 2: REGISTRATION FORM */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Anand Kumar"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+91 98450 00000"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Village / Ward
                </label>
                <input
                  type="text"
                  required
                  value={regVillage}
                  onChange={(e) => setRegVillage(e.target.value)}
                  placeholder="e.g. Maddur Rural"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  District
                </label>
                <input
                  type="text"
                  required
                  value={regDistrict}
                  onChange={(e) => setRegDistrict(e.target.value)}
                  placeholder="e.g. Mandya"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Role Specific Additional Fields */}
            {selectedRole === 'buyer' && (
              <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-3">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase">
                  Buyer Business Details
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Buyer Category
                    </label>
                    <select
                      value={buyerType}
                      onChange={(e) => setBuyerType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
                    >
                      <option value="business">Wholesale / Business Buyer</option>
                      <option value="individual">Direct Retail Buyer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Business or Entity Name
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Apex Agri Retail"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Delivery APMC / Mandi Address
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="e.g. Yeshwanthpur APMC Yard"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedRole === 'labour' && (
              <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-3">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase">
                  Agricultural Skills & Wage Details
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                      Select Primary Skills
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {['Harvesting', 'Transplantation', 'Weeding', 'Spraying', 'Loading & Unloading'].map((sk) => {
                        const hasSkill = selectedSkills.includes(sk);
                        return (
                          <button
                            key={sk}
                            type="button"
                            onClick={() => {
                              setSelectedSkills(hasSkill ? selectedSkills.filter(s => s !== sk) : [...selectedSkills, sk]);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                              hasSkill
                                ? 'bg-amber-500 text-white border-amber-600'
                                : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'
                            }`}
                          >
                            {sk}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Expected Daily Wage (₹ / day)
                    </label>
                    <input
                      type="number"
                      min={400}
                      max={2000}
                      value={dailyWage}
                      onChange={(e) => setDailyWage(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedRole === 'driver' && (
              <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 space-y-3">
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase">
                  Freight Vehicle & Tariff Details
                </span>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Vehicle Type
                    </label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
                    >
                      <option value="Tata Ace">Tata Ace (1.5 Tonne)</option>
                      <option value="Mahindra Bolero Pickup">Mahindra Bolero Pickup (1.75T)</option>
                      <option value="Ashok Leyland Dost">Ashok Leyland Dost (2.0T)</option>
                      <option value="Eicher Pro 14ft">Eicher Pro 14ft (4.5T)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      value={regNumber}
                      onChange={(e) => setRegNumber(e.target.value)}
                      placeholder="e.g. KA-11-EA-4521"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Payload Capacity (kg)
                    </label>
                    <input
                      type="number"
                      min={500}
                      max={10000}
                      value={capacityKg}
                      onChange={(e) => setCapacityKg(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Base Fare (₹ / km)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={200}
                      value={baseFarePerKm}
                      onChange={(e) => setBaseFarePerKm(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span>{isSubmitting ? 'Registering Account...' : `Register & Continue as ${selectedRole.toUpperCase()}`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* TAB 3: TRY DEMO (JUDGING EVALUATION QUICK-ACCESS) */}
        {activeTab === 'demo' && (
          <div className="space-y-4 pt-1">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Demonstration Mode for Judging Evaluation</span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                Instantly simulate realistic multi-role agricultural workflows using predefined, persistent demonstration identities. Fictional demo sessions remain strictly separated from real user accounts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DEMO_PERSONAS.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.role}
                    type="button"
                    onClick={() => handleDemoLogin(p)}
                    disabled={isSubmitting}
                    className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 hover:border-emerald-500 transition-all text-left flex items-start gap-4 group"
                  >
                    <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          {p.role} Persona
                        </span>
                        <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 group-hover:text-emerald-500 transition-all" />
                      </div>
                      <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white mt-0.5">
                        {p.name}
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                        {p.crop} • {p.location}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
