// frontend/src/components/biointel/AdvancedBioIntelPanel.tsx
'use client';

import React, { useState } from 'react';
import { useFarm } from '@/context/FarmContext';
import {
  runUnifiedBioIntelWorkflow,
  UnifiedBioIntelResponse,
} from '@/lib/biointelAdvancedApi';
import { localizeCropName, localizeCondition, formatLocalizedCurrency } from '@/lib/translations';
import { Language } from '@/types';

const ADV_BIO_I18N: Record<Language, {
  title: string; badge: string; pipelineDesc: string;
  demoBtn: string; runBtn: string; areaLbl: string; seedlingsLbl: string; budgetLbl: string; waterLbl: string;
  evQuality: string; climateTitle: string; soilTitle: string; qualityLbl: string; totalLbl: string; fulfilledLbl: string;
  withinBudget: string; exceedsBudget: string; allocTitle: string; demoData: string; qtyLbl: string;
  icarTitle: string; portalLink: string; genomicsToggle: string; ensemblLbl: string; ncbiLbl: string; noNcbi: string;
  valToggle: string; ruleLbl: string; missingData: string; providersToggle: string; missingCfg: string;
}> = {
  en: {
    title: 'Unified Scientific & Procurement Optimization', badge: '12-Provider Pipeline',
    pipelineDesc: 'Species Validation → Scientific Literature → Climate & Soil → Indian ICAR Trials → Cost-Optimal Allocation',
    demoBtn: 'Run Demo (2 Acres Tomato)', runBtn: 'Run Unified Analysis',
    areaLbl: 'Cultivation Area (Acres)', seedlingsLbl: 'Required Seedlings', budgetLbl: 'Procurement Budget (₹)', waterLbl: 'Water Availability',
    evQuality: 'Evidence Quality:', climateTitle: 'Climate & Irrigation', soilTitle: 'Soil Compatibility', qualityLbl: 'Quality:',
    totalLbl: 'Total:', fulfilledLbl: 'Fulfilled:', withinBudget: 'Within Budget', exceedsBudget: 'Exceeds Budget',
    allocTitle: 'Optimized Supplier Allocations', demoData: 'Demo Data', qtyLbl: 'Qty:',
    icarTitle: 'Indian Official Cultivar Releases (ICAR / IIHR)', portalLink: 'National Nursery Portal',
    genomicsToggle: 'Crop Genetic & Plant Genomic Intelligence (NCBI & Ensembl)',
    ensemblLbl: 'Ensembl Plants Assembly:', ncbiLbl: 'NCBI Gene Records', noNcbi: 'No live NCBI gene hits returned.',
    valToggle: 'Scientific Evidence Validation & Missing Data Warnings', ruleLbl: 'Rule:', missingData: 'Missing Data:',
    providersToggle: 'Data Sources & 12-Provider Integration Status', missingCfg: 'Missing:',
  },
  kn: {
    title: 'ಸಮಗ್ರ ವೈಜ್ಞಾನಿಕ ಮತ್ತು ಬೀಜ ಖರೀದಿ ವಿಶ್ಲೇಷಣೆ', badge: '12-ಮೂಲಗಳ ವ್ಯವಸ್ಥೆ',
    pipelineDesc: 'ತಳಿ ದೃಢೀಕರಣ → ಸಂಶೋಧನಾ ಪ್ರಬಂಧಗಳು → ಹವಾಮಾನ ಮತ್ತು ಮಣ್ಣು → ಭಾರತೀಯ ICAR ಪರೀಕ್ಷೆ → ಕಡಿಮೆ ವೆಚ್ಚದ ಖರೀದಿ ಯೋಜನೆ',
    demoBtn: 'ಡೆಮೊ ಚಲಾಯಿಸಿ (2 ಎಕರೆ ಟೊಮೆಟೊ)', runBtn: 'ಸಮಗ್ರ ವಿಶ್ಲೇಷಣೆ ಚಲಾಯಿಸಿ',
    areaLbl: 'ಬೇಸಾಯ ವಿಸ್ತೀರ್ಣ (ಎಕರೆ)', seedlingsLbl: 'ಬೇಕಾಗುವ ಸಸಿಗಳು', budgetLbl: 'ಖರೀದಿ ಬಜೆಟ್ (₹)', waterLbl: 'ನೀರಿನ ಲಭ್ಯತೆ',
    evQuality: 'ಆಧಾರ ಗುಣಮಟ್ಟ:', climateTitle: 'ಹವಾಮಾನ ಮತ್ತು ನೀರಾವರಿ', soilTitle: 'ಮಣ್ಣಿನ ಯೋಗ್ಯತೆ', qualityLbl: 'ಗುಣಮಟ್ಟ:',
    totalLbl: 'ಒಟ್ಟು:', fulfilledLbl: 'ಪೂರೈಕೆ:', withinBudget: 'ಬಜೆಟ್ ಒಳಗಿದೆ', exceedsBudget: 'ಬಜೆಟ್ ಮೀರಿದೆ',
    allocTitle: 'ಉತ್ತಮ ನರ್ಸರಿ ಪೂರೈಕೆ ಹಂಚಿಕೆ', demoData: 'ಡೆಮೊ ಮಾಹಿತಿ', qtyLbl: 'ಪ್ರಮಾಣ:',
    icarTitle: 'ಭಾರತೀಯ ಅಧಿಕೃತ ತಳಿ ಬಿಡುಗಡೆಗಳು (ICAR / IIHR)', portalLink: 'ರಾಷ್ಟ್ರೀಯ ನರ್ಸರಿ ಪೋರ್ಟಲ್',
    genomicsToggle: 'ಬೆಳೆ ತಳಿಶಾಸ್ತ್ರ ಮತ್ತು ಜೀನೋಮ್ ಮಾಹಿತಿ (NCBI & Ensembl)',
    ensemblLbl: 'Ensembl ಸಸ್ಯ ಜೀನೋಮ್:', ncbiLbl: 'NCBI ಜೀನ್ ದಾಖಲೆಗಳು', noNcbi: 'ಯಾವುದೇ NCBI ಜೀನ್ ಮಾಹಿತಿ ಲಭ್ಯವಾಗಿಲ್ಲ.',
    valToggle: 'ವೈಜ್ಞಾನಿಕ ಸಾಕ್ಷ್ಯ ಪರಿಶೀಲನೆ ಮತ್ತು ಕೊರತೆ ಎಚ್ಚರಿಕೆಗಳು', ruleLbl: 'ನಿಯಮ:', missingData: 'ಲಭ್ಯವಿಲ್ಲದ ಮಾಹಿತಿ:',
    providersToggle: 'ಮಾಹಿತಿ ಮೂಲಗಳು ಮತ್ತು 12-ಪೂರೈಕೆದಾರರ ಸ್ಥಿತಿ', missingCfg: 'ಲಭ್ಯವಿಲ್ಲ:',
  },
  hi: {
    title: 'एकीकृत वैज्ञानिक व बीज खरीद अनुकूलन', badge: '12-स्रोत प्रणाली',
    pipelineDesc: 'प्रजाति सत्यापन → शोध साहित्य → जलवायु व मिट्टी → भारतीय ICAR परीक्षण → लागत-अनुकूल आवंटन',
    demoBtn: 'डेमो चलाएं (2 एकड़ टमाटर)', runBtn: 'एकीकृत विश्लेषण चलाएं',
    areaLbl: 'खेती क्षेत्र (एकड़)', seedlingsLbl: 'आवश्यक पौधे', budgetLbl: 'खरीद बजट (₹)', waterLbl: 'पानी की उपलब्धता',
    evQuality: 'प्रमाण गुणवत्ता:', climateTitle: 'जलवायु व सिंचाई', soilTitle: 'मिट्टी अनुकूलता', qualityLbl: 'गुणवत्ता:',
    totalLbl: 'कुल:', fulfilledLbl: 'पूर्ति:', withinBudget: 'बजट के भीतर', exceedsBudget: 'बजट से अधिक',
    allocTitle: 'अनुकूलित नर्सरी आवंटन', demoData: 'डेमो डेटा', qtyLbl: 'मात्रा:',
    icarTitle: 'भारतीय आधिकारिक किस्म रिलीज़ (ICAR / IIHR)', portalLink: 'राष्ट्रीय नर्सरी पोर्टल',
    genomicsToggle: 'फसल आनुवंशिकी व जीनोम जानकारी (NCBI व Ensembl)',
    ensemblLbl: 'Ensembl पादप असेंबली:', ncbiLbl: 'NCBI जीन रिकॉर्ड', noNcbi: 'कोई लाइव NCBI जीन परिणाम नहीं मिला।',
    valToggle: 'वैज्ञानिक साक्ष्य जांच व डेटा चेतावनी', ruleLbl: 'नियम:', missingData: 'अनुपलब्ध डेटा:',
    providersToggle: 'डेटा स्रोत व 12-प्रदाता स्थिति', missingCfg: 'अनुपलब्ध:',
  },
  te: {
    title: 'సమగ్ర శాస్త్రీయ & విత్తన కొనుగోలు విశ్లేషణ', badge: '12-వనరుల పైప్‌లైన్',
    pipelineDesc: 'జాతి నిర్ధారణ → పరిశోధన పత్రాలు → వాతావరణం & నేల → భారతీయ ICAR పరీక్షలు → తక్కువ ఖర్చు ప్రణాళిక',
    demoBtn: 'డెమో నడపండి (2 ఎకరాలు టొమాటో)', runBtn: 'సమగ్ర విశ్లేషణ నడపండి',
    areaLbl: 'సాగు విస్తీర్ణం (ఎకరాలు)', seedlingsLbl: 'అవసరమైన మొక్కలు', budgetLbl: 'కొనుగోలు బడ్జెట్ (₹)', waterLbl: 'నీటి లభ్యత',
    evQuality: 'ఆధార నాణ్యత:', climateTitle: 'వాతావరణం & నీటిపారుదల', soilTitle: 'నేల సరిపోతుందా', qualityLbl: 'నాణ్యత:',
    totalLbl: 'మొత్తం:', fulfilledLbl: 'సరఫరా:', withinBudget: 'బడ్జెట్ లోపల', exceedsBudget: 'బడ్జెట్ మించింది',
    allocTitle: 'ఉత్తమ నర్సరీ కేటాయింపులు', demoData: 'డెమో డేటా', qtyLbl: 'పరిమాణం:',
    icarTitle: 'భారతీయ అధికారిక రకాలు (ICAR / IIHR)', portalLink: 'జాతీయ నర్సరీ పోర్టల్',
    genomicsToggle: 'పంట జన్యు & జీనోమ్ సమాచారం (NCBI & Ensembl)',
    ensemblLbl: 'Ensembl మొక్కల అసెంబ్లీ:', ncbiLbl: 'NCBI జీన్ రికార్డులు', noNcbi: 'లైవ్ NCBI జీన్ ఫలితాలు రాలేదు.',
    valToggle: 'శాస్త్రీయ ఆధార తనిఖీ & లేని డేటా హెచ్చరికలు', ruleLbl: 'నియమం:', missingData: 'అందుబాటులో లేని డేటా:',
    providersToggle: 'డేటా వనరులు & 12-ప్రొవైడర్ల స్థితి', missingCfg: 'లోపం:',
  },
};
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
  const L = ADV_BIO_I18N[language] || ADV_BIO_I18N.en;

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
              {L.title}
            </h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              {L.badge}
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            {L.pipelineDesc}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleRunUnified(true)}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition shadow-sm"
          >
            {L.demoBtn}
          </button>
          <button
            onClick={() => handleRunUnified(false)}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-green-800 hover:bg-green-700 text-white font-semibold text-xs flex items-center gap-1.5 transition"
          >
            {isLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Dna className="w-4 h-4" />}
            {L.runBtn}
          </button>
        </div>
      </div>

      {/* Quick Parameter Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block text-zinc-500 mb-1">{L.areaLbl}</label>
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
          <label className="block text-zinc-500 mb-1">{L.seedlingsLbl}</label>
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
          <label className="block text-zinc-500 mb-1">{L.budgetLbl}</label>
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
          <label className="block text-zinc-500 mb-1">{L.waterLbl}</label>
          <select
            value={waterAvail}
            onChange={(e) => setWaterAvail(e.target.value as any)}
            className="w-full p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
          >
            <option value="Limited / Low">{localizeCondition('Scarce', language)}</option>
            <option value="Moderate / Adequate">{localizeCondition('Moderate', language)}</option>
            <option value="Abundant / Canal">{localizeCondition('Abundant', language)}</option>
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
                {localizeCropName(data.species_validation.input_crop_name, language)} — <em>{data.species_validation.accepted_scientific_name}</em>
                {data.species_validation.taxon_key && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white dark:bg-zinc-900 border border-emerald-200">
                    GBIF #{data.species_validation.taxon_key}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-emerald-600 text-white">
                {L.evQuality} {data.evidence_quality}
              </span>
            </div>
            <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">{data.grounded_explanation}</p>
          </div>

          {/* Climate, Soil & OR-Tools Procurement Plan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 space-y-1.5">
              <div className="font-bold text-zinc-900 dark:text-white">{L.climateTitle}</div>
              <div>{data.climate_suitability.current_temperature_c}°C • ET0: {data.climate_suitability.et0_mm_day} mm</div>
              <div className="text-zinc-500">{data.climate_suitability.planting_suitability}</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 space-y-1.5">
              <div className="font-bold text-zinc-900 dark:text-white">{L.soilTitle}</div>
              <div>{localizeCondition(data.soil_suitability.soil_texture, language)} (pH {data.soil_suitability.soil_ph ?? 'N/A'})</div>
              <div className="text-zinc-500">{L.qualityLbl} {data.soil_suitability.data_quality}</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 space-y-1.5">
              <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-green-700" />
                OR-Tools ({data.procurement_plan.optimization_status})
              </div>
              <div className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                {L.totalLbl} {formatLocalizedCurrency(data.procurement_plan.total_procurement_cost_inr, language)}
              </div>
              <div className="text-zinc-500">
                {L.fulfilledLbl} {data.procurement_plan.fulfilled_quantity.toLocaleString('en-IN')} / {data.procurement_plan.required_quantity.toLocaleString('en-IN')} •{' '}
                {data.budget_feasibility ? L.withinBudget : L.exceedsBudget}
              </div>
            </div>
          </div>

          {/* OR-Tools Supplier Allocations Table */}
          {data.procurement_plan.allocations.length > 0 && (
            <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
              <div className="font-bold text-zinc-900 dark:text-white">{L.allocTitle}</div>
              {data.procurement_plan.allocations.map((al, i) => (
                <div key={i} className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <div>
                    <span className="font-bold">{al.nursery_name}</span> — {al.variety_name}
                    {al.is_demo && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                        {L.demoData}
                      </span>
                    )}
                    <div className="text-[11px] text-zinc-500">
                      {L.qtyLbl} {al.quantity_allocated.toLocaleString('en-IN')} × ₹{al.unit_price_inr} • {al.distance_km} km ({al.distance_type})
                    </div>
                  </div>
                  <div className="text-right font-bold text-emerald-700 dark:text-emerald-400">
                    {formatLocalizedCurrency(al.subtotal_inr, language)}
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
                  {L.icarTitle}
                </span>
                <a
                  href={data.national_nursery_portal.portal_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-700 dark:text-green-400 hover:underline flex items-center gap-1"
                >
                  {L.portalLink} <ExternalLink className="w-3 h-3" />
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
                {L.genomicsToggle}
              </span>
              {showGenomics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showGenomics && (
              <div className="p-4 space-y-3 bg-white dark:bg-zinc-900">
                <div>
                  <div className="font-semibold text-zinc-700 dark:text-zinc-300">{L.ensemblLbl}</div>
                  <p className="text-zinc-500">
                    {data.genomic_evidence?.is_supported
                      ? `${data.genomic_evidence.ensembl_species_name} (${data.genomic_evidence.assembly_name})`
                      : data.genomic_evidence?.limitations || L.noNcbi}
                  </p>
                </div>
                <div>
                  <div className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {L.ncbiLbl} ({data.genetic_evidence?.genes.length || 0}):
                  </div>
                  {data.genetic_evidence?.genes.length ? (
                    <ul className="space-y-1 mt-1">
                      {data.genetic_evidence.genes.map((g) => (
                        <li key={g.gene_id}>
                          <a href={g.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">
                            {g.symbol} (#{g.gene_id})
                          </a>
                          : {g.description}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-zinc-500">{data.genetic_evidence?.limitations || L.noNcbi}</p>
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
                {L.valToggle} ({data.missing_data.length})
              </span>
              {showValidation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showValidation && (
              <div className="p-4 space-y-2 bg-white dark:bg-zinc-900">
                <div><strong>{L.ruleLbl}</strong> {data.evidence_validation.classification_rule}</div>
                <div>
                  Trials: {data.evidence_validation.field_trials_count} • Lab: {data.evidence_validation.lab_experiments_count} • ICAR: {data.evidence_validation.indian_official_releases_count}
                </div>
                {data.missing_data.length > 0 && (
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">
                    <strong>{L.missingData}</strong> {data.missing_data.join(' | ')}
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
                {L.providersToggle}
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
                      <div className="text-[10px] text-amber-600">{L.missingCfg} {ps.missing_configuration}</div>
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
