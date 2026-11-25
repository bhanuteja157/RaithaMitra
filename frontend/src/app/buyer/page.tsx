// frontend/src/app/buyer/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFarm } from '@/context/FarmContext';

export default function BuyerRedirect() {
  const router = useRouter();
  const { language } = useFarm();
  useEffect(() => {
    router.replace('/dashboard/buyer');
  }, [router]);

  const msg =
    language === 'kn'
      ? 'ಸಗಟು ಖರೀದಿದಾರರ ಮಾರುಕಟ್ಟೆಗೆ ಮರುನಿರ್ದೇಶಿಸಲಾಗುತ್ತಿದೆ...'
      : language === 'hi'
        ? 'थोक खरीदार पोर्टल पर ले जाया जा रहा है...'
        : language === 'te'
          ? 'టోకు కొనుగోలుదారు పోర్టల్‌కు మళ్లించబడుతోంది...'
          : 'Redirecting to Wholesale Buyer Marketplace...';

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-2">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto" />
        <p className="text-xs text-zinc-500">{msg}</p>
      </div>
    </div>
  );
}
