// frontend/src/components/digital-farming/MaizeAgronomyCard.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useFarm } from '@/context/FarmContext';
import { formatLocalizedDate, localizeCondition } from '@/lib/translations';
import { Language } from '@/types';
import {
  fetchMaizeAgronomy,
  fetchMaizeVarieties,
  MaizeAgronomyResult,
  MaizeVarietyInfo,
} from '@/lib/satelliteMonitoringApi';
import { Sprout, Calculator, CheckCircle2 } from 'lucide-react';

const MAIZE_I18N: Record<Language, {
  subSource: string; classif: string; stageWord: string;
  varietyLbl: string; rowLbl: string; plantLbl: string; germLbl: string;
  reqSeedWt: string; estSeedCnt: string; estStand: string; plants: string; expHarvest: string; estYieldRng: string;
  formulaLbl: string; gddLbl: string; dayLbl: string; daysShort: string;
}> = {
  en: {
    subSource: 'Package of Practices', classif: 'Classification:', stageWord: 'Stage',
    varietyLbl: 'Maize Variety', rowLbl: 'Row Spacing (cm)', plantLbl: 'Plant Spacing (cm)', germLbl: 'Germination (%)',
    reqSeedWt: 'Required Seed Weight', estSeedCnt: 'Est. Seed Count', estStand: 'Established Stand', plants: 'plants',
    expHarvest: 'Expected Harvest', estYieldRng: 'Est. Yield Range',
    formulaLbl: 'Formula:', gddLbl: 'GDD target:', dayLbl: 'Day', daysShort: 'd',
  },
  kn: {
    subSource: 'ಕೃಷಿ ಪದ್ಧತಿ ಮಾರ್ಗದರ್ಶಿ', classif: 'ವರ್ಗೀಕರಣ:', stageWord: 'ಹಂತ',
    varietyLbl: 'ಮೆಕ್ಕೆಜೋಳ ತಳಿ', rowLbl: 'ಸಾಲು ಅಂತರ (ಸೆಂ.ಮೀ)', plantLbl: 'ಸಸಿ ಅಂತರ (ಸೆಂ.ಮೀ)', germLbl: 'ಮೊಳಕೆ ದರ (%)',
    reqSeedWt: 'ಬೇಕಾಗುವ ಬೀಜದ ತೂಕ', estSeedCnt: 'ಅಂದಾಜು ಬೀಜಗಳ ಸಂಖ್ಯೆ', estStand: 'ಒಟ್ಟು ಸಸಿಗಳು', plants: 'ಸಸಿಗಳು',
    expHarvest: 'ನಿರೀಕ್ಷಿತ ಕೊಯ್ಲು', estYieldRng: 'ಅಂದಾಜು ಇಳುವರಿ',
    formulaLbl: 'ಸೂತ್ರ:', gddLbl: 'ಪಕ್ವತೆ ಗುರಿ:', dayLbl: 'ದಿನ', daysShort: 'ದಿನ',
  },
  hi: {
    subSource: 'कृषि अनुशंसा मानक', classif: 'वर्गीकरण:', stageWord: 'चरण',
    varietyLbl: 'मक्का किस्म', rowLbl: 'कतार दूरी (सेमी)', plantLbl: 'पौधे दूरी (सेमी)', germLbl: 'अंकुरण (%)',
    reqSeedWt: 'आवश्यक बीज वजन', estSeedCnt: 'अनुमानित बीज संख्या', estStand: 'कुल पौधे', plants: 'पौधे',
    expHarvest: 'संभावित कटाई', estYieldRng: 'अनुमानित उपज सीमा',
    formulaLbl: 'सूत्र:', gddLbl: 'GDD लक्ष्य:', dayLbl: 'दिन', daysShort: 'दिन',
  },
  te: {
    subSource: 'వ్యవసాయ పద్ధతుల గైడ్', classif: 'వర్గీకరణ:', stageWord: 'దశ',
    varietyLbl: 'మొక్కజొన్న రకం', rowLbl: 'వరుస దూరం (సెం.మీ)', plantLbl: 'మొక్క దూరం (సెం.మీ)', germLbl: 'మొలక శాతం (%)',
    reqSeedWt: 'అవసరమైన విత్తన బరువు', estSeedCnt: 'అంచనా విత్తన సంఖ్య', estStand: 'మొత్తం మొక్కలు', plants: 'మొక్కలు',
    expHarvest: 'అంచనా కోత తేదీ', estYieldRng: 'అంచనా దిగుబడి',
    formulaLbl: 'సూత్రం:', gddLbl: 'GDD లక్ష్యం:', dayLbl: 'రోజు', daysShort: 'రో.',
  },
};

interface MaizeAgronomyCardProps {
  areaAcres: number;
  sowingDate: string;
  currentDay: number;
  meanTempC?: number;
  onAgronomyUpdated?: (agronomy: MaizeAgronomyResult | null) => void;
}

