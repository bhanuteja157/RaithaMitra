// frontend/src/lib/digital-farming/i18n.ts
// Feature-specific English, Kannada, and Hindi labels (does not touch global translation system).

export type DFLanguage = 'en' | 'kn' | 'hi';

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
    title: 'Digital Farming & Geospatial Simulator',
    subtitle: 'Map your farmland, simulate crop growth, test weather risks, and optimize profit.',
    stepMap: '1. Map & Boundary',
    stepProfile: '2. Farm Profile',
    stepCrops: '3. Crop Advisor',
    stepSimulator: '4. Digital Simulator',
    stepFinanceReport: '5. Finance & Report',
    drawBoundary: 'Draw Farm Boundary',
    confirmFarm: 'Confirm Farmland',
    loadDemo: 'Load Tumakuru Demo (Fictional)',
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
    title: 'ಡಿಜಿಟಲ್ ಕೃಷಿ ಮತ್ತು ಜಮೀನು ಸಿಮ್ಯುಲೇಟರ್',
    subtitle: 'ನಿಮ್ಮ ಜಮೀನನ್ನು ನಕ್ಷೆಯಲ್ಲಿ ಗುರುತಿಸಿ, ಬೆಳೆ ಬೆಳವಣಿಗೆ ಹಾಗೂ ಲಾಭವನ್ನು ಅಂದಾಜಿಸಿ.',
    stepMap: '1. ನಕ್ಷೆ ಮತ್ತು ಗಡಿ',
    stepProfile: '2. ಜಮೀನು ವಿವರ',
    stepCrops: '3. ಬೆಳೆ ಸಲಹೆ',
    stepSimulator: '4. ಡಿಜಿಟಲ್ ಸಿಮ್ಯುಲೇಟರ್',
    stepFinanceReport: '5. ಲೆಕ್ಕಾಚಾರ ಮತ್ತು ವರದಿ',
    drawBoundary: 'ಜಮೀನಿನ ಗಡಿ ಗುರುತಿಸಿ',
    confirmFarm: 'ಜಮೀನು ದೃಢೀಕರಿಸಿ',
    loadDemo: 'ತುಮಕೂರು ಮಾದರಿ (ಕಾಲ್ಪನಿಕ)',
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
    title: 'डिजिटल खेती और भू-स्थानिक सिम्युलेटर',
    subtitle: 'अपने खेत की सीमा बनाएं, फसल वृद्धि का अनुकरण करें और लाभ का अनुमान लगाएं।',
    stepMap: '1. नक्शा और सीमा',
    stepProfile: '2. खेत विवरण',
    stepCrops: '3. फसल सलाह',
    stepSimulator: '4. डिजिटल सिम्युलेटर',
    stepFinanceReport: '5. वित्त और रिपोर्ट',
    drawBoundary: 'खेत की सीमा बनाएं',
    confirmFarm: 'खेत की पुष्टि करें',
    loadDemo: 'तुमकुरु डेमो (काल्पनिक)',
    startCultivation: 'खेती शुरू करें',
    play: 'चलाएं',
    pause: 'रोकें',
    nextDay: 'अगला दिन',
    advance7Days: '+7 दिन',
    completeHarvest: 'कटाई पूरी करें',
    analyzeBestSelling: 'सर्वोत्तम बिक्री रणनीति विश्लेषण',
    printReport: 'निर्णय रिपोर्ट प्रिंट करें',
  },
};
