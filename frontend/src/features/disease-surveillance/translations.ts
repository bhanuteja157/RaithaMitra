// frontend/src/features/disease-surveillance/translations.ts
/**
 * Self-contained multilingual labels for AD-40C (English, Kannada, Hindi, Telugu).
 * Kept modular inside disease-surveillance so global i18n files remain untouched during
 * parallel AD-34 / team integration.
 */

export type SurveillanceLang = 'en' | 'kn' | 'hi' | 'te';

export interface SurveillanceCopy {
  title: string;
  subtitle: string;
  liveModeLabel: string;
  demoModeLabel: string;
  demoBanner: string;
  regionalOverview: string;
  hotspotMap: string;
  personalizedRisk: string;
  outbreakClusters: string;
  reportDisease: string;
  nearbyReports: string;
  preventionGuidance: string;
  alertHistory: string;
  activityTrends: string;
  dataProvenance: string;
  radiusLabel: string;
  cropFilter: string;
  diseaseFilter: string;
  consentLabel: string;
  submitReport: string;
  acknowledge: string;
  dismiss: string;
  markRead: string;
  kvkDisclaimer: string;
  privacyNotice: string;
}

export const SURVEILLANCE_TRANSLATIONS: Record<SurveillanceLang, SurveillanceCopy> = {
  en: {
    title: 'Community Crop Disease Surveillance & Outbreak Intelligence',
    subtitle:
      'Privacy-preserving community disease signals, weather-aware risk assessment, and DBSCAN outbreak detection.',
    liveModeLabel: 'Live Community Data',
    demoModeLabel: 'Demonstration Scenario (Simulated)',
    demoBanner:
      'Isolated Demonstration Mode Active — Displaying simulated Mandya tomato/chilli scenarios strictly separated from live farmer reports.',
    regionalOverview: 'Regional Disease Overview',
    hotspotMap: 'Interactive Disease Hotspot Map (OSM)',
    personalizedRisk: 'Personalized Farm Risk Assessment',
    outbreakClusters: 'Suspected Clusters & Confirmed Outbreaks',
    reportDisease: 'Report Crop Disease Observation',
    nearbyReports: 'Nearby Community Observations',
    preventionGuidance: 'Scientific Prevention Guidance',
    alertHistory: 'Early Warning Alert History',
    activityTrends: '14-Day Disease Activity Trend',
    dataProvenance: 'Data Provenance & Confidence',
    radiusLabel: 'Monitoring Radius (km)',
    cropFilter: 'Crop',
    diseaseFilter: 'Disease Search',
    consentLabel:
      'I consent to share an anonymized regional alert (~1.5 km coarsened location, farm identity hidden) to warn neighbouring farmers.',
    submitReport: 'Submit Disease Observation',
    acknowledge: 'Acknowledge',
    dismiss: 'Dismiss',
    markRead: 'Mark Read',
    kvkDisclaimer:
      'Heuristic risk estimates are advisory indicators, not laboratory diagnoses. Consult your local Krishi Vigyan Kendra (KVK) before applying plant protection.',
    privacyNotice:
      'Exact farm coordinates and identities are masked in community views; only consenting farms contribute to regional heatmaps.',
  },
  kn: {
    title: 'ಸಮುದಾಯ ಬೆಳೆ ರೋಗ ಕಣ್ಗಾವಲು ಮತ್ತು ಮುನ್ನೆಚ್ಚರಿಕೆ ವ್ಯವಸ್ಥೆ',
    subtitle:
      'ಗೌಪ್ಯತೆ-ರಕ್ಷಿತ ಸಮುದಾಯ ರೋಗ ವರದಿಗಳು, ಹವಾಮಾನ ಆಧಾರಿತ ಅಪಾಯ ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ಪ್ರಾದೇಶಿಕ ರೋಗ ಗುಂಪು ಪತ್ತೆ.',
    liveModeLabel: 'ನೈಜ ಸಮುದಾಯ ಡೇಟಾ',
    demoModeLabel: 'ಪ್ರಾಯೋಗಿಕ ಪ್ರದರ್ಶನ (ಸಿಮ್ಯುಲೇಟೆಡ್)',
    demoBanner:
      'ಪ್ರತ್ಯೇಕ ಪ್ರದರ್ಶನ ಮೋಡ್ ಸಕ್ರಿಯವಾಗಿದೆ — ನೈಜ ರೈತರ ವರದಿಗಳಿಂದ ಪ್ರತ್ಯೇಕವಾದ ಪ್ರಾಯೋಗಿಕ ರೋಗ ದೃಶ್ಯಗಳನ್ನು ತೋರಿಸಲಾಗುತ್ತಿದೆ.',
    regionalOverview: 'ಪ್ರಾದೇಶಿಕ ರೋಗ ಅವಲೋಕನ',
    hotspotMap: 'ಸಂವಾದಾತ್ಮಕ ರೋಗ ಹಾಟ್‌ಸ್ಪಾಟ್ ನಕ್ಷೆ',
    personalizedRisk: 'ನಿಮ್ಮ ಜಮೀನಿನ ರೋಗ ಅಪಾಯ ಮೌಲ್ಯಮಾಪನ',
    outbreakClusters: 'ಶಂಕಿತ ಮತ್ತು ದೃಢಪಡಿಸಿದ ರೋಗ ಗುಂಪುಗಳು',
    reportDisease: 'ಬೆಳೆ ರೋಗ ವರದಿ ಸಲ್ಲಿಸಿ',
    nearbyReports: 'ಸಮೀಪದ ಸಮುದಾಯ ವರದಿಗಳು',
    preventionGuidance: 'ವೈಜ್ಞಾನಿಕ ತಡೆಗಟ್ಟುವ ಮಾರ್ಗದರ್ಶನ',
    alertHistory: 'ಮುನ್ನೆಚ್ಚರಿಕೆ ಎಚ್ಚರಿಕೆಗಳ ಇತಿಹಾಸ',
    activityTrends: '14-ದಿನಗಳ ರೋಗ ಚಟುವಟಿಕೆ ಪ್ರವೃತ್ತಿ',
    dataProvenance: 'ಮಾಹಿತಿ ಮೂಲ ಮತ್ತು ವಿಶ್ವಾಸಾರ್ಹತೆ',
    radiusLabel: 'ಕಣ್ಗಾವಲು ವ್ಯಾಪ್ತಿ (ಕಿ.ಮೀ)',
    cropFilter: 'ಬೆಳೆ',
    diseaseFilter: 'ರೋಗ ಹುಡುಕಾಟ',
    consentLabel:
      'ನೆರೆಯ ರೈತರಿಗೆ ಎಚ್ಚರಿಕೆ ನೀಡಲು ಅಂದಾಜು (~1.5 ಕಿ.ಮೀ) ಅನಾಮಧೇಯ ಮಾಹಿತಿಯನ್ನು ಹಂಚಿಕೊಳ್ಳಲು ನನ್ನ ಒಪ್ಪಿಗೆ ಇದೆ.',
    submitReport: 'ರೋಗ ವರದಿ ಸಲ್ಲಿಸಿ',
    acknowledge: 'ದೃಢೀಕರಿಸಿ',
    dismiss: 'ವಜಾಗೊಳಿಸಿ',
    markRead: 'ಓದಲಾಗಿದೆ',
    kvkDisclaimer:
      'ಇದು ಹವಾಮಾನ ಮತ್ತು ಸಮುದಾಯ ಆಧಾರಿತ ಮುನ್ನೆಚ್ಚರಿಕೆ ಸೂಚಕವಾಗಿದೆ. ರಾಸಾಯನಿಕ ಸಿಂಪಡಣೆಗೆ ಮೊದಲು ಕೃಷಿ ವಿಜ್ಞಾನ ಕೇಂದ್ರ (KVK) ತಜ್ಞರನ್ನು ಸಂಪರ್ಕಿಸಿ.',
    privacyNotice:
      'ಸಮುದಾಯ ನಕ್ಷೆಯಲ್ಲಿ ರೈತರ ನಿಖರ ವಿಳಾಸ ಮತ್ತು ಗುರುತನ್ನು ಗೌಪ್ಯವಾಗಿಡಲಾಗುತ್ತದೆ.',
  },
  hi: {
    title: 'सामुदायिक फसल रोग निगरानी और प्रकोप पूर्वानुमान',
    subtitle:
      'गोपनीयता-सुरक्षित सामुदायिक रोग रिपोर्ट, मौसम-आधारित जोखिम आकलन और क्षेत्रीय क्लस्टर पहचान।',
    liveModeLabel: 'लाइव सामुदायिक डेटा',
    demoModeLabel: 'डेमो परिदृश्य (सिम्युलेटेड)',
    demoBanner:
      'अलग डेमो मोड सक्रिय — लाइव किसान रिपोर्ट से पूर्णतः पृथक नकली प्रकोप परिदृश्य प्रदर्शित किया जा रहा है।',
    regionalOverview: 'क्षेत्रीय रोग अवलोकन',
    hotspotMap: 'इंटरैक्टिव रोग हॉटस्पॉट मानचित्र',
    personalizedRisk: 'व्यक्तिगत खेत रोग जोखिम आकलन',
    outbreakClusters: 'संदिग्ध क्लस्टर और पुष्ट प्रकोप',
    reportDisease: 'फसल रोग निरीक्षण दर्ज करें',
    nearbyReports: 'नजदीकी सामुदायिक रिपोर्ट',
    preventionGuidance: 'वैज्ञानिक रोकथाम मार्गदर्शन',
    alertHistory: 'प्रारंभिक चेतावनी इतिहास',
    activityTrends: '14-दिन रोग गतिविधि रुझान',
    dataProvenance: 'डेटा स्रोत और विश्वसनीयता',
    radiusLabel: 'निगरानी दायरा (किमी)',
    cropFilter: 'फसल',
    diseaseFilter: 'रोग खोजें',
    consentLabel:
      'मैं पड़ोसी किसानों को सतर्क करने के लिए गुमनाम क्षेत्रीय जानकारी (~1.5 किमी अनुमानित स्थान) साझा करने की सहमति देता हूँ।',
    submitReport: 'रोग रिपोर्ट सबमिट करें',
    acknowledge: 'स्वीकार करें',
    dismiss: 'हटाएँ',
    markRead: 'पढ़ा गया',
    kvkDisclaimer:
      'यह एक अनुमानित जोखिम संकेतक है, प्रयोगशाला निदान नहीं। छिड़काव से पहले स्थानीय कृषि विज्ञान केंद्र (KVK) से पुष्टि करें।',
    privacyNotice:
      'सामुदायिक दृश्य में सटीक खेत निर्देशांक और किसान पहचान गोपनीय रखे जाते हैं।',
  },
  te: {
    title: 'కమ్యూనిటీ పంట వ్యాధి పర్యవేక్షణ మరియు వ్యాప్తి ముందస్తు హెచ్చరిక',
    subtitle:
      'గోప్యతతో కూడిన రైతు నివేదికలు, వాతావరణ ఆధారిత ప్రమాద అంచనా మరియు ప్రాంతీయ క్లస్టర్ గుర్తింపు.',
    liveModeLabel: 'లైవ్ కమ్యూనిటీ డేటా',
    demoModeLabel: 'డెమో విధానం (సిమ్యులేటెడ్)',
    demoBanner:
      'ప్రత్యేక డెమో మోడ్ సక్రియంగా ఉంది — లైవ్ రైతు నివేదికలతో కలవని నమూనా వ్యాధి దృశ్యం చూపబడుతోంది.',
    regionalOverview: 'ప్రాంతీయ వ్యాధి సమీక్ష',
    hotspotMap: 'ఇంటరాక్టివ్ వ్యాధి హాట్‌స్పాట్ మ్యాప్',
    personalizedRisk: 'మీ పొలం వ్యాధి ప్రమాద అంచనా',
    outbreakClusters: 'అనుమానిత క్లస్టర్లు మరియు నిర్ధారిత వ్యాప్తి',
    reportDisease: 'పంట వ్యాధి నివేదిక నమోదు చేయండి',
    nearbyReports: 'సమీప కమ్యూనిటీ నివేదికలు',
    preventionGuidance: 'శాస్త్రీయ నివారణ సూచనలు',
    alertHistory: 'ముందస్తు హెచ్చరికల చరిత్ర',
    activityTrends: '14-రోజుల వ్యాధి కార్యకలాప ధోరణి',
    dataProvenance: 'డేటా మూలం మరియు విశ్వసనీయత',
    radiusLabel: 'పర్యవేక్షణ పరిధి (కి.మీ)',
    cropFilter: 'పంట',
    diseaseFilter: 'వ్యాధి శోధన',
    consentLabel:
      'పొరుగు రైతులను అప్రమత్తం చేయడానికి అనామక ప్రాంతీయ సమాచారాన్ని (~1.5 కి.మీ అంచనా స్థానం) పంచుకోవడానికి నాకు సమ్మతి ఉంది.',
    submitReport: 'నివేదికను సమర్పించండి',
    acknowledge: 'అంగీకరించండి',
    dismiss: 'తొలగించండి',
    markRead: 'చదివినట్లు గుర్తించు',
    kvkDisclaimer:
      'ఇది వాతావరణ మరియు ప్రాంతీయ సూచిక మాత్రమే; ప్రయోగశాల నిర్ధారణ కాదు. పిచికారీ ముందు స్థానిక KVK శాస్త్రవేత్తను సంప్రదించండి.',
    privacyNotice:
      'కమ్యూనిటీ మ్యాప్‌లో రైతుల వ్యక్తిగత వివరాలు మరియు ఖచ్చితమైన పొలం కోఆర్డినేట్లు దాచబడతాయి.',
  },
};
