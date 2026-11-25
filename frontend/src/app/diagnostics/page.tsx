// frontend/src/app/diagnostics/page.tsx
'use client';

import React, { useState, useRef } from 'react';
import { useFarm } from '@/context/FarmContext';
import {
  analyzeCropLeafImage,
  ScientificModuleOutput,
  MODULE_TRANSLATIONS,
} from '@/lib/scientificApi';
import { Microscope, Upload, AlertCircle, RotateCw, Info } from 'lucide-react';

export default function DiagnosticsPage() {
  const { currentFarm, language } = useFarm();
  const mt = MODULE_TRANSLATIONS[language] || MODULE_TRANSLATIONS.en;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<string>('Tomato');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [output, setOutput] = useState<ScientificModuleOutput | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setValidationError(null);
    setOutput(null);
    if (!file) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type.toLowerCase())) {
      setValidationError('Unsupported file type. Please upload a JPEG, PNG, or WEBP leaf image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setValidationError('Image file exceeds 10 MB limit.');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setValidationError('Please select a leaf image first.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await analyzeCropLeafImage(selectedFile, selectedCrop, currentFarm?.id);
      setOutput(res);
    } finally {
      setIsLoading(false);
    }
  };

  const r = output?.results;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400">
            <Microscope className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                AI Crop Diagnostics (ONNX Vision)
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                Strict Model Guard
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Leaf image validation and ONNX Runtime inference (returns unavailable state if no verified model is present)
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Upload Leaf Image</h3>
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            >
              <option value="Tomato">Tomato (Planned ONNX Model)</option>
            </select>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-6 text-center space-y-2 cursor-pointer hover:border-green-700 transition"
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Leaf preview"
                className="max-h-48 mx-auto rounded-lg object-contain"
              />
            ) : (
              <>
                <Upload className="w-7 h-7 mx-auto text-zinc-400" />
                <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Click to upload leaf photo (JPEG, PNG, WEBP up to 10 MB)
                </p>
              </>
            )}
          </div>

          {validationError && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full py-2.5 bg-green-800 hover:bg-green-700 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 transition"
          >
            {isLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Microscope className="w-4 h-4" />}
            {mt.analyze}
          </button>
        </div>

        <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4 text-xs">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Diagnostic Output</h3>

          {!output ? (
            <div className="p-6 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Upload a leaf image and click {mt.analyze}. Predictions are never randomly generated when an authorized ONNX model file is absent.
              </span>
            </div>
          ) : !r?.model_available ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2 text-amber-900 dark:text-amber-200">
              <div className="font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Model Inference Unavailable ({output.data_quality})
              </div>
              <p>{r?.unavailable_reason || r?.validation_error}</p>
              <div className="text-[11px] opacity-80">
                <strong>{mt.sourceLabel}:</strong> {output.source}
              </div>
              <ul className="list-disc pl-4 space-y-1 pt-1">
                {output.recommended_actions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              Inference completed for {r.crop}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
