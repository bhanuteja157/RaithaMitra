// frontend/src/app/biointel/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFarm } from '@/context/FarmContext';
import { AdvancedBioIntelPanel } from '@/components/biointel/AdvancedBioIntelPanel';
import { SeedInvestmentPlanner } from '@/components/biointel/SeedInvestmentPlanner';
import { BioIntelNurseryFinder } from '@/components/biointel/BioIntelNurseryFinder';
import {
  fetchBiotechResearch,
  fetchBiotechRecommendations,
  fetchCropVarieties,
} from '@/lib/biointelApi';
import {
  BiotechResearchResponse,
  BiotechRecommendationResponse,
  CropVarietyProfile,
  FarmerProfileInput,
  BiotechCategoryType,
} from '@/types';
import {
  Dna,
  BookOpen,
  Sprout,
  ShieldAlert,
  Droplets,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Store,
  SlidersHorizontal,
  Compass,
} from 'lucide-react';

const BIOTECH_CATEGORIES: { id: BiotechCategoryType; label: string; icon: string }[] = [
  { id: 'disease_resistant_varieties', label: 'Disease-Resistant Varieties', icon: '🛡️' },
  { id: 'drought_tolerant_varieties', label: 'Drought-Tolerant Varieties', icon: '💧' },
  { id: 'hybrid_varieties', label: 'Hybrid Crop Varieties', icon: '🧬' },
  { id: 'tissue_cultured_plants', label: 'Tissue-Cultured Plants', icon: '🧪' },
  { id: 'grafted_plants', label: 'Grafted Plants', icon: '🌱' },
  { id: 'biofertilizers', label: 'Biofertilizers & Consortia', icon: '🦠' },
  { id: 'biopesticides', label: 'Biopesticides & Biocontrol', icon: '🐞' },
  { id: 'beneficial_soil_microorganisms', label: 'Beneficial Soil Microorganisms', icon: '🧫' },
  { id: 'biological_nutrient_management', label: 'Biological Nutrient Management', icon: '🌾' },
  { id: 'agricultural_waste_bioconversion', label: 'Agro-Waste Bioconversion', icon: '♻️' },
];

const CROPS = ['Tomato', 'Rice', 'Banana', 'Chilli', 'Mango', 'Wheat', 'Maize', 'Cotton'];

const COMMON_PROBLEMS = [
  'Bacterial Wilt (Ralstonia)',
  'Tomato Leaf Curl Virus (ToLCV)',
  'Drought Stress & Water Deficit',
  'Root-Knot Nematodes',
  'Fungal Blight & Damping Off',
  'Phosphorus Fixing Soil',
  'Thrips & Whitefly Pest Pressure',
  'Crop Stubble Management',
];

