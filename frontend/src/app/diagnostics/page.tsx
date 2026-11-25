// frontend/src/app/diagnostics/page.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import {
  analyzeCropLeaves,
  CropDiagnosticResult,
  DiagnosticHistoryItem,
  fetchCropDiagnosticsStatus,
  fetchDiagnosticHistory,
  MultiImageDiagnosticResponse,
  submitCommunityDiseaseReport,
} from '@/lib/cropDiagnosticsApi';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  CloudSun,
  Dna,
  History,
  Info,
  Microscope,
  RotateCw,
  ShieldAlert,
  Sprout,
  Upload,
  Volume2,
  X,
} from 'lucide-react';

const UI_STRINGS: Record<string, Record<string, string>> = {
  en: {
    title: 'RaithaMitra AI Crop Doctor',
    tagline: 'Detect Early. Protect Crops. Reduce Losses.',
    analyze: 'Analyze Crop',
    readAloud: 'Read Diagnosis Aloud',
    autoCrop: 'Auto-detect Crop (Recommended)',
    healthy: 'Healthy Leaf',
    diseased: 'Suspected Disease',
    uncertain: 'Uncertain Result',
  },
  kn: {
    title: 'ರೈತ ಮಿತ್ರ AI ಬೆಳೆ ವೈದ್ಯ',
    tagline: 'ಬೇಗ ಪತ್ತೆ ಹಚ್ಚಿ. ಬೆಳೆ ರಕ್ಷಿಸಿ. ನಷ್ಟ ಕಡಿಮೆ ಮಾಡಿ.',
    analyze: 'ಬೆಳೆ ಪರೀಕ್ಷಿಸಿ',
    readAloud: 'ಫಲಿತಾಂಶವನ್ನು ಕೇಳಿ',
    autoCrop: 'ಸ್ವಯಂಚಾಲಿತ ಬೆಳೆ ಗುರುತಿಸುವಿಕೆ',
    healthy: 'ಆರೋಗ್ಯಕರ ಎಲೆ',
    diseased: 'ಶಂಕಿತ ರೋಗ',
    uncertain: 'ಅನಿಶ್ಚಿತ ಫಲಿತಾಂಶ',
  },
  hi: {
    title: 'रैत मित्र AI फसल डॉक्टर',
    tagline: 'जल्दी पहचानें। फसल बचाएं। नुकसान कम करें।',
    analyze: 'फसल की जांच करें',
    readAloud: 'निदान सुनें',
    autoCrop: 'स्वचालित फसल पहचान',
    healthy: 'स्वस्थ पत्ती',
    diseased: 'संभावित रोग',
    uncertain: 'अनिश्चित परिणाम',
  },
  te: {
    title: 'రైతు మిత్ర AI పంట డాక్టర్',
    tagline: 'ముందుగా గుర్తించండి. పంటను కాపాడండి.',
    analyze: 'పంటను పరీక్షించండి',
    readAloud: 'నిర్ధారణ వినండి',
    autoCrop: 'ఆటోమేటిక్ పంట గుర్తింపు',
    healthy: 'ఆరోగ్యకరమైన ఆకు',
    diseased: 'అనుమానిత వ్యాధి',
    uncertain: 'అనిశ్చిత ఫలితం',
  },
};

