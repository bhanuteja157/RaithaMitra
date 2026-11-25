// frontend/src/app/schemes/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useFarm } from '@/context/FarmContext';
import { GovernmentScheme } from '@/types';
import { Award, ExternalLink, FileCheck, CheckCircle2 } from 'lucide-react';

export default function SchemesPage() {
  const { language } = useFarm();
  const [schemes, setSchemes] = useState<GovernmentScheme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSchemes() {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
        const res = await fetch(`${backendUrl}/schemes`);
        if (res.ok) {
          const data = await res.json();
          setSchemes(data);
        }
      } catch (err) {
        console.warn("Using offline schemes cache:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSchemes();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                Government Schemes & Agricultural Knowledge Hub
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                Operational
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Verified central and state agricultural subsidies, credit incentives, and crop insurance
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {schemes.map((scheme) => {
          const localizedTitle = language === 'kn' && scheme.name_kannada ? scheme.name_kannada : language === 'hi' && scheme.name_hindi ? scheme.name_hindi : scheme.name;
          return (
            <div
              key={scheme.id}
              className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {scheme.category}
                  </span>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    {localizedTitle}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Nodal Agency: {scheme.nodal_agency}
                  </p>
                </div>
                <a
                  href={scheme.application_portal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rm-primary text-white hover:bg-rm-dark self-start transition-colors shadow-sm"
                >
                  <span>Official Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {scheme.objective}
              </p>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs space-y-2">
                <div className="text-zinc-800 dark:text-zinc-200 font-semibold">
                  Financial Benefit: <span className="font-normal text-zinc-600 dark:text-zinc-400">{scheme.financial_benefit}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-400 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                  <div>
                    <span className="font-semibold block text-zinc-700 dark:text-zinc-300 mb-0.5">Eligibility:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {scheme.eligibility_criteria.map((el, i) => (
                        <li key={i}>{el}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="font-semibold block text-zinc-700 dark:text-zinc-300 mb-0.5">Required Documents:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {scheme.required_documents.map((doc, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px]">
                          {doc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
