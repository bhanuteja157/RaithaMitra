// frontend/src/app/decision-intelligence/page.tsx
'use client';

import React from 'react';
import { useFarm } from '@/context/FarmContext';
import { Language } from '@/types';
import { ActionPlan } from '@/components/dashboard/ActionPlan';
import { Compass, CheckCircle2, ShieldAlert } from 'lucide-react';

const DEC_I18N: Record<
  Language,
  {
    title: string;
    badge: string;
    subtitle: string;
    matrixTitle: string;
    matrixSub: string;
    rule1Title: string;
    rule1Desc: string;
    rule2Title: string;
    rule2Desc: string;
    rule3Title: string;
    rule3Desc: string;
  }
> = {
  en: {
    title: 'Centralized Decision Intelligence Engine',
    badge: 'Operational',
    subtitle: 'Multi-criteria optimization resolving conflicting agronomic, meteorological, and economic priorities',
    matrixTitle: 'Active Conflict Resolution Matrix',
    matrixSub: 'The engine continually evaluates cross-domain trade-offs:',
    rule1Title: 'Irrigation vs Rainfall:',
    rule1Desc: 'Suspends irrigation cycles if forecasted precipitation exceeds 15mm in 48 hours to conserve water & prevent root rot.',
    rule2Title: 'Spraying vs Wind Drift:',
    rule2Desc: 'Locks chemical application recommendations whenever wind speeds exceed 15 km/h to prevent spray drift and health hazards.',
    rule3Title: 'Market Timing vs Spoilage:',
    rule3Desc: 'Computes the optimum sell-or-store trade-off comparing mandi modal price gains against cold storage holding fees.',
  },
  kn: {
    title: 'ಕೇಂದ್ರೀಕೃತ ನಿರ್ಧಾರ ಬುದ್ಧಿಮತ್ತೆ ಎಂಜಿನ್',
    badge: 'ಸಕ್ರಿಯ',
    subtitle: 'ಕೃಷಿ, ಹವಾಮಾನ ಮತ್ತು ಆರ್ಥಿಕ ಆದ್ಯತೆಗಳ ನಡುವಿನ ಸಂಘರ್ಷಗಳನ್ನು ಪರಿಹರಿಸುವ ಬಹು-ಮಾನದಂಡ ವಿಶ್ಲೇಷಣೆ',
    matrixTitle: 'ಸಕ್ರಿಯ ಸಂಘರ್ಷ ಪರಿಹಾರ ಮ್ಯಾಟ್ರಿಕ್ಸ್',
    matrixSub: 'ಎಂಜಿನ್ ನಿರಂತರವಾಗಿ ವಿವಿಧ ಅಂಶಗಳನ್ನು ಪರಿಶೀಲಿಸುತ್ತದೆ:',
    rule1Title: 'ನೀರಾವರಿ vs ಮಳೆ:',
    rule1Desc: 'ಮುಂದಿನ 48 ಗಂಟೆಗಳಲ್ಲಿ 15 ಮಿ.ಮೀ ಗಿಂತ ಹೆಚ್ಚು ಮಳೆ ಮುನ್ಸೂಚನೆ ಇದ್ದರೆ ನೀರಾವರಿ ನಿಲ್ಲಿಸಿ ನೀರು ಉಳಿಸುತ್ತದೆ ಮತ್ತು ಬೇರು ಕೊಳೆಯುವುದನ್ನು ತಡೆಯುತ್ತದೆ.',
    rule2Title: 'ಸಿಂಪಡಣೆ vs ಗಾಳಿಯ ವೇಗ:',
    rule2Desc: 'ಗಾಳಿಯ ವೇಗ ಗಂಟೆಗೆ 15 ಕಿ.ಮೀ ಮೀರಿದಾಗ ಸಿಂಪಡಣೆ ಸಲಹೆಯನ್ನು ತಡೆಹಿಡಿದು ಔಷಧ ವ್ಯರ್ಥವಾಗುವುದನ್ನು ತಡೆಯುತ್ತದೆ.',
    rule3Title: 'ಮಾರಾಟ ಸಮಯ vs ಹಾಳಾಗುವಿಕೆ:',
    rule3Desc: 'ಮಂಡಿ ಬೆಲೆ ಲಾಭ ಮತ್ತು ಶೀತಲ ಗೃಹ ವೆಚ್ಚವನ್ನು ಹೋಲಿಸಿ ಉತ್ತಮ ಮಾರಾಟ ಅಥವಾ ಶೇಖರಣಾ ಸಮಯವನ್ನು ಲೆಕ್ಕಹಾಕುತ್ತದೆ.',
  },
  hi: {
    title: 'केंद्रीकृत निर्णय बुद्धिमत्ता इंजन',
    badge: 'सक्रिय',
    subtitle: 'कृषि, मौसम और आर्थिक प्राथमिकताओं के टकराव को सुलझाने वाला बहु-मानदंड अनुकूलन',
    matrixTitle: 'सक्रिय टकराव समाधान मैट्रिक्स',
    matrixSub: 'इंजन लगातार विभिन्न कृषि पहलुओं का संतुलन जाँचता है:',
    rule1Title: 'सिंचाई बनाम वर्षा:',
    rule1Desc: '48 घंटों में 15 मिमी से अधिक वर्षा पूर्वानुमान होने पर पानी बचाने और जड़ सड़न रोकने के लिए सिंचाई रोकता है।',
    rule2Title: 'छिड़काव बनाम तेज़ हवा:',
    rule2Desc: 'हवा की गति 15 किमी/घंटा से अधिक होने पर दवा के उड़ने व स्वास्थ्य जोखिम को रोकने हेतु छिड़काव सलाह रोकता है।',
    rule3Title: 'बाज़ार समय बनाम खराबी:',
    rule3Desc: 'मंडी भाव लाभ और कोल्ड स्टोरेज शुल्क की तुलना करके बेचने या रखने का सही निर्णय निकालता है।',
  },
  te: {
    title: 'కేంద్రీకృత నిర్ణయ మేధస్సు ఇంజిన్',
    badge: 'సక్రియం',
    subtitle: 'వ్యవసాయ, వాతావరణ మరియు ఆర్థిక ప్రాధాన్యతల మధ్య వైరుధ్యాలను పరిష్కరించే ఆప్టిమైజేషన్ ఇంజిన్',
    matrixTitle: 'క్రియాశీల వైరుధ్య పరిష్కార పట్టిక',
    matrixSub: 'ఇంజిన్ నిరంతరం వివిధ అంశాల మధ్య సమతుల్యతను అంచనా వేస్తుంది:',
    rule1Title: 'నీటిపారుదల vs వర్షపాతం:',
    rule1Desc: '48 గంటల్లో 15 మి.మీ కంటే ఎక్కువ వర్షం అంచనా ఉంటే నీటిని ఆదా చేయడానికి మరియు వేరు కుళ్ళును నివారించడానికి నీటిపారుదలను నిలిపివేస్తుంది.',
    rule2Title: 'పిచికారీ vs గాలి వేగం:',
    rule2Desc: 'గాలి వేగం గంటకు 15 కి.మీ దాటితే మందు వృథా మరియు ఆరోగ్య ప్రమాదాలను నివారించడానికి పిచికారీ సలహాను నిలిపివేస్తుంది.',
    rule3Title: 'మార్కెట్ సమయం vs నిల్వ నష్టం:',
    rule3Desc: 'మండి ధర లాభాలు మరియు కోల్డ్ స్టోరేజ్ ఖర్చులను పోల్చి అమ్మడం లేదా నిల్వ చేయడంపై సరైన నిర్ణయం ఇస్తుంది.',
  },
};

export default function DecisionIntelligencePage() {
  const { language } = useFarm();
  const t = DEC_I18N[language];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-rm-primary/10 dark:bg-rm-accent/20 text-rm-primary dark:text-rm-accent">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                {t.title}
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                {t.badge}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              {t.subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-2">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
          {t.matrixTitle}
        </h3>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {t.matrixSub}
        </p>
        <ul className="list-disc list-inside text-xs text-zinc-500 space-y-1">
          <li><strong>{t.rule1Title}</strong> {t.rule1Desc}</li>
          <li><strong>{t.rule2Title}</strong> {t.rule2Desc}</li>
          <li><strong>{t.rule3Title}</strong> {t.rule3Desc}</li>
        </ul>
      </div>

      {/* Render the full Action Plan */}
      <ActionPlan />
    </div>
  );
}
