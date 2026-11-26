// frontend/src/app/passport/[batchCode]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, PackageCheck, ShieldCheck } from 'lucide-react';

export default function PublicPassportPage() {
  const params = useParams<{ batchCode: string }>();
  const batchCode = params?.batchCode || '';
  const [passport, setPassport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!batchCode) return;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
    fetch(`${baseUrl}/post-harvest/passports/public/${encodeURIComponent(batchCode)}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || 'Produce passport not found.');
        }
        return res.json();
      })
      .then(setPassport)
      .catch((e) => setError(e?.message || 'Unable to verify batch passport.'));
  }, [batchCode]);

  if (error) {
    return (
      <div className="max-w-xl mx-auto p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
        {error}
      </div>
    );
  }

  if (!passport) {
    return (
      <div className="max-w-xl mx-auto p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500">
        Verifying produce batch passport...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
            <ShieldCheck className="w-5 h-5" />
            <span>RaithaMitra Produce Batch Passport</span>
          </div>
          {passport.is_demonstration && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
              DEMONSTRATION BATCH
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          {passport.crop_name} {passport.variety ? `(${passport.variety})` : ''}
        </h1>
        <div className="grid grid-cols-2 gap-3 text-xs text-zinc-600 dark:text-zinc-400 pt-2">
          <div><strong>Batch Code:</strong> {passport.batch_code}</div>
          <div><strong>Origin Region:</strong> {passport.origin_region}</div>
          <div><strong>Harvest Date:</strong> {passport.harvest_date}</div>
          <div><strong>Quantity:</strong> {Number(passport.quantity_kg).toLocaleString('en-IN')} kg</div>
          {passport.packaging_summary && (
            <div className="col-span-2"><strong>Packaging:</strong> {passport.packaging_summary}</div>
          )}
          {passport.storage_conditions && (
            <div className="col-span-2"><strong>Storage Conditions:</strong> {passport.storage_conditions}</div>
          )}
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <PackageCheck className="w-4 h-4 text-emerald-700" /> Recorded Supply Chain Milestones
        </h2>
        <div className="space-y-2">
          {(passport.milestones || []).map((m: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900">
              <span className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {m.stage}
              </span>
              <span className="text-zinc-500 capitalize">{m.status} · {m.timestamp}</span>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 break-all">
          <strong>Integrity Verification ({passport.integrity_verification_method}):</strong>{' '}
          {passport.integrity_hash}
        </div>
      </div>
    </div>
  );
}
