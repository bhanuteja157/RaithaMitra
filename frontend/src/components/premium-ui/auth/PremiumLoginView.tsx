// frontend/src/components/premium-ui/auth/PremiumLoginView.tsx
'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Sprout, ArrowRight, Loader2 } from 'lucide-react';
import { AgriImage, AGRI_IMAGE_ASSETS } from '../shared/AgriImage';
import { PREMIUM_I18N, PremiumLang } from '../shared/i18n';

export interface PremiumLoginViewProps {
  onSubmit: (credentials: { identifier: string; password: string }) => void | Promise<void>;
  onCreateAccount?: () => void;
  onForgotPassword?: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
  language?: PremiumLang;
  onLanguageChange?: (lang: PremiumLang) => void;
}

export function PremiumLoginView({
  onSubmit,
  onCreateAccount,
  onForgotPassword,
  isLoading = false,
  errorMessage = null,
  language = 'en',
  onLanguageChange,
}: PremiumLoginViewProps) {
  const t = PREMIUM_I18N[language];
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setLocalError('Please enter your email/username and password.');
      return;
    }
    setLocalError(null);
    await onSubmit({ identifier: identifier.trim(), password });
  };

  const displayError = errorMessage || localError;

  return (
    <div className="rm-premium-root min-h-[620px] rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg grid grid-cols-1 lg:grid-cols-12">
      {/* Left 58% Visual Agricultural Showcase */}
      <div className="lg:col-span-7 relative min-h-[280px] lg:min-h-[620px] flex flex-col justify-between overflow-hidden bg-[#14532D]">
        <div className="absolute inset-0">
          <AgriImage
            src={AGRI_IMAGE_ASSETS.heroSunrise}
            alt="Aerial view of green Indian agricultural farmland at sunrise"
            aspectClass="w-full h-full"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#17251D]/90 via-[#14532D]/45 to-[#14532D]/30" />
        </div>

        <div className="relative z-10 p-6 sm:p-8 flex items-center justify-between">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold">
            <Sprout className="w-4 h-4 text-emerald-300" />
            RaithaMitra — ರೈತ ಮಿತ್ರ
          </div>
          <span className="text-[11px] font-medium text-emerald-100/90 bg-black/25 px-3 py-1 rounded-full">
            Syntax Squad · HackWarts 2026
          </span>
        </div>

        <div className="relative z-10 p-6 sm:p-10 space-y-3 text-white max-w-xl">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight leading-tight">
            RaithaMitra — ರೈತ ಮಿತ್ರ
          </h2>
          <p className="text-sm sm:text-base font-semibold text-[#D4A72C]">
            {t.tagline}
          </p>
          <p className="text-xs sm:text-sm text-emerald-50/90 leading-relaxed">
            {t.intro}
          </p>
        </div>
      </div>

      {/* Right 42% Authentication Form */}
      <div className="lg:col-span-5 p-6 sm:p-10 flex flex-col justify-between bg-[#F8F7F2] dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#14532D] dark:text-emerald-300 font-bold text-sm">
            <Sprout className="w-5 h-5" />
            <span>RaithaMitra</span>
          </div>
          {onLanguageChange && (
            <div className="flex gap-1 text-xs">
              {(['en', 'kn', 'hi'] as PremiumLang[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => onLanguageChange(code)}
                  className={`px-2.5 py-1 rounded-lg font-semibold ${
                    language === code
                      ? 'bg-[#14532D] text-white'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  {code === 'en' ? 'EN' : code === 'kn' ? 'ಕನ್ನಡ' : 'हिन्दी'}
                </button>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleFormSubmit} className="my-auto py-8 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-[#17251D] dark:text-white">{t.welcomeBack}</h1>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              Sign in to access your farm intelligence, market insights, and agricultural services.
            </p>
          </div>

          {displayError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300"
            >
              {displayError}
            </div>
          )}

          <div className="space-y-3.5 text-sm">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Email or Username
              </label>
              <input
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="farmer@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#059669]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Password
                </label>
                {onForgotPassword && (
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-xs font-medium text-[#166534] hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#059669]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-800"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-[#166534] hover:bg-[#14532D] text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
              </>
            ) : (
              <>
                {t.signIn} <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
          <span className="text-zinc-600 dark:text-zinc-400">New to RaithaMitra?</span>
          {onCreateAccount && (
            <button
              type="button"
              onClick={onCreateAccount}
              className="font-bold text-[#166534] dark:text-emerald-400 hover:underline"
            >
              {t.createAccount}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
