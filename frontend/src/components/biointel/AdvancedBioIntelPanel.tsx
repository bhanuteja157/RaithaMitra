// frontend/src/components/biointel/AdvancedBioIntelPanel.tsx
'use client';

import React, { useState } from 'react';
import { useFarm } from '@/context/FarmContext';
import {
  runUnifiedBioIntelWorkflow,
  UnifiedBioIntelResponse,
} from '@/lib/biointelAdvancedApi';
import {
  Dna,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RotateCw,
  ShieldCheck,
  Database,
  Truck,
  BookOpen,
  Award,
} from 'lucide-react';

export function AdvancedBioIntelPanel({ selectedCrop }: { selectedCrop: string }) {
  const { currentFarm, language } = useFarm();

  const [seedlingsQty, setSeedlingsQty] = useState<number>(5000);
  const [budgetInr, setBudgetInr] = useState<number>(15000);
  const [areaAcres, setAreaAcres] = useState<number>(2.0);
  const [waterAvail, setWaterAvail] = useState<'Limited / Low' | 'Moderate / Adequate' | 'Abundant / Canal'>('Limited / Low');

  const [data, setData] = useState<UnifiedBioIntelResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showGenomics, setShowGenomics] = useState<boolean>(false);
  const [showValidation, setShowValidation] = useState<boolean>(false);
  const [showProviders, setShowProviders] = useState<boolean>(false);

  const handleRunUnified = async (isJudgesDemo = false) => {
    setIsLoading(true);
    const crop = isJudgesDemo ? 'Tomato' : selectedCrop;
    const qty = isJudgesDemo ? 5000 : seedlingsQty;
    const budget = isJudgesDemo ? 15000 : budgetInr;
    const acres = isJudgesDemo ? 2.0 : areaAcres;
    if (isJudgesDemo) {
      setSeedlingsQty(5000);
      setBudgetInr(15000);
      setAreaAcres(2.0);
      setWaterAvail('Limited / Low');
    }
    try {
      const res = await runUnifiedBioIntelWorkflow({
        farm_id: currentFarm?.id || 'farm_001',
        farmer_name: currentFarm?.farmer_name || 'Suresh Gowda',
        latitude: currentFarm?.latitude || 12.5234,
        longitude: currentFarm?.longitude || 76.8976,
        crop_name: crop,
        farm_area_ha: Number((acres * 0.4047).toFixed(3)),
        required_seedlings: qty,
        farmer_budget_inr: budget,
        water_availability: isJudgesDemo ? 'Limited / Low' : waterAvail,
        previous_crop_diseases: ['Bacterial Wilt', 'Tomato Leaf Curl Virus'],
        soil_type: currentFarm?.soil_type || 'Red Sandy Loam',
        soil_ph: 6.5,
        language,
        include_genomics: true,
        allow_demo_inventory: true,
        search_radius_km: 50,
      });
      setData(res);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-5 bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-900/50 rounded-3xl shadow-sm space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              Unified Scientific & OR-Tools Procurement Intelligence
            </h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              12-Provider Pipeline
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            GBIF Species Validation → Europe PMC / NCBI / Ensembl → Climate & Soil → Indian ICAR Evidence → OR-Tools CP-SAT Optimization
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleRunUnified(true)}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition shadow-sm"
          >
            Run Judges&apos; Demo (2 Acres Tomato, 5k Seedlings)
          </button>
          <button
            onClick={() => handleRunUnified(false)}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-green-800 hover:bg-green-700 text-white font-semibold text-xs flex items-center gap-1.5 transition"
          >
            {isLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Dna className="w-4 h-4" />}
            Run Unified Analysis
          </button>
        </div>
      </div>

      {/* Quick Parameter Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block text-zinc-500 mb-1">Cultivation Area (Acres)</label>
          <input
            type="number"
            step="0.5"
            min="0.25"
            value={areaAcres}
            onChange={(e) => setAreaAcres(parseFloat(e.target.value) || 1)}
            className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
          />
        </div>
        <div>
          <label className="block text-zinc-500 mb-1">Required Seedlings</label>
          <input
            type="number"
            step="500"
            min="100"
            value={seedlingsQty}
            onChange={(e) => setSeedlingsQty(parseInt(e.target.value) || 1000)}
            className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
          />
        </div>
        <div>
          <label className="block text-zinc-500 mb-1">Procurement Budget (₹)</label>
          <input
            type="number"
            step="1000"
            min="500"
            value={budgetInr}
            onChange={(e) => setBudgetInr(parseFloat(e.target.value) || 5000)}
            className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
          />
        </div>
        <div>
          <label className="block text-zinc-500 mb-1">Water Availability</label>
          <select
            value={waterAvail}
            onChange={(e) => setWaterAvail(e.target.value as any)}
            className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
          >
            <option value="Limited / Low">Limited / Low</option>
            <option value="Moderate / Adequate">Moderate / Adequate</option>
            <option value="Abundant / Canal">Abundant / Canal</option>
          </select>
        </div>
      </div>

      {data && (
        <div className="space-y-4">
          {/* Grounded Summary & Species Validation */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {data.species_validation.input_crop_name} — <em>{data.species_validation.accepted_scientific_name}</em>
                {data.species_validation.taxon_key && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white dark:bg-zinc-900 border border-emerald-200">
                    GBIF #{data.species_validation.taxon_key}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-emerald-600 text-white">
                Evidence Quality: {data.evidence_quality}
              </span>
            </div>
            <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">{data.grounded_explanation}</p>
          </div>

          {/* Climate, Soil & OR-Tools Procurement Plan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 space-y-1.5">
              <div className="font-bold text-zinc-900 dark:text-white">Climate & Irrigation</div>
              <div>Temp: {data.climate_suitability.current_temperature_c}°C • ET0: {data.climate_suitability.et0_mm_day} mm/day</div>
              <div className="text-zinc-500">{data.climate_suitability.planting_suitability}</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 space-y-1.5">
              <div className="font-bold text-zinc-900 dark:text-white">Soil Compatibility</div>
              <div>{data.soil_suitability.soil_texture} (pH {data.soil_suitability.soil_ph ?? 'N/A'})</div>
              <div className="text-zinc-500">Quality: {data.soil_suitability.data_quality}</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 space-y-1.5">
              <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-green-700" />
                OR-Tools CP-SAT Plan ({data.procurement_plan.optimization_status})
              </div>
              <div className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                Total: ₹{data.procurement_plan.total_procurement_cost_inr.toLocaleString('en-IN')}
              </div>
              <div className="text-zinc-500">
                Fulfilled: {data.procurement_plan.fulfilled_quantity.toLocaleString('en-IN')} / {data.procurement_plan.required_quantity.toLocaleString('en-IN')} •{' '}
                {data.budget_feasibility ? 'Within Budget' : 'Exceeds Budget'}
              </div>
            </div>
          </div>

          {/* OR-Tools Supplier Allocations Table */}
          {data.procurement_plan.allocations.length > 0 && (
            <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
              <div className="font-bold text-zinc-900 dark:text-white">Optimized Supplier Allocations</div>
              {data.procurement_plan.allocations.map((al, i) => (
                <div key={i} className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <div>
                    <span className="font-bold">{al.nursery_name}</span> — {al.variety_name}
                    {al.is_demo && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                        Demo Data
                      </span>
                    )}
                    <div className="text-[11px] text-zinc-500">
                      Qty: {al.quantity_allocated.toLocaleString('en-IN')} × ₹{al.unit_price_inr} • {al.distance_km} km ({al.distance_type})
                    </div>
                  </div>
                  <div className="text-right font-bold text-emerald-700 dark:text-emerald-400">
                    ₹{al.subtotal_inr.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Expandable Panel 1: Indian Evidence & National Nursery Portal */}
          {data.indian_agricultural_evidence.length > 0 && (
            <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
              <div className="font-bold text-zinc-900 dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-green-700" />
                  Indian Official Cultivar Releases (ICAR / IIHR)
                </span>
                <a
                  href={data.national_nursery_portal.portal_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-700 dark:text-green-400 hover:underline flex items-center gap-1"
                >
                  National Nursery Portal <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              {data.indian_agricultural_evidence.slice(0, 2).map((ind, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40">
                  <div className="font-semibold">{ind.commercial_variety} — {ind.institution}</div>
                  <div className="text-[11px] text-zinc-500">{ind.documented_traits.join(' • ')}</div>
                </div>
              ))}
            </div>
          )}

          {/* Expandable Panel 2: Crop Genetics (NCBI) & Plant Genomics (Ensembl Plants) */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden text-xs">
            <button
              onClick={() => setShowGenomics(!showGenomics)}
              className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between font-bold text-zinc-800 dark:text-zinc-200"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                Crop Genetic & Plant Genomic Intelligence (NCBI E-utilities & Ensembl Plants)
              </span>
              {showGenomics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showGenomics && (
              <div className="p-4 space-y-3 bg-white dark:bg-zinc-900">
                <div>
                  <div className="font-semibold text-zinc-700 dark:text-zinc-300">Ensembl Plants Assembly:</div>
                  <p className="text-zinc-500">
                    {data.genomic_evidence?.is_supported
                      ? `Supported: ${data.genomic_evidence.ensembl_species_name} (${data.genomic_evidence.assembly_name})`
                      : data.genomic_evidence?.limitations || 'Genomic assembly not queried.'}
                  </p>
                </div>
                <div>
                  <div className="font-semibold text-zinc-700 dark:text-zinc-300">
                    NCBI Gene Records ({data.genetic_evidence?.genes.length || 0}):
                  </div>
                  {data.genetic_evidence?.genes.length ? (
                    <ul className="space-y-1 mt-1">
                      {data.genetic_evidence.genes.map((g) => (
                        <li key={g.gene_id}>
                          <a href={g.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">
                            {g.symbol} (Gene #{g.gene_id})
                          </a>
                          : {g.description}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-zinc-500">{data.genetic_evidence?.limitations || 'No live NCBI gene hits returned.'}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Expandable Panel 3: Scientific Evidence Validation */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden text-xs">
            <button
              onClick={() => setShowValidation(!showValidation)}
              className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between font-bold text-zinc-800 dark:text-zinc-200"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Scientific Evidence Validation & Missing Data Warnings ({data.missing_data.length})
              </span>
              {showValidation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showValidation && (
              <div className="p-4 space-y-2 bg-white dark:bg-zinc-900">
                <div><strong>Rule:</strong> {data.evidence_validation.classification_rule}</div>
                <div>
                  Field Trials: {data.evidence_validation.field_trials_count} • Lab Studies: {data.evidence_validation.lab_experiments_count} • Official Releases: {data.evidence_validation.indian_official_releases_count}
                </div>
                {data.missing_data.length > 0 && (
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">
                    <strong>Missing Data:</strong> {data.missing_data.join(' | ')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Expandable Panel 4: Compact 12-Provider Data Sources Status Panel */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden text-xs">
            <button
              onClick={() => setShowProviders(!showProviders)}
              className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between font-bold text-zinc-800 dark:text-zinc-200"
            >
              <span className="flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-600" />
                Data Sources & 12-Provider Integration Status
              </span>
              {showProviders ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showProviders && (
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 bg-white dark:bg-zinc-900">
                {data.provider_statuses.map((ps, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-0.5">
                    <div className="font-bold text-zinc-900 dark:text-white">{ps.provider_name}</div>
                    <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">{ps.status}</div>
                    <div className="text-[10px] text-zinc-500">{ps.data_classification}</div>
                    {ps.missing_configuration && (
                      <div className="text-[10px] text-amber-600">Missing: {ps.missing_configuration}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
