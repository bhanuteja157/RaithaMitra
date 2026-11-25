// frontend/src/app/driver/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DriverRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/driver');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-2">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" />
        <p className="text-xs text-zinc-500">Redirecting to Logistics Driver Console...</p>
      </div>
    </div>
  );
}
