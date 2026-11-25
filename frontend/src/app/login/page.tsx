// frontend/src/app/login/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFarm } from '@/context/FarmContext';
import { UserRole } from '@/types';
import { Sprout, ShieldCheck, UserCheck, ArrowRight, Sparkles, Building2, Users, Truck, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { switchDemoUser, currentUser } = useFarm();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('farmer');

  const DEMO_PERSONAS: { role: UserRole; name: string; email: string; label: string; desc: string; icon: any; redirect: string }[] = [
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
    // Find matching persona or default to role
    const persona = DEMO_PERSONAS.find((p) => p.email.toLowerCase() === email.toLowerCase()) || DEMO_PERSONAS.find((p) => p.role === selectedRole);
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
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-10">
        {/* Left Side: 1-Click Judging Personas */}
        <div className="space-y-6 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Judging Evaluation Quick-Access</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              RaithaMitra Auth
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              Select any verified persona below to immediately simulate realistic end-to-end multi-role workflows.
            </p>
          </div>

          <div className="space-y-3 my-4">
            {DEMO_PERSONAS.map((p) => {
              const Icon = p.icon;
              const isCurrent = currentUser?.role === p.role;
              return (
                <button
                  key={p.role}
                  type="button"
                  onClick={() => handle1ClickLogin(p.role, p.redirect)}
                  disabled={isSubmitting}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 group ${
                    isCurrent
                      ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/50'
                      : 'bg-slate-800/70 border-slate-700/80 hover:bg-slate-800 hover:border-emerald-500/40'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                        {p.name}
                      </span>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-700/80 text-emerald-400 border border-slate-600/60">
                        {p.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{p.desc}</p>
                    <span className="text-[11px] font-mono text-slate-500 mt-1 block">{p.email}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all self-center" />
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1.5 border-t border-slate-800 pt-4">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>SQLite persistent backend (`database/raithamitra.db`) with active seed data.</span>
          </div>
        </div>

        {/* Right Side: Standard Login Form */}
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-6 sm:p-8 flex flex-col justify-center">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            Standard Credentials Sign In
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            Enter registered email and password to log in to your account.
          </p>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Select Persona Role
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
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="farmer">Farmer (ರೈತ)</option>
                <option value="buyer">Produce Buyer (ಖರೀದಿದಾರ)</option>
                <option value="labour">Agricultural Labour (ಕೃಷಿ ಕಾರ್ಮಿಕ)</option>
                <option value="driver">Logistics Driver (ವಾಹನ ಚಾಲಕ)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. farmer@raithamitra.in"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-lg shadow-md hover:shadow-emerald-950 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In to Workspace'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-xs text-slate-500">
              Demo passwords default to <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded">farmer123</code>, <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded">buyer123</code>, etc.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
