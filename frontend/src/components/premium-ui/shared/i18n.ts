// frontend/src/components/premium-ui/shared/i18n.ts
// Feature-specific English, Kannada, and Hindi labels for Premium UI components.

export type PremiumLang = 'en' | 'kn' | 'hi';

export const PREMIUM_I18N: Record<
  PremiumLang,
  {
    tagline: string;
    intro: string;
    welcomeBack: string;
    signIn: string;
    createAccount: string;
    chooseRole: string;
    findWork: string;
    myJobs: string;
    myEarnings: string;
    myProfile: string;
    planBeforePlant: string;
    startDigitalFarming: string;
    openMarketIntel: string;
  }
> = {
  en: {
    tagline: 'From Seed to Sale, One Intelligent Companion.',
    intro: 'Scientific intelligence, agricultural opportunities and smarter decisions for every farmer.',
    welcomeBack: 'Welcome Back',
    signIn: 'Sign In',
    createAccount: 'Create Account',
    chooseRole: 'Choose Your Role in RaithaMitra',
    findWork: 'Find Work',
    myJobs: 'My Jobs',
    myEarnings: 'My Earnings',
    myProfile: 'My Profile',
    planBeforePlant: 'Plan Your Farm Before You Plant.',
    startDigitalFarming: 'Start Digital Farming',
    openMarketIntel: 'Open Market Intelligence',
  },
  kn: {
    tagline: 'ಬೀಜದಿಂದ ಮಾರಾಟದವರೆಗೆ, ಒಂದು ಬುದ್ಧಿವಂತ ಸಂಗಾತಿ.',
    intro: 'ಪ್ರತಿ ರೈತರಿಗೂ ವೈಜ್ಞಾನಿಕ ಬುದ್ಧಿವಂತಿಕೆ, ಕೃಷಿ ಅವಕಾಶಗಳು ಮತ್ತು ಉತ್ತಮ ನಿರ್ಧಾರಗಳು.',
    welcomeBack: 'ಮರಳಿ ಸ್ವಾಗತ',
    signIn: 'ಸೈನ್ ಇನ್',
    createAccount: 'ಖಾತೆ ತೆರೆಯಿರಿ',
    chooseRole: 'ರೈತ ಮಿತ್ರದಲ್ಲಿ ನಿಮ್ಮ ಪಾತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    findWork: 'ಕೆಲಸ ಹುಡುಕಿ',
    myJobs: 'ನನ್ನ ಕೆಲಸಗಳು',
    myEarnings: 'ನನ್ನ ಆದಾಯ',
    myProfile: 'ನನ್ನ ಪ್ರೊಫೈಲ್',
    planBeforePlant: 'ಬಿತ್ತುವ ಮೊದಲು ನಿಮ್ಮ ಜಮೀನನ್ನು ಯೋಜಿಸಿ.',
    startDigitalFarming: 'ಡಿಜಿಟಲ್ ಕೃಷಿ ಪ್ರಾರಂಭಿಸಿ',
    openMarketIntel: 'ಮಾರುಕಟ್ಟೆ ಬುದ್ಧಿವಂತಿಕೆ ತೆರೆಯಿರಿ',
  },
  hi: {
    tagline: 'बीज से बिक्री तक, एक बुद्धिमान साथी।',
    intro: 'हर किसान के लिए वैज्ञानिक बुद्धिमत्ता, कृषि अवसर और बेहतर निर्णय।',
    welcomeBack: 'वापसी पर स्वागत है',
    signIn: 'साइन इन करें',
    createAccount: 'खाता बनाएं',
    chooseRole: 'रायतामित्र में अपनी भूमिका चुनें',
    findWork: 'काम खोजें',
    myJobs: 'मेरे काम',
    myEarnings: 'मेरी कमाई',
    myProfile: 'मेरी प्रोफ़ाइल',
    planBeforePlant: 'बुवाई से पहले अपने खेत की योजना बनाएं।',
    startDigitalFarming: 'डिजिटल खेती शुरू करें',
    openMarketIntel: 'मार्केट इंटेलिजेंस खोलें',
  },
};
