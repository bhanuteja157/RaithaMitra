// frontend/src/components/auth/MobileOtpFlow.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFarm } from '@/context/FarmContext';
import { Language, UserRole } from '@/types';
import {
  Phone,
  ArrowRight,
  CheckCircle2,
  Sprout,
  Building2,
  Users,
  Truck,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

type OtpLang = Language;

interface OtpTextBundle {
  enterMobile: string;
  sendOtp: string;
  sending: string;
  verifyOtp: string;
  verifying: string;
  resendOtp: string;
  changeNumber: string;
  enterName: string;
  exampleName: string;
  selectRole: string;
  createAccount: string;
  creatingAccount: string;
  otpSentTo: string;
  oneMobileNote: string;
  smsPendingNote: string;
  unableSendOtp: string;
  invalidOtp: string;
  enterFullNameErr: string;
  regFailedErr: string;
  countryCodeAria: string;
}

const OTP_LABELS: Record<OtpLang, OtpTextBundle> = {
  en: {
    enterMobile: 'Enter mobile number',
    sendOtp: 'Continue with OTP',
    sending: 'Sending...',
    verifyOtp: 'Verify OTP',
    verifying: 'Verifying...',
    resendOtp: 'Resend OTP',
    changeNumber: 'Change number',
    enterName: 'Enter your name',
    exampleName: 'e.g., Ramesh Gowda',
    selectRole: 'Select your role',
    createAccount: 'Complete Registration',
    creatingAccount: 'Creating Account...',
    otpSentTo: 'Enter the 6-digit verification code sent to',
    oneMobileNote: 'One verified mobile number maps to one RaithaMitra account and role.',
    smsPendingNote: 'Demo / local OTP verification workflow is active. Enter your 6-digit code below.',
    unableSendOtp: 'Unable to send OTP.',
    invalidOtp: 'Invalid verification code.',
    enterFullNameErr: 'Please enter your full name.',
    regFailedErr: 'Registration failed.',
    countryCodeAria: 'Country code',
  },
  kn: {
    enterMobile: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ',
    sendOtp: 'OTP ಯೊಂದಿಗೆ ಮುಂದುವರಿಯಿರಿ',
    sending: 'ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ...',
    verifyOtp: 'OTP ಪರಿಶೀಲಿಸಿ',
    verifying: 'ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...',
    resendOtp: 'OTP ಮರುಕಳುಹಿಸಿ',
    changeNumber: 'ಸಂಖ್ಯೆ ಬದಲಾಯಿಸಿ',
    enterName: 'ನಿಮ್ಮ ಹೆಸರನ್ನು ನಮೂದಿಸಿ',
    exampleName: 'ಉದಾ., ರಮೇಶ್ ಗೌಡ',
    selectRole: 'ನಿಮ್ಮ ಪಾತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    createAccount: 'ಖಾತೆ ರಚಿಸಿ',
    creatingAccount: 'ಖಾತೆ ರಚಿಸಲಾಗುತ್ತಿದೆ...',
    otpSentTo: 'ಕಳುಹಿಸಿದ 6-ಅಂಕಿಯ OTP ಕೋಡ್ ನಮೂದಿಸಿ:',
    oneMobileNote: 'ಒಂದು ದೃಢೀಕೃತ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಒಂದು ರೈತ ಮಿತ್ರ ಖಾತೆಗೆ ಸಂಪರ್ಕಗೊಳ್ಳುತ್ತದೆ.',
    smsPendingNote: 'ಸ್ಥಳೀಯ OTP ಪರಿಶೀಲನಾ ವ್ಯವಸ್ಥೆ ಸಕ್ರಿಯವಾಗಿದೆ. ಕೆಳಗೆ 6-ಅಂಕಿಯ ಕೋಡ್ ನಮೂದಿಸಿ.',
    unableSendOtp: 'OTP ಕಳುಹಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.',
    invalidOtp: 'ತಪ್ಪಾದ OTP ಕೋಡ್. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    enterFullNameErr: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರನ್ನು ನಮೂದಿಸಿ.',
    regFailedErr: 'ಖಾತೆ ನೋಂದಣಿ ವಿಫಲವಾಗಿದೆ.',
    countryCodeAria: 'ದೇಶದ ಕೋಡ್',
  },
  hi: {
    enterMobile: 'मोबाइल नंबर दर्ज करें',
    sendOtp: 'OTP के साथ जारी रखें',
    sending: 'भेजा जा रहा है...',
    verifyOtp: 'OTP सत्यापित करें',
    verifying: 'सत्यापन हो रहा है...',
    resendOtp: 'OTP पुनः भेजें',
    changeNumber: 'नंबर बदलें',
    enterName: 'अपना नाम दर्ज करें',
    exampleName: 'उदा., रमेश गौड़ा',
    selectRole: 'अपनी भूमिका चुनें',
    createAccount: 'खाता पूरा करें',
    creatingAccount: 'खाता बनाया जा रहा है...',
    otpSentTo: 'भेजा गया 6-अंकीय सत्यापन कोड दर्ज करें:',
    oneMobileNote: 'एक सत्यापित मोबाइल नंबर एक रैत मित्र खाते और भूमिका से जुड़ता है।',
    smsPendingNote: 'स्थानीय OTP सत्यापन सक्रिय है। नीचे अपना 6-अंकीय कोड दर्ज करें।',
    unableSendOtp: 'OTP भेजने में असमर्थ।',
    invalidOtp: 'अमान्य सत्यापन कोड। कृपया पुनः प्रयास करें।',
    enterFullNameErr: 'कृपया अपना पूरा नाम दर्ज करें।',
    regFailedErr: 'पंजीकरण विफल रहा।',
    countryCodeAria: 'देश कोड',
  },
  te: {
    enterMobile: 'మొబైల్ నంబర్ నమోదు చేయండి',
    sendOtp: 'OTP తో కొనసాగండి',
    sending: 'పంపిస్తోంది...',
    verifyOtp: 'OTP ధృవీకరించండి',
    verifying: 'ధృవీకరిస్తోంది...',
    resendOtp: 'OTP మళ్ళీ పంపండి',
    changeNumber: 'నంబర్ మార్చండి',
    enterName: 'మీ పేరు నమోదు చేయండి',
    exampleName: 'ఉదా., రమేష్ గౌడ',
    selectRole: 'మీ పాత్రను ఎంచుకోండి',
    createAccount: 'నమోదు పూర్తి చేయండి',
    creatingAccount: 'ఖాతా సృష్టించబడుతోంది...',
    otpSentTo: 'పంపిన 6-అంకెల OTP కోడ్‌ను నమోదు చేయండి:',
    oneMobileNote: 'ఒక ధృవీకరించబడిన మొಬೈల్ నంబర్ ఒక రైతు మిత్ర ఖాతాకు అనుసంధానించబడుతుంది.',
    smsPendingNote: 'స్థానిక OTP ధృవీకరణ సక్రియంగా ఉంది. క్రింద 6-అంకెల కోడ్ నమోదు చేయండి.',
    unableSendOtp: 'OTP పంపడం సాధ్యం కాలేదు.',
    invalidOtp: 'చెల్లని ధృవీకరణ కోడ్. మళ్ళీ ప్రయత్నించండి.',
    enterFullNameErr: 'దయచేసి మీ పూర్తి పేరు నమోదు చేయండి.',
    regFailedErr: 'నమోదు విఫలమైంది.',
    countryCodeAria: 'దేశపు కోడ్',
  },
};

import { AGRI_IMAGE_ASSETS } from '@/components/premium-ui/shared/AgriImage';
const ROLE_CARDS: { role: UserRole; titleKey: string; descKey: string; image: string; icon: any }[] = [
  {
    role: 'farmer',
    titleKey: 'roleFarmer',
    descKey: 'planBeforePlantDesc',
    image: AGRI_IMAGE_ASSETS.roleFarmer,
    icon: Sprout,
  },
  {
    role: 'buyer',
    titleKey: 'roleBuyer',
    descKey: 'smartBiddingDesc',
    image: AGRI_IMAGE_ASSETS.roleBuyer,
    icon: Building2,
  },
  {
    role: 'labour',
    titleKey: 'roleLabour',
    descKey: 'labourConnectDesc',
    image: AGRI_IMAGE_ASSETS.roleLabour,
    icon: Users,
  },
  {
    role: 'driver',
    titleKey: 'roleDriver',
    descKey: 'transportConnectDesc',
    image: AGRI_IMAGE_ASSETS.roleDriver,
    icon: Truck,
  },
];

export function MobileOtpFlow() {
  const router = useRouter();
  const { sendOtp, verifyOtp, registerWithOtp, language, t: translateGlobal, setIsOnboardingOpen } = useFarm();
  const t = OTP_LABELS[(language as OtpLang) || 'en'] || OTP_LABELS.en;

  const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [smsConfigured, setSmsConfigured] = useState<boolean>(true);
  const [verificationToken, setVerificationToken] = useState('');

  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('farmer');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  // WebOTP API where supported (never fails if unsupported)
  useEffect(() => {
    if (step !== 'otp' || typeof window === 'undefined' || !('OTPCredential' in window)) return;
    const ac = new AbortController();
    (navigator.credentials as any)
      ?.get({ otp: { transport: ['sms'] }, signal: ac.signal })
      .then((cred: any) => {
        if (cred?.code && /^\d{6}$/.test(cred.code)) {
          setOtp(cred.code);
        }
      })
      .catch(() => {});
    return () => ac.abort();
  }, [step]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setBusy(true);
    const res = await sendOtp(phone, countryCode);
    setBusy(false);
    if (!res.success) {
      setError(res.error || t.unableSendOtp);
      return;
    }
    setMaskedPhone(res.masked_phone || phone);
    setCooldown(res.cooldown_seconds || 30);
    setSmsConfigured(Boolean(res.sms_configured));
    setStep('otp');
  };

  const handleVerifyOtp = async (codeOverride?: string) => {
    const code = (codeOverride ?? otp).trim();
    if (code.length !== 6 || verifyingRef.current) return;
    verifyingRef.current = true;
    setError(null);
    setBusy(true);
    const res = await verifyOtp(phone, code, countryCode);
    setBusy(false);
    verifyingRef.current = false;

    if (!res.success) {
      setError(res.error || t.invalidOtp);
      return;
    }

    if (res.status === 'authenticated') {
      router.push(res.redirect_url || '/');
      return;
    }

    setVerificationToken(res.verification_token || '');
    setStep('profile');
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError(t.enterFullNameErr);
      return;
    }
    setError(null);
    setBusy(true);
    const res = await registerWithOtp({
      verification_token: verificationToken,
      name: name.trim(),
      role,
      preferred_language: language,
    });
    setBusy(false);
    if (!res.success) {
      setError(res.error || t.regFailedErr);
      return;
    }
    if (role === 'farmer') {
      setIsOnboardingOpen(true);
    }
    router.push(res.redirect_url || '/');
  };

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {step === 'phone' && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#20372A] dark:text-zinc-300 mb-1.5">
              {t.enterMobile}
            </label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                aria-label={t.countryCodeAria}
                className="w-24 px-2.5 py-2.5 rounded-xl border border-[#DCD8CA] dark:border-zinc-700 bg-[#F7F5ED] dark:bg-zinc-900 text-xs font-semibold"
              >
                <option value="+91">🇮🇳 +91</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
              </select>
              <div className="relative flex-1">
                <Phone className="w-4 h-4 text-[#8D7357] absolute left-3 top-3" />
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="98450 12345"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#DCD8CA] dark:border-zinc-700 bg-[#F7F5ED] dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#36784D]"
                />
              </div>
            </div>
            <p className="text-[11px] text-[#8D7357] mt-1.5">
              {t.oneMobileNote}
            </p>
          </div>

          <button
            type="submit"
            disabled={busy || phone.trim().length < 10}
            className="w-full py-3 rounded-xl bg-[#173C2B] hover:bg-[#102D20] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {busy ? t.sending : t.sendOtp} <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {step === 'otp' && (
        <div className="space-y-4">
          <div className="text-xs text-[#20372A] dark:text-zinc-300">
            {t.otpSentTo} <strong>{maskedPhone}</strong>
          </div>

          {!smsConfigured && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
              {t.smsPendingNote}
            </div>
          )}

          <div>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtp(digits);
                if (digits.length === 6) {
                  handleVerifyOtp(digits);
                }
              }}
              placeholder="••••••"
              className="w-full text-center tracking-[0.5em] text-xl font-bold py-3 rounded-xl border border-[#DCD8CA] dark:border-zinc-700 bg-[#F7F5ED] dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#36784D]"
            />
          </div>

          <button
            type="button"
            disabled={busy || otp.length !== 6}
            onClick={() => handleVerifyOtp()}
            className="w-full py-3 rounded-xl bg-[#173C2B] hover:bg-[#102D20] text-white text-sm font-semibold transition disabled:opacity-50"
          >
            {busy ? t.verifying : t.verifyOtp}
          </button>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              disabled={cooldown > 0 || busy}
              onClick={() => handleSendOtp()}
              className="inline-flex items-center gap-1 font-semibold text-[#36784D] disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {cooldown > 0 ? `${t.resendOtp} (${cooldown}s)` : t.resendOtp}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setOtp('');
                setError(null);
              }}
              className="text-[#8D7357] hover:underline"
            >
              {t.changeNumber}
            </button>
          </div>
        </div>
      )}

      {step === 'profile' && (
        <form onSubmit={handleCompleteRegistration} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#20372A] dark:text-zinc-300 mb-1">
              {t.enterName}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.exampleName}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCD8CA] dark:border-zinc-700 bg-[#F7F5ED] dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#36784D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#20372A] dark:text-zinc-300 mb-2">
              {t.selectRole}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {ROLE_CARDS.map((card) => {
                const Icon = card.icon;
                const selected = role === card.role;
                const roleTitle = translateGlobal(card.titleKey);
                const roleDesc = translateGlobal(card.descKey);
                return (
                  <button
                    key={card.role}
                    type="button"
                    onClick={() => setRole(card.role)}
                    className={`relative text-left rounded-xl overflow-hidden border-2 transition ${
                      selected ? 'border-[#173C2B] ring-2 ring-[#36784D]/25' : 'border-[#DCD8CA] dark:border-zinc-800'
                    }`}
                  >
                    <div className="h-16 relative overflow-hidden">
                      <img src={card.image} alt={roleTitle} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-[#102D20]/45" />
                      {selected && (
                        <CheckCircle2 className="w-4 h-4 text-white absolute top-1.5 right-1.5" />
                      )}
                    </div>
                    <div className="p-2.5 bg-white dark:bg-zinc-950">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#20372A] dark:text-white">
                        <Icon className="w-3.5 h-3.5 text-[#36784D]" />
                        {roleTitle}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">{roleDesc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={busy || name.trim().length < 2}
            className="w-full py-3 rounded-xl bg-[#173C2B] hover:bg-[#102D20] text-white text-sm font-semibold transition disabled:opacity-50"
          >
            {busy ? t.creatingAccount : t.createAccount}
          </button>
        </form>
      )}
    </div>
  );
}
