// frontend/src/app/driver/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFarm } from '@/context/FarmContext';

export default function DriverRedirect() {
  const router = useRouter();
  const { language } = useFarm();
  useEffect(() => {
    router.replace('/dashboard/driver');
  }, [router]);

  const msg =
    language === 'kn'
      ? 'ಸಾರಿಗೆ ಚಾಲಕ ಕನ್ಸೋಲ್‌ಗೆ ಮರುನಿರ್ದೇಶಿಸಲಾಗುತ್ತಿದೆ...'
      : language === 'hi'
        ? 'परिवहन चालक कंसोल पर ले जाया जा रहा है...'
        : language === 'te'
          ? 'రవాణా డ్రైవర్ కన్సోల్‌కు మళ్లించబడుతోంది...'
          : 'Redirecting to Logistics Driver Console...';

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-2">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" />
        <p className="text-xs text-zinc-500">{msg}</p>
      </div>
    </div>
  );
}
