// frontend/src/app/login/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFarm } from '@/context/FarmContext';
import { Language, UserRole } from '@/types';
import {
  Sprout,
  ShieldCheck,
  ArrowRight,
  Building2,
  Users,
  Truck,
  Lock,
  Mail,
  Eye,
  EyeOff,
} from 'lucide-react';

const LOGIN_SLIDES = [
  '/images/agriculture/indian-farmland-sunrise.jpg',
  '/images/crops/paddy.jpg',
  '/images/agriculture/satellite-farmland.jpg',
];

export default function LoginPage() {
  const router = useRouter();
  const { switchDemoUser, currentUser, language, setLanguage } = useFarm();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('farmer');
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const timer = window.setInterval(() => {
      setSlideIdx((i) => (i + 1) % LOGIN_SLIDES.length);
    }, 8000);
    return () => window.clearInterval(timer);
  }, []);

  const DEMO_PERSONAS: {
    role: UserRole;
    name: string;
    email: string;
    label: string;
    desc: string;
    icon: any;
    redirect: string;
  }[] = [
    {
      role: 'farmer',
      name: 'Suresh Gowda',
      email: 'farmer@raithamitra.in',
      label: 'Farmer Persona',
      desc: 'Cauvery Valley Farm (Mandya) — 2.5 ha Tomato crop, job poster & seller.',
      icon: Sprout,
      redirect: '/',
    },
    {
      role: 'buyer',
      name: 'Nandini Retail Foods',
      email: 'buyer1@raithamitra.in',
      label: 'Buyer Persona',
      desc: 'Bangalore Agrimarket buyer — placing competitive bids on verified lots.',
      icon: Building2,
      redirect: '/dashboard/buyer',
    },
    {
      role: 'labour',
      name: 'Ramesh Kumar',
      email: 'labour@raithamitra.in',
      label: 'Labour Persona',
      desc: 'Mandya rural specialist — harvesting & transplantation, daily wage worker.',
      icon: Users,
      redirect: '/dashboard/labour',
    },
    {
      role: 'driver',
      name: 'Somanna Gowda',
      email: 'driver@raithamitra.in',
      label: 'Driver Persona',
      desc: 'Mahindra Bolero Pickup (1.5T) — rural agri cargo carrier.',
      icon: Truck,
      redirect: '/dashboard/driver',
    },
  ];

  const handle1ClickLogin = async (role: UserRole, redirect: string) => {
    setIsSubmitting(true);
    try {
      await switchDemoUser(role);
      router.push(redirect);
    } catch (err) {
      console.error('Demo login failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const persona =
      DEMO_PERSONAS.find((p) => p.email.toLowerCase() === email.toLowerCase()) ||
      DEMO_PERSONAS.find((p) => p.role === selectedRole);
    if (persona) {
      await switchDemoUser(persona.role);
      router.push(persona.redirect);
    } else {
      await switchDemoUser('farmer');
      router.push('/');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center py-4 px-2 sm:px-4">
      <div className="w-full max-w-6xl rounded-2xl border border-[#DCD8CA] dark:border-zinc-800 bg-[#F7F5ED] dark:bg-zinc-950 shadow-lg overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Side: Agricultural Photography & Branding */}
        <div className="lg:col-span-7 relative min-h-[280px] lg:min-h-[620px] flex flex-col justify-between bg-[#173C2B] text-white overflow-hidden">
          <div className="absolute inset-0">
            {LOGIN_SLIDES.map((src, idx) => (
              <img
                key={src}
                src={src}
                alt="Indian agricultural farmland landscape"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                  slideIdx === idx ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-[#102D20]/90 via-[#173C2B]/45 to-[#173C2B]/25" />
          </div>

          <div className="relative z-10 p-6 sm:p-8 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#102D20]/70 border border-white/15 text-xs font-medium">
              <Sprout className="w-4 h-4 text-[#65A76F]" />
              RaithaMitra — ರೈತ ಮಿತ್ರ
            </span>
            <span className="text-[11px] text-[#F7F5ED]/85 bg-black/25 px-2.5 py-1 rounded-md">
              Syntax Squad · HackWarts 2026
            </span>
          </div>

          <div className="relative z-10 p-6 sm:p-10 space-y-3 max-w-xl">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-white">
              RaithaMitra — ರೈತ ಮಿತ್ರ
            </h1>
            <p className="text-sm sm:text-base font-medium text-[#C9A35C]">
              From Seed to Sale, One Intelligent Companion.
            </p>
            <p className="text-xs sm:text-sm text-[#F7F5ED]/90 leading-relaxed">
              Scientific intelligence, agricultural opportunities and smarter decisions for every farmer.
            </p>
          </div>
        </div>

        {/* Right Side: Warm Cream Form + 1-Click Judging Personas */}
        <div className="lg:col-span-5 p-6 sm:p-8 bg-[#F7F5ED] dark:bg-zinc-900 flex flex-col justify-between space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-[#20372A] dark:text-white">
                Welcome Back
              </h2>
              <p className="text-xs text-[#8D7357] dark:text-zinc-400">
                Sign in or select a verified persona below.
              </p>
            </div>
            <div className="flex gap-1 text-[11px]">
              {(['en', 'kn', 'hi'] as Language[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLanguage(code)}
                  className={`px-2 py-1 rounded-md font-semibold ${
                    language === code
                      ? 'bg-[#173C2B] text-white'
                      : 'bg-white dark:bg-zinc-800 text-[#20372A] dark:text-zinc-300 border border-[#DCD8CA] dark:border-zinc-700'
                  }`}
                >
                  {code === 'en' ? 'EN' : code === 'kn' ? 'ಕನ್ನಡ' : 'हिन्दी'}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-3 bg-white dark:bg-zinc-950 p-4 rounded-xl border border-[#DCD8CA] dark:border-zinc-800">
            <div>
              <label className="block text-xs font-semibold text-[#20372A] dark:text-zinc-300 mb-1">
                Select Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => {
                  const r = e.target.value as UserRole;
                  setSelectedRole(r);
                  const p = DEMO_PERSONAS.find((dp) => dp.role === r);
                  if (p) {
                    setEmail(p.email);
                    setPassword('demo123');
                  }
                }}
                className="w-full bg-[#F7F5ED] dark:bg-zinc-900 border border-[#DCD8CA] dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-[#20372A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#36784D]"
              >
                <option value="farmer">Farmer (ರೈತ)</option>
                <option value="buyer">Produce Buyer (ಖರೀದಿದಾರ)</option>
                <option value="labour">Agricultural Labour (ಕೃಷಿ ಕಾರ್ಮಿಕ)</option>
                <option value="driver">Logistics Driver (ವಾಹನ ಚಾಲಕ)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#20372A] dark:text-zinc-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8D7357] absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="farmer@raithamitra.in"
                  className="w-full bg-[#F7F5ED] dark:bg-zinc-900 border border-[#DCD8CA] dark:border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-xs text-[#20372A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#36784D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#20372A] dark:text-zinc-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8D7357] absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#F7F5ED] dark:bg-zinc-900 border border-[#DCD8CA] dark:border-zinc-700 rounded-lg pl-9 pr-9 py-2 text-xs text-[#20372A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#36784D]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-2 text-[#8D7357] hover:text-[#20372A]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-[#173C2B] hover:bg-[#102D20] text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In to Workspace'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* 1-Click Verified Role Personas */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8D7357]">
              Quick Persona Access
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_PERSONAS.map((p) => {
                const Icon = p.icon;
                const isCurrent = currentUser?.role === p.role;
                return (
                  <button
                    key={p.role}
                    type="button"
                    onClick={() => handle1ClickLogin(p.role, p.redirect)}
                    disabled={isSubmitting}
                    className={`text-left p-2.5 rounded-lg border text-xs transition flex items-center gap-2.5 ${
                      isCurrent
                        ? 'bg-[#173C2B] text-white border-[#173C2B]'
                        : 'bg-white dark:bg-zinc-950 border-[#DCD8CA] dark:border-zinc-800 hover:border-[#36784D]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-[#C9A35C]' : 'text-[#36784D]'}`} />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{p.name}</div>
                      <div className={`text-[10px] capitalize ${isCurrent ? 'text-emerald-200' : 'text-[#8D7357]'}`}>
                        {p.role}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-[#8D7357] flex items-center gap-1.5 border-t border-[#DCD8CA] dark:border-zinc-800 pt-3">
            <ShieldCheck className="w-3.5 h-3.5 text-[#36784D] shrink-0" />
            <span>SQLite persistent backend (`database/raithamitra.db`) with active seed data.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