export default function BioIntelPage() {
  const router = useRouter();
  const { currentFarm, language } = useFarm();

  // Selection states
  const [selectedCrop, setSelectedCrop] = useState<string>(currentFarm?.primary_crop || 'Tomato');
  const [nurserySelection, setNurserySelection] = useState<{
    crop: string;
    varietyName: string;
    requiredSeedKg: number;
    budgetInr: number;
  }>({
    crop: currentFarm?.primary_crop || 'Tomato',
    varietyName: '',
    requiredSeedKg: 0.15,
    budgetInr: currentFarm?.cultivation_budget_inr || 50000,
  });
  const [showScientificResearch, setShowScientificResearch] = useState<boolean>(false);
  const [selectedProblem, setSelectedProblem] = useState<string>('Bacterial Wilt (Ralstonia)');
  const [selectedCategory, setSelectedCategory] = useState<BiotechCategoryType | ''>('disease_resistant_varieties');
  const [customSearchQuery, setCustomSearchQuery] = useState<string>('');

  // Manual Profile Overrides
  const [isManualOverride, setIsManualOverride] = useState<boolean>(false);
  const [farmerProfile, setFarmerProfile] = useState<FarmerProfileInput>({
    farm_id: currentFarm?.id || 'farm_001',
    farmer_name: currentFarm?.farmer_name || 'Farmer',
    farm_location: currentFarm ? `${currentFarm.district}, ${currentFarm.state}` : 'Tumakuru, Karnataka',
    latitude: currentFarm?.latitude || 13.3409,
    longitude: currentFarm?.longitude || 77.1010,
    crop_type: currentFarm?.primary_crop || 'Tomato',
    soil_type: currentFarm?.soil_type || 'Red Sandy Loam',
    soil_ph: 6.5,
    water_availability: 'Limited / Low',
    climate_conditions: 'Semi-arid, High summer temperatures',
    land_area_ha: currentFarm?.land_area_ha || 1.5,
    cultivation_budget_inr: currentFarm?.cultivation_budget_inr || 75000,
    previous_crop_diseases: ['Bacterial Wilt', 'Tomato Leaf Curl Virus'],
  });

  // Data states
  const [researchData, setResearchData] = useState<BiotechResearchResponse | null>(null);
  const [recommendationsData, setRecommendationsData] = useState<BiotechRecommendationResponse | null>(null);
  const [cropVarieties, setCropVarieties] = useState<CropVarietyProfile[]>([]);
  const [isResearchLoading, setIsResearchLoading] = useState<boolean>(true);
  const [isRecsLoading, setIsRecsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'research' | 'varieties'>('recommendations');

  // Sync profile when currentFarm updates
  useEffect(() => {
    if (currentFarm && !isManualOverride) {
      setFarmerProfile((prev) => ({
        ...prev,
        farm_id: currentFarm.id,
        farmer_name: currentFarm.farmer_name,
        farm_location: `${currentFarm.district}, ${currentFarm.state}`,
        latitude: currentFarm.latitude,
        longitude: currentFarm.longitude,
        crop_type: currentFarm.primary_crop,
        soil_type: currentFarm.soil_type,
        land_area_ha: currentFarm.land_area_ha,
        cultivation_budget_inr: currentFarm.cultivation_budget_inr,
      }));
      setSelectedCrop(currentFarm.primary_crop);
    }
  }, [currentFarm, isManualOverride]);

  // Load recommendations
  const loadRecommendations = async () => {
    setIsRecsLoading(true);
    try {
      const recs = await fetchBiotechRecommendations({
        ...farmerProfile,
        crop_type: selectedCrop,
      });
      setRecommendationsData(recs);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setIsRecsLoading(false);
    }
  };

  // Load Europe PMC research
  const loadResearch = async () => {
    setIsResearchLoading(true);
    try {
      const res = await fetchBiotechResearch(
        selectedCrop,
        customSearchQuery || selectedProblem,
        selectedCategory || undefined,
        10
      );
      setResearchData(res);
    } catch (err) {
      console.error('Error fetching research:', err);
    } finally {
      setIsResearchLoading(false);
    }
  };

  // Load verified crop varieties
  const loadVarieties = async () => {
    try {
      const vars = await fetchCropVarieties(selectedCrop, selectedCategory || undefined);
      setCropVarieties(vars);
    } catch (err) {
      console.error('Error fetching varieties:', err);
    }
  };

  useEffect(() => {
    loadRecommendations();
    loadResearch();
    loadVarieties();
  }, [selectedCrop, selectedCategory]);

  const handleNavigateToNursery = (cropName: string, category: string, varietyName?: string) => {
    const params = new URLSearchParams({
      crop: cropName,
      category: category,
    });
    if (varietyName) params.append('query', varietyName);
    router.push(`/nursery-marketplace?${params.toString()}`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between p-6 bg-gradient-to-r from-green-900 to-green-800 text-white rounded-3xl shadow-md gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
              <Dna className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  BioIntel — Agricultural Biotechnology Intelligence
                </h1>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  Feature 17
                </span>
              </div>
              <p className="text-xs sm:text-sm text-green-100/80">
                Scientifically validated crop varieties, biological inputs, and live Europe PMC peer-reviewed research
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto">
          <Link
            href="/nursery-marketplace"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-green-950 font-semibold text-xs transition shadow-sm"
          >
            <Store className="w-4 h-4" />
            Nursery Marketplace
          </Link>
        </div>
      </div>

      {/* Section 1 & 2: Plan My Crop + Compare Seed Varieties */}
      <SeedInvestmentPlanner
        selectedCrop={selectedCrop}
        onSelectCrop={(c) => {
          setSelectedCrop(c);
          setNurserySelection((prev) => ({ ...prev, crop: c, varietyName: '' }));
        }}
        onVarietySelectedForNursery={(payload) => setNurserySelection(payload)}
      />

      {/* Section 3: Find Seeds & Nurseries (auto-prefilled from selected variety) */}
      <BioIntelNurseryFinder
        crop={nurserySelection.crop || selectedCrop}
        varietyName={nurserySelection.varietyName}
        requiredSeedKg={nurserySelection.requiredSeedKg}
        budgetInr={nurserySelection.budgetInr}
      />

      {/* Expandable Scientific & Biological Research (Optional) */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowScientificResearch((s) => !s)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
        >
          <div>
            <div className="text-sm font-bold text-zinc-900 dark:text-white">
              Biological &amp; Scientific Research (Optional)
            </div>
            <div className="text-xs text-zinc-500">
              {showScientificResearch
                ? 'Hide Europe PMC literature and procurement solver'
                : 'Expand for peer-reviewed research papers, biofertilizer advisories, and OR-Tools optimization'}
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-700">
            {showScientificResearch ? 'Hide' : 'Expand'}
          </span>
        </button>
        {showScientificResearch && (
          <div className="p-4 pt-0 space-y-5 border-t border-zinc-200 dark:border-zinc-800">
            <AdvancedBioIntelPanel selectedCrop={selectedCrop} />
          </div>
        )}
      </div>

      {/* Control Strip & Crop Context Selection */}
      <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Target Crop:</span>
            {CROPS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setSelectedCrop(c);
                  setFarmerProfile((p) => ({ ...p, crop_type: c }));
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                  selectedCrop.toLowerCase() === c.toLowerCase()
                    ? 'bg-green-800 text-white shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsManualOverride(!isManualOverride)}
            className="flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-400 hover:underline self-start md:self-auto"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {isManualOverride ? 'Use Farm Context' : 'Manual Soil & Disease Inputs'}
          </button>
        </div>

        {/* Manual Farmer Profile Drawer */}
        {isManualOverride && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Soil Texture</label>
              <select
                value={farmerProfile.soil_type}
                onChange={(e) => setFarmerProfile({ ...farmerProfile, soil_type: e.target.value })}
                className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
              >
                <option value="Red Sandy Loam">Red Sandy Loam</option>
                <option value="Black Cotton Soil">Black Cotton Soil</option>
                <option value="Clay Loam">Clay Loam</option>
                <option value="Laterite Soil">Laterite Soil</option>
                <option value="Alluvial Soil">Alluvial Soil</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Soil pH</label>
              <input
                type="number"
                step="0.1"
                min="3.0"
                max="9.5"
                value={farmerProfile.soil_ph || 6.5}
                onChange={(e) => setFarmerProfile({ ...farmerProfile, soil_ph: parseFloat(e.target.value) || 6.5 })}
                className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Water Availability</label>
              <select
                value={farmerProfile.water_availability}
                onChange={(e) =>
                  setFarmerProfile({
                    ...farmerProfile,
                    water_availability: e.target.value as any,
                  })
                }
                className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
              >
                <option value="Limited / Low">Limited / Low (Borewell deficit)</option>
                <option value="Moderate / Adequate">Moderate / Adequate</option>
                <option value="Abundant / Canal">Abundant / Canal Basin</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Cultivation Budget (₹)</label>
              <input
                type="number"
                step="1000"
                value={farmerProfile.cultivation_budget_inr}
                onChange={(e) =>
                  setFarmerProfile({ ...farmerProfile, cultivation_budget_inr: parseFloat(e.target.value) || 50000 })
                }
                className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between pt-2">
              <span className="text-[11px] text-zinc-500">
                Evaluating against current farm location: {farmerProfile.farm_location}
              </span>
              <button
                onClick={loadRecommendations}
                className="px-3 py-1.5 bg-green-800 text-white font-semibold rounded-lg text-xs hover:bg-green-700 transition"
              >
                Re-evaluate Recommendations
              </button>
            </div>
          </div>
        )}

        {/* 10 Biotechnology Categories Pill Filter */}
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Biotechnology Domains (10 Core Categories):
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                selectedCategory === ''
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              All Categories
            </button>
            {BIOTECH_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition ${
                  selectedCategory === cat.id
                    ? 'bg-green-800 text-white shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'recommendations'
              ? 'border-green-800 text-green-800 dark:text-green-400 dark:border-green-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Personalized Recommendations ({recommendationsData?.total_recommendations || 0})
        </button>
        <button
          onClick={() => setActiveTab('research')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'research'
              ? 'border-green-800 text-green-800 dark:text-green-400 dark:border-green-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Live Europe PMC Research ({researchData?.total_results || 0})
        </button>
        <button
          onClick={() => setActiveTab('varieties')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'varieties'
              ? 'border-green-800 text-green-800 dark:text-green-400 dark:border-green-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Sprout className="w-4 h-4" />
          Certified Crop Varieties
        </button>
      </div>

      {/* TAB 1: PERSONALIZED RECOMMENDATIONS */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          {/* Centralized Decision Engine Summary Card (Requirement 12) */}
          {recommendationsData?.centralized_decision_payload && (
            <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-600 text-white mt-0.5">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wide">
                      Decision Intelligence Engine Ingest
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-semibold">
                      {recommendationsData.centralized_decision_payload.budget_compatibility}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                    Recommended Variety: <strong>{recommendationsData.centralized_decision_payload.recommended_crop_variety}</strong> | 
                    Intervention: {recommendationsData.centralized_decision_payload.biotechnology_intervention} | 
                    Evidence: {recommendationsData.centralized_decision_payload.evidence_strength}
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-zinc-500 self-end md:self-auto">
                <div>Est. Planting Outlay: <strong>₹{recommendationsData.centralized_decision_payload.estimated_procurement_cost_inr?.toLocaleString('en-IN')}</strong></div>
                <div>Farmer Budget: ₹{recommendationsData.centralized_decision_payload.farmer_budget_inr.toLocaleString('en-IN')}</div>
              </div>
            </div>
          )}

          {isRecsLoading ? (
            <div className="p-12 text-center text-zinc-500 flex flex-col items-center gap-2">
              <RotateCw className="w-6 h-6 animate-spin text-green-700" />
              <p className="text-xs">Evaluating scientific trials and soil suitability for {selectedCrop}...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {recommendationsData?.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm hover:shadow-md transition space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300">
                          {rec.category_label}
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                          Evidence: {rec.evidence_strength}
                        </span>
                        {rec.is_established_practice && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                            Established Practice
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                        {rec.variety_or_intervention_name}
                      </h3>
                    </div>

                    {rec.estimated_cost_inr && (
                      <div className="text-right sm:self-center">
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{rec.estimated_cost_inr.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-zinc-400">{rec.estimated_cost_unit}</div>
                      </div>
                    )}
                  </div>

                  {/* Agricultural Benefits */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      Expected Agricultural Benefits:
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                      {(rec.expected_agricultural_benefits || []).map((benefit, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Agronomic Conditions Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl text-xs">
                    <div>
                      <span className="text-zinc-400 block text-[10px] font-semibold uppercase">Soil Suitability</span>
                      <span className="text-zinc-700 dark:text-zinc-300 font-medium">{rec.suitable_soil_conditions}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[10px] font-semibold uppercase">Water Requirement</span>
                      <span className="text-zinc-700 dark:text-zinc-300 font-medium">{rec.water_requirements}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[10px] font-semibold uppercase">Pathogen Protection</span>
                      <span className="text-zinc-700 dark:text-zinc-300 font-medium">{rec.disease_resistance || 'General bio-vigor'}</span>
                    </div>
                  </div>

                  {/* Scientific Citation & Limitations */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40">
                      <BookOpen className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Scientific Evidence:</strong> {rec.scientific_evidence}
                      </div>
                    </div>

                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300 border border-amber-100 dark:border-amber-900/40">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Agronomic Limitations:</strong> {rec.limitations}
                      </div>
                    </div>
                  </div>

                  {/* Find Nearby Suppliers Button (Connecting to Marketplace) */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-zinc-400">
                      Search query: <em>{rec.find_nearby_suppliers_query}</em>
                    </span>
                    <button
                      onClick={() =>
                        handleNavigateToNursery(
                          rec.crop_name || rec.crop || 'Tomato',
                          rec.nursery_search_category || '',
                          rec.variety_or_intervention_name || ''
                        )
                      }
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-800 hover:bg-green-700 text-white font-semibold text-xs transition shadow-sm"
                    >
                      <Store className="w-4 h-4 text-emerald-300" />
                      Find Nearby Suppliers
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LIVE EUROPE PMC RESEARCH */}
      {activeTab === 'research' && (
        <div className="space-y-5">
          {/* Research Search Bar */}
          <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search scientific literature (e.g. Tomato AND biofertilizer, Rice AND drought tolerance)..."
                  value={customSearchQuery}
                  onChange={(e) => setCustomSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-green-700"
                />
              </div>
              <button
                onClick={loadResearch}
                className="px-4 py-2 bg-green-800 text-white font-semibold text-xs rounded-xl hover:bg-green-700 transition"
              >
                Search Europe PMC
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-500 gap-2">
              <div>
                <strong>Active Query:</strong> <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{researchData?.query_used}</code>
              </div>
              <div className="flex items-center gap-2">
                <span>Source: {researchData?.data_source}</span>
                {researchData?.cached && (
                  <span className="px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-700 text-[10px]">Cached</span>
                )}
              </div>
            </div>
          </div>

          {/* Evidence Summary Callout */}
          {researchData?.evidence_summary && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-2xl flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-blue-950 dark:text-blue-200">
                  Synthesized Scientific Evidence Summary
                </h4>
                <p className="text-xs text-blue-900/90 dark:text-blue-300">
                  {researchData.evidence_summary}
                </p>
              </div>
            </div>
          )}

          {isResearchLoading ? (
            <div className="p-12 text-center text-zinc-500 flex flex-col items-center gap-2">
              <RotateCw className="w-6 h-6 animate-spin text-green-700" />
              <p className="text-xs">Querying Europe PMC REST API endpoint...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {researchData?.papers.map((paper, idx) => (
                <div
                  key={idx}
                  className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            paper.evidence_type === 'established_practice'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                          }`}
                        >
                          {paper.evidence_type === 'established_practice'
                            ? 'Established Field Practice'
                            : 'Peer-Reviewed Scientific Study'}
                        </span>
                        {paper.is_open_access && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            Open Access
                          </span>
                        )}
                        {paper.pub_year && (
                          <span className="text-[10px] text-zinc-400">Published: {paper.pub_year}</span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-zinc-900 dark:text-white leading-snug">
                        {paper.title}
                      </h4>
                      <p className="text-xs text-zinc-500">
                        {(paper.authors && paper.authors.length > 0) ? paper.authors.join(', ') : 'Collaborative Authors'} •{' '}
                        <em>{paper.journal_title}</em>
                      </p>
                    </div>

                    {paper.article_url && (
                      <a
                        href={paper.article_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300 transition shrink-0"
                        title="View Research Article"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {paper.abstract_text && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-3 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                      {paper.abstract_text}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                    <span>DOI: {paper.doi || 'Indexed via Europe PMC Core'}</span>
                    {paper.article_url && (
                      <a
                        href={paper.article_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-700 dark:text-green-400 font-semibold hover:underline flex items-center gap-1"
                      >
                        Read Full Paper <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CERTIFIED CROP VARIETIES */}
      {activeTab === 'varieties' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cropVarieties.map((v, i) => (
            <div
              key={i}
              className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300">
                    {v.category_label}
                  </span>
                  <h4 className="text-base font-bold text-zinc-900 dark:text-white mt-1">
                    {v.variety_name}
                  </h4>
                  <p className="text-xs text-zinc-400">{v.institution}</p>
                </div>
                <div className="text-right text-xs">
                  <div className="font-bold text-emerald-600">{v.yield_potential}</div>
                  <div className="text-[10px] text-zinc-400">{v.maturity_days > 0 ? `${v.maturity_days} days maturity` : 'Continuous'}</div>
                </div>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-300">{v.description}</p>

              <div className="space-y-1 text-xs">
                <div className="text-[11px] font-semibold text-zinc-500">Disease Resistance:</div>
                <div className="flex flex-wrap gap-1">
                  {v.disease_resistance.map((d, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px]"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-[11px] text-zinc-400">Seed rate: {v.seed_rate_per_ha}</span>
                <button
                  onClick={() => handleNavigateToNursery(v.crop, v.category, v.variety_name)}
                  className="flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400 hover:underline"
                >
                  Find Seed Suppliers <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
