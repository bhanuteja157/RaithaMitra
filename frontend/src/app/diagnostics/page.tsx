// frontend/src/app/diagnostics/page.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { Microscope, Camera, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function DiagnosticsPage() {
  const { currentFarm } = useFarm();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400">
            <Microscope className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                AI Crop Diagnostics (Offline Vision)
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                Operational Prototype
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Offline MobileNetV2 ONNX inference for leaf pathogen identification without cloud reliance
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            Leaf Pathology Scanner
          </h3>
          <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 text-center space-y-3 cursor-pointer hover:border-rm-primary transition-colors">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 mx-auto text-zinc-600 dark:text-zinc-300">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Capture or Drop Leaf Photo
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Supports JPG/PNG • Runs 100% locally via ONNX Runtime CPU
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            Demonstration Reference Pathology Case
          </h3>
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-zinc-900 dark:text-white">Tomato Early Blight</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Confidence: 94.2%
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              <strong>Pathogen:</strong> Alternaria solani fungus (prevalent during high humidity periods).
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              <strong>Visual Symptoms:</strong> Concentric dark rings on lower mature leaves with chlorotic yellow halo.
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              <strong>Organic Remedy:</strong> Prune affected lower canopy foliage. Apply preventative copper hydroxide or bio-fungicide (Trichoderma viride).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
