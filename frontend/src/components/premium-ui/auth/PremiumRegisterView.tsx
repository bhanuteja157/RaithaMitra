// frontend/src/components/premium-ui/auth/PremiumRegisterView.tsx
'use client';

import React, { useState } from 'react';
import { Sprout, ShoppingBag, Users, Truck, CheckCircle2, Loader2 } from 'lucide-react';
import { AgriImage, AGRI_IMAGE_ASSETS } from '../shared/AgriImage';
import { PREMIUM_I18N, PremiumLang } from '../shared/i18n';

export type RaithaRole = 'farmer' | 'buyer' | 'labour' | 'driver';

export interface PremiumRegisterViewProps {
  onSubmit: (payload: {
    role: RaithaRole;
    fullName: string;
    emailOrPhone: string;
    password: string;
  }) => void | Promise<void>;
  onSignInLink?: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
  language?: PremiumLang;
}

const ROLE_CARDS: {
  id: RaithaRole;
  title: string;
  description: string;
  image: string;
  icon: any;
}[] = [
  {
    id: 'farmer',
    title: 'Farmer',
    description: 'Grow smarter, manage your farm and sell your produce.',
    image: AGRI_IMAGE_ASSETS.roleFarmer,
    icon: Sprout,
  },
  {
    id: 'buyer',
    title: 'Buyer',
    description: 'Discover agricultural produce and connect directly with farmers.',
    image: AGRI_IMAGE_ASSETS.roleBuyer,
    icon: ShoppingBag,
  },
  {
    id: 'labour',
    title: 'Labour',
    description: 'Find agricultural work and manage employment opportunities.',
    image: AGRI_IMAGE_ASSETS.roleLabour,
    icon: Users,
  },
  {
    id: 'driver',
    title: 'Driver',
    description: 'Find transportation opportunities and deliver agricultural produce.',
    image: AGRI_IMAGE_ASSETS.roleDriver,
    icon: Truck,
  },
];

export function PremiumRegisterView({
  onSubmit,
  onSignInLink,
  isLoading = false,
  errorMessage = null,
  language = 'en',
}: PremiumRegisterViewProps) {
  const t = PREMIUM_I18N[language];
  const [selectedRole, setSelectedRole] = useState<RaithaRole>('farmer');
  const [fullName, setFullName] = useState<string>('');
  const [emailOrPhone, setEmailOrPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !emailOrPhone.trim() || password.length < 6) {
      setLocalError('Please enter your name, email/phone, and a password (min 6 characters).');
      return;
    }
    setLocalError(null);
    await onSubmit({
      role: selectedRole,
      fullName: fullName.trim(),
      emailOrPhone: emailOrPhone.trim(),
      password,
    });
  };

  const err = errorMessage || localError;

  return (
    <div className="rm-premium-root rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-[#F8F7F2] dark:bg-zinc-900 p-5 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#17251D] dark:text-white">
            {t.chooseRole}
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            Select your account role to continue. Role authorization is verified by the backend service.
          </p>
        </div>
        {onSignInLink && (
          <button
            type="button"
            onClick={onSignInLink}
            className="text-xs font-bold text-[#166534] hover:underline"
          >
            Already have an account? {t.signIn}
          </button>
        )}
      </div>

      {/* 4 Large Visual Role Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="radiogroup" aria-label="Account Role">
        {ROLE_CARDS.map((card) => {
          const Icon = card.icon;
          const isSelected = selectedRole === card.id;
          return (
            <button
              key={card.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelectedRole(card.id)}
              className={`group text-left rounded-2xl overflow-hidden border-2 transition rm-card-hover bg-white dark:bg-zinc-950 ${
                isSelected
                  ? 'border-[#166534] ring-2 ring-[#059669]/25'
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <div className="relative">
                <AgriImage
                  src={card.image}
                  alt={card.title}
                  aspectClass="aspect-[16/10]"
                />
                {isSelected && (
                  <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#166534] text-white text-[10px] font-bold shadow">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                  </span>
                )}
              </div>
              <div className="p-4 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-sm text-[#17251D] dark:text-white">
                  <Icon className="w-4 h-4 text-[#166534]" />
                  <span>{card.title}</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {card.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Account Fields */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 space-y-4"
      >
        {err && (
          <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {err}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="block text-xs font-semibold mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Email or Mobile</label>
            <input
              type="text"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
            />
          </div>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs text-zinc-500">
            Registering as: <strong className="uppercase text-[#166534]">{selectedRole}</strong>
          </span>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl bg-[#166534] hover:bg-[#14532D] text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {t.createAccount}
          </button>
        </div>
      </form>
    </div>
  );
}
