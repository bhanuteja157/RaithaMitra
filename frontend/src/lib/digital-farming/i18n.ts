// frontend/src/lib/digital-farming/i18n.ts
// Feature-specific English, Kannada, Hindi, and Telugu labels synced with global Language.
import { Language } from '@/types';

export type DFLanguage = Language;

export interface DFLabels {
  title: string;
  subtitle: string;
  stepMap: string;
  stepProfile: string;
  stepCrops: string;
  stepSimulator: string;
  stepFinanceReport: string;
  drawBoundary: string;
  confirmFarm: string;
  loadDemo: string;
  startCultivation: string;
  play: string;
  pause: string;
  nextDay: string;
  advance7Days: string;
  completeHarvest: string;
  analyzeBestSelling: string;
  printReport: string;
}

export const DF_I18N: Record<DFLanguage, DFLabels> = {
  en: {
    title: 'Digital Farming & Satellite Twin',
    subtitle: 'Map your farmland, inspect real Sentinel-2 satellite trends, simulate crop growth, and optimize profit.',
    stepMap: '1. Map & Boundary',
    stepProfile: '2. Farm Profile',
    stepCrops: '3. Crop Advisor',
    stepSimulator: '4. Satellite & 3D Twin',
    stepFinanceReport: '5. Finance & Report',
    drawBoundary: 'Draw Farm Boundary',
    confirmFarm: 'Confirm Farmland',
    loadDemo: 'Load Tumakuru Demo Parcel',
    startCultivation: 'Start Cultivation',
    play: 'Play',
    pause: 'Pause',
    nextDay: 'Next Day',
    advance7Days: '+7 Days',
    completeHarvest: 'Complete Harvest',
    analyzeBestSelling: 'Analyze Best Selling Strategy',
    printReport: 'Print Decision Report',
  },
  kn: {
    title: 'ಡಿಜಿಟಲ್ ಕೃಷಿ ಮತ್ತು ಉಪಗ್ರಹ ಜಮೀನು',
    subtitle: 'ನಿಮ್ಮ ಜಮೀನನ್ನು ನಕ್ಷೆಯಲ್ಲಿ ಗುರುತಿಸಿ, ನೈಜ ಉಪಗ್ರಹ ಮಾಹಿತಿ ಮತ್ತು 3D ಬೆಳೆ ಬೆಳವಣಿಗೆಯನ್ನು ನೋಡಿ.',
    stepMap: '1. ನಕ್ಷೆ ಮತ್ತು ಗಡಿ',
    stepProfile: '2. ಜಮೀನು ವಿವರ',
    stepCrops: '3. ಬೆಳೆ ಸಲಹೆ',
    stepSimulator: '4. ಉಪಗ್ರಹ ಮತ್ತು 3D ಜಮೀನು',
    stepFinanceReport: '5. ಲೆಕ್ಕಾಚಾರ ಮತ್ತು ವರದಿ',
    drawBoundary: 'ಜಮೀನಿನ ಗಡಿ ಗುರುತಿಸಿ',
    confirmFarm: 'ಜಮೀನು ದೃಢೀಕರಿಸಿ',
    loadDemo: 'ತುಮಕೂರು ಮಾದರಿ ಜಮೀನು',
    startCultivation: 'ಕೃಷಿ ಪ್ರಾರಂಭಿಸಿ',
    play: 'ಚಾಲನೆ',
    pause: 'ವಿರಾಮ',
    nextDay: 'ಮುಂದಿನ ದಿನ',
    advance7Days: '+7 ದಿನಗಳು',
    completeHarvest: 'ಕೊಯ್ಲು ಪೂರ್ಣಗೊಳಿಸಿ',
    analyzeBestSelling: 'ಉತ್ತಮ ಮಾರಾಟ ತಂತ್ರ ವಿಶ್ಲೇಷಿಸಿ',
    printReport: 'ವರದಿ ಮುದ್ರಿಸಿ',
  },
  hi: {
    title: 'डिजिटल खेती और उपग्रह ट्विन',
    subtitle: 'अपने खेत की सीमा बनाएं, असली उपग्रह NDVI देखें, फसल विकास का 3D मॉडल चलाएं और लाभ बढ़ाएं।',
    stepMap: '1. नक्शा और सीमा',
    stepProfile: '2. खेत विवरण',
    stepCrops: '3. फसल सलाह',
    stepSimulator: '4. उपग्रह व 3D मॉडल',
    stepFinanceReport: '5. वित्त और रिपोर्ट',
    drawBoundary: 'खेत की सीमा बनाएं',
    confirmFarm: 'खेत की पुष्टि करें',
    loadDemo: 'तुमकुरु डेमो खेत',
    startCultivation: 'खेती शुरू करें',
    play: 'चलाएं',
    pause: 'रोकें',
    nextDay: 'अगला दिन',
    advance7Days: '+7 दिन',
    completeHarvest: 'कटाई पूरी करें',
    analyzeBestSelling: 'सर्वोत्तम बिक्री रणनीति विश्लेषण',
    printReport: 'निर्णय रिपोर्ट प्रिंट करें',
  },
  te: {
    title: 'డిజిటల్ వ్యవసాయం & ఉపగ్రహ ట్విన్',
    subtitle: 'మీ పొలం సరిహద్దును గీసి, నిజమైన ఉపగ్రహ డేటా మరియు 3D పంట పెరుగుదలను చూడండి.',
    stepMap: '1. మ్యాప్ & సరిహద్దు',
    stepProfile: '2. పొలం వివరాలు',
    stepCrops: '3. పంట సలహా',
    stepSimulator: '4. ఉపగ్రహ & 3D ట్విన్',
    stepFinanceReport: '5. ఆర్థికం & నివేదిక',
    drawBoundary: 'పొలం సరిహద్దు గీయండి',
    confirmFarm: 'పొలాన్ని నిర్ధారించండి',
    loadDemo: 'తుమకూరు నమూనా పొలం',
    startCultivation: 'సాగు ప్రారంభించండి',
    play: 'ప్లే చేయండి',
    pause: 'ఆపండి',
    nextDay: 'తదుపరి రోజు',
    advance7Days: '+7 రోజులు',
    completeHarvest: 'కోత పూర్తి చేయండి',
    analyzeBestSelling: 'ఉత్తమ అమ్మకపు వ్యూహం చూడండి',
    printReport: 'నివేదిక ప్రింట్ చేయండి',
  },
};
