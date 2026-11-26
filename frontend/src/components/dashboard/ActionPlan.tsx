// frontend/src/components/dashboard/ActionPlan.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import {
  formatLocalizedCurrency,
  localizePriority,
  localizeUrgency,
  localizeCategory,
  localizeCondition,
  localizeRecommendationText,
} from '@/lib/translations';
import { Language } from '@/types';
import {
  Compass,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

const ACTION_I18N: Record<Language, {
  sub: string; conflictsResolved: string; rankedActions: string;
  conflictHeader: string; tradeoff: string; resolution: string;
  priority: string; estCost: string; category: string;
  source: string; quality: string; execute: string;
}> = {
  en: {
    sub: 'Smart Field Advisory • Weather, Soil, Crop & Market Sync',
    conflictsResolved: 'Conflicts Resolved', rankedActions: 'Ranked Actions',
    conflictHeader: 'Active Agricultural Conflict Resolution & Tradeoffs',
    tradeoff: 'Tradeoff:', resolution: 'Resolution:',
    priority: 'Priority', estCost: 'Est. Cost:', category: 'Category:',
    source: 'Source:', quality: 'Quality:', execute: 'Execute',
  },
  kn: {
    sub: 'ಸ್ಮಾರ್ಟ್ ಜಮೀನು ಸಲಹೆ • ಹವಾಮಾನ, ಮಣ್ಣು ಮತ್ತು ಬೆಳೆ ವಿಶ್ಲೇಷಣೆ',
    conflictsResolved: 'ಪರಿಹರಿಸಿದ ಸಮಸ್ಯೆಗಳು', rankedActions: 'ಪ್ರಮುಖ ಕ್ರಮಗಳು',
    conflictHeader: 'ಕೃಷಿ ಸಲಹೆಗಳ ನಡುವಿನ ಸಮತೋಲನ ಮತ್ತು ಪರಿಹಾರ',
    tradeoff: 'ಹೋಲಿಕೆ:', resolution: 'ಪರಿಹಾರ:',
    priority: 'ಆದ್ಯತೆ', estCost: 'ಅಂದಾಜು ವೆಚ್ಚ:', category: 'ವಿಭಾಗ:',
    source: 'ಮೂಲ:', quality: 'ಗುಣಮಟ್ಟ:', execute: 'ಕ್ರಮ ಕೈಗೊಳ್ಳಿ',
  },
  hi: {
    sub: 'स्मार्ट खेत सलाह • मौसम, मिट्टी और फसल समन्वय',
    conflictsResolved: 'सुलझे टकराव', rankedActions: 'प्रमुख कार्य',
    conflictHeader: 'सक्रिय कृषि निर्णय व संतुलन विश्लेषण',
    tradeoff: 'तुलना:', resolution: 'निर्णय:',
    priority: 'प्राथमिकता', estCost: 'अनुमानित खर्च:', category: 'श्रेणी:',
    source: 'स्रोत:', quality: 'गुणवत्ता:', execute: 'लागू करें',
  },
  te: {
    sub: 'స్మార్ట్ పొలం సలహా • వాతావరణం, నేల & పంట సమన్వయం',
    conflictsResolved: 'పరిష్కరించిన అంశాలు', rankedActions: 'ముఖ్య చర్యలు',
    conflictHeader: 'వ్యవసాయ నిర్ణయాల సమన్వయం మరియు పరిష్కారం',
    tradeoff: 'విశ్లేషణ:', resolution: 'పరిష్కారం:',
    priority: 'ప్రాధాన్యత', estCost: 'అంచనా ఖర్చు:', category: 'విభాగం:',
    source: 'మూలం:', quality: 'నాణ్యత:', execute: 'అమలు చేయండి',
  },
};

export function ActionPlan() {
  const { recommendations, t, language } = useFarm();
  const L = ACTION_I18N[language] || ACTION_I18N.en;

  const recList = recommendations?.recommendations || [];

  return (
    <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-rm-primary text-white shadow-sm">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
              {t('dailyActionPlan')}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {L.sub}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
            {recommendations?.conflicts_resolved?.length || 0} {L.conflictsResolved}
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            {recList.length} {L.rankedActions}
          </span>
        </div>
      </div>

      {/* Transparent Conflict Resolution Cards */}
      {recommendations?.conflicts_resolved && recommendations.conflicts_resolved.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-2">
          <div className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>{L.conflictHeader}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {recommendations.conflicts_resolved.map((c, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-amber-200 dark:border-amber-900/50 space-y-1">
                <div className="font-bold text-zinc-900 dark:text-white">{localizeRecommendationText(c.conflict_type, language)}</div>
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400"><strong>{L.tradeoff}</strong> {localizeRecommendationText(c.tradeoff_analysis, language)}</div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">✓ <strong>{L.resolution}</strong> {localizeRecommendationText(c.decision_outcome, language)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {recList.map((rec, idx) => {
          const priorityStyles = {
            critical: 'border-l-4 border-l-rm-danger bg-red-50/50 dark:bg-red-950/20',
            high: 'border-l-4 border-l-rm-warning bg-amber-50/50 dark:bg-amber-950/20',
            medium: 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20',
            low: 'border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20',
          }[rec.priority];

          const priorityBadge = {
            critical: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300',
            high: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
            medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300',
            low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
          }[rec.priority];

          return (
            <div
              key={rec.id || idx}
              className={`p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-all ${priorityStyles}`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${priorityBadge}`}>
                      {localizePriority(rec.priority, language)} {L.priority}
                    </span>
                    {rec.urgency && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        {localizeUrgency(rec.urgency, language)}
                      </span>
                    )}
                    {rec.estimated_cost_inr !== undefined && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                        {L.estCost} {formatLocalizedCurrency(rec.estimated_cost_inr, language)}
                      </span>
                    )}
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {L.category} {localizeCategory(rec.category, language)}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    {language !== 'en' && rec.localized_action && rec.localized_action !== rec.action
                      ? rec.localized_action
                      : localizeRecommendationText(rec.action, language)}
                  </h3>

                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {language !== 'en' && rec.localized_reason && rec.localized_reason !== rec.reason
                      ? rec.localized_reason
                      : localizeRecommendationText(rec.reason, language)}
                  </p>

                  {/* Supporting Grounded Evidence Accordion Card */}
                  <div className="mt-3 p-3 rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 text-xs space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 font-semibold text-zinc-700 dark:text-zinc-300">
                      <span>{t('evidenceGrounding')}:</span>
                      <span className="text-zinc-500 font-normal">
                        {t('uncertainty')}: <strong className="text-zinc-800 dark:text-zinc-200">{rec.supporting_data.uncertainty}</strong>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-zinc-600 dark:text-zinc-400">
                      <span>{L.source} <strong>{rec.supporting_data.source}</strong></span>
                      <span>{L.quality} <strong className="uppercase">{localizeCondition(rec.supporting_data.data_quality, language)}</strong></span>
                    </div>

                    {rec.alternative_action && (
                      <div className="pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 flex flex-wrap items-start gap-1.5">
                        <span className="font-semibold text-rm-primary dark:text-rm-accent whitespace-nowrap">
                          {t('alternativeAction')}:
                        </span>
                        <span>{localizeRecommendationText(rec.alternative_action, language)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors self-start whitespace-nowrap shadow-sm">
                  <span>{L.execute}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
