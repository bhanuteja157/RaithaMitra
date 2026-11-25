// frontend/src/app/biointel/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useFarm } from '@/context/FarmContext';
import { BioIntelPublication, NurserySupplier } from '@/types';
import {
  Dna,
  Search,
  BookOpen,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  MapPin,
  Phone,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  RefreshCw,
  Building2
} from 'lucide-react';

export default function BioIntelPage() {
  const { currentFarm } = useFarm();
  const [selectedCrop, setSelectedCrop] = useState(currentFarm?.primary_crop || "Tomato");
  const [selectedTopic, setSelectedTopic] = useState("disease_resistance");
  const [publications, setPublications] = useState<BioIntelPublication[]>([]);
  const [nurseries, setNurseries] = useState<NurserySupplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchSummary, setSearchSummary] = useState<any>(null);

  const topics = [
    { id: "disease_resistance", label: "Disease-Resistant Genes", desc: "Immune loci, QTL markers & blight resistance" },
    { id: "drought_tolerance", label: "Drought & Heat Resilience", desc: "Water-use efficiency and osmotic tolerance" },
    { id: "biofertilizer", label: "Biofertilizers & Mycorrhiza", desc: "Rhizospheric inoculants reducing chemical NPK" },
    { id: "pest_management", label: "Biological Pest Management", desc: "Entomopathogenic bio-control & Trichoderma" },
    { id: "tissue_culture", label: "Certified Tissue Culture", desc: "Disease-indexed clonal micropropagation" },
    { id: "hybrid_vigor", label: "High-Yielding Hybrids", desc: "F1 heterosis genetics for maximum harvest" },
  ];

  const fetchBioIntel = async () => {
    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      // Fetch publications from Europe PMC
      const pubRes = await fetch(`${backendUrl}/biointel/search?crop=${encodeURIComponent(selectedCrop)}&topic=${selectedTopic}&page_size=6`);
      if (pubRes.ok) {
        const data = await pubRes.json();
        setPublications(data.publications);
        setSearchSummary(data);
      }

      // Fetch verified nurseries
      const nursRes = await fetch(`${backendUrl}/biointel/nurseries?district=${encodeURIComponent(currentFarm?.district || "Mandya")}`);
      if (nursRes.ok) {
        const nData = await nursRes.json();
        setNurseries(nData.suppliers);
      }
    } catch (e) {
      console.warn("BioIntel fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBioIntel();
  }, [selectedCrop, selectedTopic]);

  return (
    <div className="space-y-6">
      {/* Flagship Header Banner */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-emerald-950 via-zinc-900 to-emerald-900 border border-emerald-800/60 rounded-3xl shadow-xl text-white relative overflow-hidden">
        <div className="relative z-10 space-y-2 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Flagship Innovation #1
            </span>
            <span className="text-xs text-zinc-400">Powered by Europe PMC Open Access Index</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            BioIntel — Agricultural Biotechnology & Genomic Intelligence
          </h1>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Discover peer-reviewed breakthroughs on disease-resistant cultivars, drought resilience, biofertilizers, and tissue culture. Translates complex genomic research into actionable farmer takeaways.
          </p>
        </div>
      </div>

      {/* Control Bar: Crop Selection & Topic Tabs */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Active Crop:
            </label>
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="px-3.5 py-2 text-sm font-bold rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rm-primary"
            >
              <option value="Tomato">Tomato (Arka Rakshak)</option>
              <option value="Wheat">Wheat (DWR-162)</option>
              <option value="Rice">Rice / Paddy (Jaya / IR-64)</option>
              <option value="Maize">Maize (Hybrid Gold)</option>
              <option value="Cotton">Cotton (Bt Cotton)</option>
              <option value="Chilli">Chilli (Byadgi / G4)</option>
              <option value="Potato">Potato (Kufri Jyoti)</option>
            </select>
          </div>

          <button
            onClick={fetchBioIntel}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-rm-primary text-white hover:bg-rm-dark self-start transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Search Europe PMC</span>
          </button>
        </div>

        {/* Biotechnology Topic Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          {topics.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTopic(t.id)}
              className={`p-3 rounded-xl text-left transition-all ${
                selectedTopic === t.id
                  ? 'bg-rm-primary text-white shadow-md'
                  : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <div className="text-xs font-bold leading-tight">{t.label}</div>
              <div className={`text-[10px] mt-1 line-clamp-2 ${selectedTopic === t.id ? 'text-zinc-200' : 'text-zinc-400'}`}>
                {t.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Scientific Research Publications Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-rm-primary dark:text-rm-accent" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              Peer-Reviewed Scientific Publications ({publications.length})
            </h2>
          </div>
          <span className="text-xs text-zinc-500">
            Source: {searchSummary?.data_source || "Europe PMC Open Access"}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-400 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-rm-primary mb-3" />
            <p className="text-sm font-semibold">Querying European Molecular Biology Laboratory (EMBL-EBI)...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {publications.map((pub) => (
              <div
                key={pub.id}
                className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col justify-between space-y-3 hover:border-emerald-500/50 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {pub.year} • {pub.journal}
                    </span>
                    <a
                      href={pub.source_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-rm-primary flex items-center gap-1 text-xs font-semibold"
                    >
                      <span>DOI Paper</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-snug">
                    {pub.title}
                  </h3>

                  <p className="text-xs text-zinc-500 line-clamp-1">
                    Authors: {pub.authors}
                  </p>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                    {pub.abstract}
                  </p>
                </div>

                {/* Practical Farmer Takeaway Box */}
                <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Practical Farmer Takeaway:</span>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300 text-[11px] leading-relaxed">
                    {pub.farmer_takeaway}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verified Institutional Seed & Sapling Nurseries */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-rm-primary dark:text-rm-accent" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              Nearby Certified Seed & Sapling Institutional Suppliers ({currentFarm?.district || "Mandya"})
            </h2>
          </div>
          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" /> Official ICAR / KSSC Verified
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {nurseries.map((n) => (
            <div
              key={n.id}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  {n.name}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  VERIFIED
                </span>
              </div>
              <p className="text-xs text-zinc-500 flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                <span>{n.location}</span>
              </p>
              <div className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                Phone: <span className="font-mono">{n.phone}</span>
              </div>
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase block mb-1">
                  Certified Stock:
                </span>
                <div className="flex flex-wrap gap-1">
                  {n.available_supplies.map((s, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] text-zinc-700 dark:text-zinc-300">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