export default function DiagnosticsPage() {
  const { currentFarm, currentUser, weather, language } = useFarm();
  const s = UI_STRINGS[language] || UI_STRINGS.en;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [supportedCrops, setSupportedCrops] = useState<string[]>([
    'Tomato',
    'Potato',
    'Corn (Maize)',
    'Bell Pepper',
    'Grape',
    'Apple',
  ]);
  const [modelMeta, setModelMeta] = useState<{
    model_available: boolean;
    model_name?: string;
    model_version?: string;
    sha256?: string;
  } | null>(null);

  const [selectedCrop, setSelectedCrop] = useState<string>('auto');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [multiResult, setMultiResult] = useState<MultiImageDiagnosticResponse | null>(null);
  const [history, setHistory] = useState<DiagnosticHistoryItem[]>([]);
  const [reportPending, setReportPending] = useState<boolean>(false);
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  const authToken =
    typeof window !== 'undefined' ? window.localStorage.getItem('rm_auth_token') : null;

  useEffect(() => {
    fetchCropDiagnosticsStatus().then((st) => {
      if (st) {
        setModelMeta(st);
        if (st.supported_crops?.length) setSupportedCrops(st.supported_crops);
      }
    });
  }, []);

  useEffect(() => {
    if (authToken) {
      fetchDiagnosticHistory(authToken).then(setHistory);
    } else {
      setHistory([]);
    }
  }, [authToken, currentUser.id]);

  const handleFilesSelected = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    setValidationError(null);
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const nextFiles: File[] = [...files];

    for (let i = 0; i < incoming.length && nextFiles.length < 3; i++) {
      const f = incoming[i];
      if (!allowed.includes(f.type.toLowerCase())) {
        setValidationError(`Unsupported format "${f.name}". Use JPEG, PNG, or WEBP.`);
        continue;
      }
      if (f.size > 10 * 1024 * 1024) {
        setValidationError(`"${f.name}" exceeds the 10 MB limit.`);
        continue;
      }
      nextFiles.push(f);
    }
    setFiles(nextFiles);
    setPreviews(nextFiles.map((f) => URL.createObjectURL(f)));
    setMultiResult(null);
    setReportStatus(null);
  };

  const removeFile = (idx: number) => {
    const next = files.filter((_, i) => i !== idx);
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
    setMultiResult(null);
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      setValidationError('Please upload or capture at least one leaf photo (up to 3).');
      return;
    }
    setValidationError(null);
    setIsLoading(true);
    try {
      const res = await analyzeCropLeaves({
        files,
        crop: selectedCrop,
        farmId: currentFarm?.id,
        token: authToken,
        temperatureC: weather?.current?.temperature_c,
        humidityPct: weather?.current?.relative_humidity_pct,
        rainfallMm: weather?.current?.precipitation_mm,
      });
      setMultiResult(res);
      if (authToken) {
        fetchDiagnosticHistory(authToken).then(setHistory);
      }
    } catch (err: any) {
      setValidationError(err?.message || 'Diagnostics analysis failed. Check backend connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const primary: CropDiagnosticResult | undefined = multiResult?.primary_result;

  const handleReadAloud = () => {
    if (!primary || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const parts: string[] = [];
    if (primary.crop) parts.push(`Crop: ${primary.crop}.`);
    if (primary.predicted_disease) {
      const pct = primary.confidence ? `${Math.round(primary.confidence * 100)} percent` : '';
      parts.push(`Diagnosis: ${primary.predicted_disease} (${pct}).`);
    }
    if (primary.uncertainty) parts.push(primary.uncertainty);
    if (primary.recommended_actions?.length) {
      parts.push(`Recommended actions: ${primary.recommended_actions.slice(0, 2).join('. ')}`);
    }
    const utt = new SpeechSynthesisUtterance(parts.join(' '));
    utt.lang = language === 'kn' ? 'kn-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
    window.speechSynthesis.speak(utt);
  };

  const handleConfirmSurveillance = async () => {
    if (!authToken || !primary?.crop || !primary?.predicted_disease) return;
    setReportPending(true);
    try {
      const region = currentFarm?.district || 'Mandya';
      await submitCommunityDiseaseReport(authToken, {
        crop: primary.crop,
        suspected_disease: primary.predicted_disease,
        region,
        confidence: primary.confidence,
        user_confirmed: true,
      });
      setReportStatus(`Reported AI-suspected observation for ${region} region (labeled unverified).`);
    } catch (err: any) {
      setReportStatus(err?.message || 'Unable to submit report.');
    } finally {
      setReportPending(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl border border-[#DCD8CA] dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-[#173C2B] text-white">
            <Microscope className="w-6 h-6 text-[#86efac]" />
          </div>
          <div>
            <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#20372A] dark:text-white">
              {s.title}
            </h1>
            <p className="text-xs text-[#8D7357] dark:text-zinc-400 font-medium">{s.tagline}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span
            className={`px-2.5 py-1 rounded-full font-semibold border ${
              modelMeta?.model_available
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {modelMeta?.model_available ? 'Offline ONNX Ready (38 Classes)' : 'Checking Model...'}
          </span>
        </div>
      </div>

      {/* Section A & B: Upload/Scan + Diagnosis Result */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Section A — Upload and Scan */}
        <div className="lg:col-span-5 p-6 bg-white dark:bg-zinc-950 border border-[#DCD8CA] dark:border-zinc-800 rounded-2xl shadow-sm space-y-4 text-xs">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#20372A] dark:text-white">1. Upload Leaf Photos (1–3)</h2>
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              aria-label="Select crop"
              className="p-2 rounded-xl bg-[#F7F5ED] dark:bg-zinc-900 border border-[#DCD8CA] dark:border-zinc-700 text-xs font-medium"
            >
              <option value="auto">{s.autoCrop}</option>
              {supportedCrops.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#DCD8CA] dark:border-zinc-700 rounded-2xl p-6 text-center space-y-2 cursor-pointer hover:border-[#36784D] transition bg-[#F7F5ED]/60 dark:bg-zinc-900/40"
          >
            <Upload className="w-7 h-7 mx-auto text-[#36784D]" />
            <p className="font-semibold text-[#20372A] dark:text-zinc-200">
              Click to upload leaf photo(s) (JPEG, PNG, WEBP · max 3 images)
            </p>
            <p className="text-[11px] text-zinc-500">
              Whole leaf, close-up lesion, or a second affected leaf in natural daylight.
            </p>
          </div>

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="w-full py-2 rounded-xl border border-[#DCD8CA] dark:border-zinc-700 text-[#20372A] dark:text-zinc-200 font-semibold flex items-center justify-center gap-2 hover:bg-[#F7F5ED] dark:hover:bg-zinc-900"
          >
            <Camera className="w-4 h-4 text-[#36784D]" />
            Use Camera Capture
          </button>

          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((url, idx) => (
                <div key={url} className="relative rounded-xl overflow-hidden border border-[#DCD8CA] dark:border-zinc-800 h-24">
                  <img src={url} alt={`Leaf ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    aria-label={`Remove image ${idx + 1}`}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/65 text-white hover:bg-black"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {validationError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full py-3 bg-[#173C2B] hover:bg-[#102D20] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition shadow-sm"
          >
            {isLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Microscope className="w-4 h-4" />}
            <span>{isLoading ? 'Running Offline ONNX Inference...' : s.analyze}</span>
          </button>
        </div>

        {/* Section B — Diagnosis Result */}
        <div className="lg:col-span-7 p-6 bg-white dark:bg-zinc-950 border border-[#DCD8CA] dark:border-zinc-800 rounded-2xl shadow-sm space-y-4 text-xs">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#20372A] dark:text-white">2. Diagnosis Result</h2>
            {primary && (
              <button
                type="button"
                onClick={handleReadAloud}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F7F5ED] dark:bg-zinc-900 border border-[#DCD8CA] dark:border-zinc-700 font-semibold text-[#173C2B] dark:text-emerald-300"
              >
                <Volume2 className="w-3.5 h-3.5" />
                {s.readAloud}
              </button>
            )}
          </div>

          {!primary ? (
            <div className="p-6 rounded-xl bg-[#F7F5ED] dark:bg-zinc-900 border border-[#DCD8CA] dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 space-y-2">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#36784D]" />
                <span>
                  Upload 1–3 clear leaf photos and click <strong>{s.analyze}</strong>. Inference runs locally via ONNX Runtime CPU using the verified 38-class PlantVillage MobileNetV2 model.
                </span>
              </div>
              <ul className="list-disc pl-6 space-y-1 text-[11px]">
                <li>Capture one affected leaf in natural daylight.</li>
                <li>Avoid heavy shadows, blur, and busy soil backgrounds.</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Primary Status Card */}
              <div
                className={`p-4 rounded-xl border space-y-2 ${
                  primary.diagnosis_status === 'healthy'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-100'
                    : primary.diagnosis_status === 'diseased'
                      ? 'bg-amber-50 border-amber-200 text-amber-950 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-100'
                      : 'bg-rose-50 border-rose-200 text-rose-950 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-100'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {primary.diagnosis_status === 'healthy' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-amber-600" />
                    )}
                    <span>
                      {primary.crop ? `${primary.crop} — ` : ''}
                      {primary.predicted_disease || s.uncertain}
                    </span>
                  </div>
                  {primary.confidence !== null && primary.confidence !== undefined && (
                    <span className="px-2.5 py-0.5 rounded-full bg-white/80 dark:bg-black/40 font-bold text-[11px]">
                      Model Score: {(primary.confidence * 100).toFixed(1)}%
                    </span>
                  )}
                </div>

                {primary.uncertainty && (
                  <p className="text-xs font-medium">{primary.uncertainty}</p>
                )}

                {multiResult?.disagreement_warning && (
                  <div className="p-2.5 rounded-lg bg-white/70 dark:bg-black/30 border border-amber-300 text-xs font-medium">
                    Multi-image note: {multiResult.disagreement_warning}
                  </div>
                )}
              </div>

              {/* Top 3 Candidates + Image Quality + Severity Honesty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#F7F5ED] dark:bg-zinc-900 border border-[#DCD8CA] dark:border-zinc-800 space-y-2">
                  <div className="font-bold text-[#20372A] dark:text-white">Top Model Candidates</div>
                  {primary.top_predictions.length === 0 ? (
                    <div className="text-zinc-500">No predictions available.</div>
                  ) : (
                    primary.top_predictions.map((cand, i) => (
                      <div key={cand.class_index} className="flex items-center justify-between text-[11px]">
                        <span>
                          {i + 1}. {cand.crop}: <strong>{cand.disease}</strong>
                        </span>
                        <span className="font-semibold">{(cand.score * 100).toFixed(1)}%</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-[#F7F5ED] dark:bg-zinc-900 border border-[#DCD8CA] dark:border-zinc-800 space-y-1.5">
                  <div className="font-bold text-[#20372A] dark:text-white">Image Quality &amp; Severity</div>
                  <div>
                    Quality: <strong className="capitalize">{primary.image_quality?.quality_rating || 'unknown'}</strong>{' '}
                    ({primary.image_quality?.width}×{primary.image_quality?.height}px)
                  </div>
                  <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    Severity: <strong>Unavailable</strong> (classification model only — no fabricated area %)
                  </div>
                  {primary.image_quality?.warnings?.map((w, i) => (
                    <div key={i} className="text-[11px] text-amber-700 dark:text-amber-300">
                      • {w}
                    </div>
                  ))}
                </div>
              </div>

              {/* Expandable Technical Details */}
              <details className="p-3 rounded-xl border border-[#DCD8CA] dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400">
                <summary className="cursor-pointer font-semibold text-[#20372A] dark:text-zinc-200">
                  Technical Model &amp; Limitation Details
                </summary>
                <div className="mt-2 space-y-1">
                  <div>Model: {primary.model_name} ({primary.model_version})</div>
                  {primary.inference_time_ms !== undefined && (
                    <div>CPU Inference Latency: {primary.inference_time_ms} ms</div>
                  )}
                  {modelMeta?.sha256 && <div className="break-all">SHA-256: {modelMeta.sha256}</div>}
                  <ul className="list-disc pl-4 pt-1 space-y-0.5">
                    {primary.limitations?.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* Section D & E: Farmer Guidance, Weather Risk, BioIntel & Community Surveillance */}
      {primary?.knowledge && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
          <div className="lg:col-span-7 p-6 bg-white dark:bg-zinc-950 border border-[#DCD8CA] dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-[#20372A] dark:text-white flex items-center gap-2">
              <Sprout className="w-4 h-4 text-[#36784D]" />
              What Should I Do? — {primary.knowledge.disease_name}
            </h2>

            <div className="space-y-3">
              <div>
                <div className="font-bold text-[#20372A] dark:text-zinc-200">1. What may be affecting the crop?</div>
                <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">{primary.knowledge.symptoms}</p>
              </div>
              <div>
                <div className="font-bold text-[#20372A] dark:text-zinc-200">2. Why could this happen?</div>
                <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">
                  {primary.knowledge.causes} Conditions: {primary.knowledge.favorable_conditions}
                </p>
              </div>
              <div>
                <div className="font-bold text-[#20372A] dark:text-zinc-200">3. What should I do now?</div>
                <ul className="list-disc pl-5 text-zinc-600 dark:text-zinc-400 mt-0.5 space-y-1">
                  {primary.knowledge.immediate_actions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                  {primary.knowledge.biological_options.map((b, i) => (
                    <li key={`bio-${i}`}>{b}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-bold text-[#20372A] dark:text-zinc-200">4. How can future infection be prevented?</div>
                <ul className="list-disc pl-5 text-zinc-600 dark:text-zinc-400 mt-0.5 space-y-1">
                  {primary.knowledge.cultural_practices.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                  {primary.knowledge.preventive_measures.map((p, i) => (
                    <li key={`prev-${i}`}>{p}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-bold text-[#20372A] dark:text-zinc-200">5. When to consult an agricultural expert?</div>
                <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">{primary.knowledge.when_to_consult_expert}</p>
              </div>
              <div className="text-[11px] text-zinc-500 pt-2 border-t border-[#E9E5D8] dark:border-zinc-800">
                Sources:{' '}
                {primary.knowledge.sources.map((src) => `${src.institution} — ${src.title} (${src.verified_on})`).join(' | ')}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            {/* Weather-Aware Disease Risk */}
            <div className="p-5 bg-white dark:bg-zinc-950 border border-[#DCD8CA] dark:border-zinc-800 rounded-2xl shadow-sm space-y-2">
              <div className="font-bold text-sm text-[#20372A] dark:text-white flex items-center gap-2">
                <CloudSun className="w-4 h-4 text-[#C9A35C]" />
                Weather-Aware Disease Risk
              </div>
              <p className="text-zinc-600 dark:text-zinc-400">
                {primary.weather_risk?.summary || 'Live weather unavailable.'}
              </p>
              <p className="text-[11px] text-zinc-500 italic">
                {primary.weather_risk?.disclaimer}
              </p>
            </div>

            {/* BioIntel & Nursery Integration */}
            <div className="p-5 bg-[#F7F5ED] dark:bg-zinc-900 border border-[#DCD8CA] dark:border-zinc-800 rounded-2xl space-y-3">
              <div className="font-bold text-sm text-[#20372A] dark:text-white flex items-center gap-2">
                <Dna className="w-4 h-4 text-[#36784D]" />
                Resistant Varieties &amp; Nurseries
              </div>
              <p className="text-zinc-600 dark:text-zinc-400">
                Explore tolerant seed varieties and certified nurseries for {primary.crop} in BioIntel without altering your current plan.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/biointel?crop=${encodeURIComponent(primary.crop || 'Tomato')}#nurseries`}
                  className="px-3.5 py-2 rounded-xl bg-[#173C2B] text-white font-semibold hover:bg-[#102D20]"
                >
                  Open BioIntel &amp; Nurseries
                </Link>
              </div>
            </div>

            {/* Optional Community Surveillance Reporting */}
            {!primary.is_healthy && authToken && (
              <div className="p-5 bg-white dark:bg-zinc-950 border border-[#DCD8CA] dark:border-zinc-800 rounded-2xl space-y-2.5">
                <div className="font-bold text-sm text-[#20372A] dark:text-white">
                  Optional Community Alert (Region-Level Only)
                </div>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Share an anonymized AI-suspected observation for {currentFarm?.district || 'your district'} (exact farm coordinates stay private).
                </p>
                <button
                  type="button"
                  disabled={reportPending || !!reportStatus}
                  onClick={handleConfirmSurveillance}
                  className="px-3.5 py-2 rounded-xl border border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 font-semibold"
                >
                  {reportPending ? 'Submitting...' : 'Confirm & Report AI-Suspected Event'}
                </button>
                {reportStatus && <div className="text-[11px] text-emerald-700 dark:text-emerald-300">{reportStatus}</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section F — Crop Health History */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-[#DCD8CA] dark:border-zinc-800 rounded-2xl shadow-sm space-y-3 text-xs">
        <div className="flex items-center gap-2 font-bold text-sm text-[#20372A] dark:text-white">
          <History className="w-4 h-4 text-[#36784D]" />
          Crop Health Diagnostic History
        </div>
        {!authToken ? (
          <p className="text-zinc-500">Sign in to save and review your personal farm diagnostic history.</p>
        ) : history.length === 0 ? (
          <p className="text-zinc-500">No diagnostic scans saved for your account yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {history.slice(0, 6).map((item) => (
              <div key={item.id} className="p-3.5 rounded-xl bg-[#F7F5ED] dark:bg-zinc-900 border border-[#DCD8CA] dark:border-zinc-800 space-y-1">
                <div className="font-bold text-[#20372A] dark:text-white">
                  {item.predicted_crop || item.requested_crop} — {item.predicted_disease || item.diagnosis_status}
                </div>
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  Score: {item.confidence !== null && item.confidence !== undefined ? `${(item.confidence * 100).toFixed(1)}%` : 'N/A'} · Quality: {item.image_quality || 'N/A'}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {new Date(item.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