export function MaizeAgronomyCard({
  areaAcres,
  sowingDate,
  currentDay,
  meanTempC = 25.5,
  onAgronomyUpdated,
}: MaizeAgronomyCardProps) {
  const { t, language } = useFarm();
  const L = MAIZE_I18N[language] || MAIZE_I18N.en;
  const [varieties, setVarieties] = useState<MaizeVarietyInfo[]>([]);
  const [varietyId, setVarietyId] = useState('nah-1137');
  const [rowCm, setRowCm] = useState(60);
  const [plantCm, setPlantCm] = useState(20);
  const [germPct, setGermPct] = useState(90);
  const [result, setResult] = useState<MaizeAgronomyResult | null>(null);

  useEffect(() => {
    fetchMaizeVarieties().then((list) => {
      if (list.length > 0) setVarieties(list);
    });
  }, []);

  useEffect(() => {
    fetchMaizeAgronomy({
      areaAcres,
      varietyId,
      sowingDate,
      rowSpacingCm: rowCm,
      plantSpacingCm: plantCm,
      germinationPct: germPct,
      meanDailyTempC: meanTempC,
    }).then((res) => {
      setResult(res);
      onAgronomyUpdated?.(res);
    });
  }, [areaAcres, varietyId, sowingDate, rowCm, plantCm, germPct, meanTempC]);

  const currentStage =
    result?.biological_stages.find((s) => currentDay >= s.start_day && currentDay <= s.end_day) ||
    result?.biological_stages[result.biological_stages.length - 1];

  return (
    <div className="rounded-2xl border border-[#DCD8CA] dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3 text-xs shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sprout className="w-4 h-4 text-[#36784D]" />
          <div>
            <h3 className="text-sm font-bold text-[#20372A] dark:text-white">
              {t('maizeModelTitle')}
            </h3>
            <p className="text-[11px] text-zinc-500">
              {result?.variety?.source || L.subSource} · {L.classif} {localizeCondition('ESTIMATED', language)}
            </p>
          </div>
        </div>
        {currentStage && (
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 font-semibold text-[11px]">
            {L.stageWord} {currentStage.stage_number}/15: {currentStage.name} ({currentStage.code})
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <label className="text-[11px] text-zinc-500 block mb-1">{L.varietyLbl}</label>
          <select
            value={varietyId}
            onChange={(e) => {
              const id = e.target.value;
              setVarietyId(id);
              const v = varieties.find((x) => x.id === id);
              if (v) {
                setRowCm(v.recommended_row_spacing_cm);
                setPlantCm(v.recommended_plant_spacing_cm);
                setGermPct(v.default_germination_pct);
              }
            }}
            className="w-full p-2 rounded-xl border border-[#DCD8CA] dark:border-zinc-700 bg-[#F7F5ED] dark:bg-zinc-900"
          >
            {varieties.length === 0 ? (
              <option value="nah-1137">NAH-1137 Hybrid (110{L.daysShort})</option>
            ) : (
              varieties.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.duration_days}{L.daysShort})
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="text-[11px] text-zinc-500 block mb-1">{L.rowLbl}</label>
          <input
            type="number"
            min={30}
            max={120}
            value={rowCm}
            onChange={(e) => setRowCm(Number(e.target.value) || 60)}
            className="w-full p-2 rounded-xl border border-[#DCD8CA] dark:border-zinc-700 bg-[#F7F5ED] dark:bg-zinc-900"
          />
        </div>

        <div>
          <label className="text-[11px] text-zinc-500 block mb-1">{L.plantLbl}</label>
          <input
            type="number"
            min={10}
            max={80}
            value={plantCm}
            onChange={(e) => setPlantCm(Number(e.target.value) || 20)}
            className="w-full p-2 rounded-xl border border-[#DCD8CA] dark:border-zinc-700 bg-[#F7F5ED] dark:bg-zinc-900"
          />
        </div>

        <div>
          <label className="text-[11px] text-zinc-500 block mb-1">{L.germLbl}</label>
          <input
            type="number"
            min={50}
            max={100}
            value={germPct}
            onChange={(e) => setGermPct(Number(e.target.value) || 90)}
            className="w-full p-2 rounded-xl border border-[#DCD8CA] dark:border-zinc-700 bg-[#F7F5ED] dark:bg-zinc-900"
          />
        </div>
      </div>

      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-[#F7F5ED] dark:bg-zinc-900 p-3 rounded-xl border border-[#DCD8CA] dark:border-zinc-800">
            <div>
              <span className="text-[10px] text-zinc-500 block">{L.reqSeedWt}</span>
              <strong>{result.required_seed_kg} kg</strong>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">{L.estSeedCnt}</span>
              <strong>{result.estimated_seed_count.toLocaleString('en-IN')}</strong>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">{L.estStand}</span>
              <strong>{result.estimated_established_population.toLocaleString('en-IN')} {L.plants}</strong>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">{L.expHarvest}</span>
              <strong>{formatLocalizedDate(result.expected_harvest_date, language)}</strong>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">{L.estYieldRng}</span>
              <strong>
                {result.expected_yield_kg_range[0].toLocaleString('en-IN')}–
                {result.expected_yield_kg_range[1].toLocaleString('en-IN')} kg
              </strong>
            </div>
          </div>

          <div className="text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-[#36784D] shrink-0" />
            <span>{L.formulaLbl} {result.seed_formula} · {L.gddLbl} {result.gdd_to_maturity} °C·d</span>
          </div>

          {currentStage && (
            <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[11px] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                <strong>{L.dayLbl} {currentDay} — {currentStage.name}:</strong> {currentStage.description}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
