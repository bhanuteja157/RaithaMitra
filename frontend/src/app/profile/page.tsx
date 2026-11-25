// frontend/src/app/profile/page.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useFarm } from '@/context/FarmContext';
import { UserRole, Language } from '@/types';
import { localizeCondition, localizeCropName, localizeGrowthStage } from '@/lib/translations';
import { SmartLocationSelector } from '@/components/location/SmartLocationSelector';
import {
  User,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Sprout,
  Building2,
  Users,
  Truck,
  Sparkles,
  ArrowRight,
  LogOut,
  Layers,
  Coins,
  CheckCircle2
} from 'lucide-react';

const PROFILE_I18N: Record<
  Language,
  {
    userFallback: string;
    demoPrefix: string;
    accountSuffix: string;
    signOut: string;
    judgingTitle: string;
    judgingDesc: string;
    active: string;
    availCapabilities: string;
    currentActiveBtn: string;
    openPrefix: string;
    accountInfoTitle: string;
    fullName: string;
    email: string;
    mobilePhone: string;
    verifiedRole: string;
    locationLabel: string;
    roleSecTitle: string;
    roleSecDescPrefix: string;
    roleSecDescSuffix: string;
    backendVerifiedActive: string;
    roleSecNote: string;
    holdingsTitle: string;
    primaryFarm: string;
    totalCultArea: string;
    hectares: string;
    activeCrop: string;
    waterInfra: string;
    editLocPrefix: string;
    editLocSub: string;
    personas: Record<
      string,
      {
        title: string;
        subtitle: string;
        desc: string;
        capabilities: string[];
      }
    >;
  }
> = {
  en: {
    userFallback: 'User Profile',
    demoPrefix: 'Demo',
    accountSuffix: 'Account',
    signOut: 'Sign Out',
    judgingTitle: 'Judging Evaluation: Interactive Multi-Role Hub',
    judgingDesc:
      'Click "Open Dashboard" on any role card below to immediately activate that persona, update the full navigation sidebar, and launch its functional role-specific workflow.',
    active: 'Active',
    availCapabilities: 'Available Capabilities:',
    currentActiveBtn: 'Current Dashboard Active',
    openPrefix: 'Open',
    accountInfoTitle: 'Account Information',
    fullName: 'Full Name:',
    email: 'Email:',
    mobilePhone: 'Mobile Phone:',
    verifiedRole: 'Verified Role:',
    locationLabel: 'Location:',
    roleSecTitle: 'Role Security & Authorization',
    roleSecDescPrefix: 'Your session is cryptographically bound to your registered',
    roleSecDescSuffix: 'role. Privilege escalation by modifying client storage is blocked at the backend API layer.',
    backendVerifiedActive: 'Backend Role Verification Active',
    roleSecNote: 'To access another role (e.g. Buyer or Labour), please sign out and log into an account registered with those credentials.',
    holdingsTitle: 'Agricultural Holdings & Cultivation Context',
    primaryFarm: 'Primary Farm',
    totalCultArea: 'Total Cultivable Area',
    hectares: 'Hectares',
    activeCrop: 'Active Crop',
    waterInfra: 'Water Infrastructure',
    editLocPrefix: 'Edit Farm Location —',
    editLocSub: 'Adjust your agricultural parcel coordinates. Changes update weather, climate, satellite, and nursery discovery.',
    personas: {
      farmer: {
        title: 'Farmer Persona',
        subtitle: 'Cauvery Valley Farm (Mandya)',
        desc: 'Agricultural producer with 2.5 ha Tomato crop under drip irrigation.',
        capabilities: [
          'BioIntel Biotechnology Research & Varietal Evidence',
          'Intelligent Nursery Discovery & Direct Inquiries',
          'Smart Bidding Produce Listing & Bid Acceptance',
          'Agricultural Labour Job Posting & Hiring',
          'Smart Irrigation (FAO-56 Dual Kc Water Balance)',
        ],
      },
      buyer: {
        title: 'Buyer Persona',
        subtitle: 'Yeshwanthpur APMC Wholesale Yard',
        desc: 'Licensed commercial buyer bidding on verified farm-gate produce lots.',
        capabilities: [
          'Browse Verified Produce Lots by Crop & Location',
          'Submit Competitive Bids & Outbid Competitors',
          'Generate Legally Enforceable Purchase Orders',
          'Arrange Direct Freight Transport for Purchases',
          'Monitor Supply Chain Delivery Milestones',
        ],
      },
      labour: {
        title: 'Labour Persona',
        subtitle: 'Mandya Rural Employment Circle',
        desc: 'Agricultural specialist skilled in harvesting, transplantation and weeding.',
        capabilities: [
          'Mobile-First Daily Farm Work Discovery',
          '1-Click Job Application for Nearby Openings',
          'Guaranteed Direct Daily Wage Tracking',
          'Confirmed Employment Schedule & Hours',
          'Agricultural Skill Profile Management',
        ],
      },
      driver: {
        title: 'Driver Persona',
        subtitle: 'State Highway Logistics Hub',
        desc: 'Independent cargo carrier operating Tata Ace (1500 kg capacity).',
        capabilities: [
          'Discover Farm Produce Freight Requests',
          'Accept or Reject Booking Inquiries',
          'Milestone Updates: Picked Up, In Transit, Delivered',
          'Declared Vehicle Capacity & Rate Management',
          'Real-Time Transport Earnings Tracking',
        ],
      },
    },
  },
  kn: {
    userFallback: 'ಬಳಕೆದಾರರ ಪ್ರೊಫೈಲ್',
    demoPrefix: 'ಡೆಮೊ',
    accountSuffix: 'ಖಾತೆ',
    signOut: 'ಸೈನ್ ಔಟ್',
    judgingTitle: 'ಪರೀಕ್ಷಾ ಮೌಲ್ಯಮಾಪನ: ಬಹು-ಪಾತ್ರ ಕೇಂದ್ರ',
    judgingDesc:
      'ಕೆಳಗಿನ ಯಾವುದೇ ಪಾತ್ರದ ಕಾರ್ಡ್‌ನಲ್ಲಿ "ತೆರೆಯಿರಿ" ಕ್ಲಿಕ್ ಮಾಡಿದರೆ ತಕ್ಷಣ ಆ ಖಾತೆ ಸಕ್ರಿಯವಾಗಿ ಸಂಬಂಧಿತ ಮೆನು ಮತ್ತು ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ತೆರೆಯುತ್ತದೆ.',
    active: 'ಸಕ್ರಿಯ',
    availCapabilities: 'ಲಭ್ಯವಿರುವ ಸೌಲಭ್ಯಗಳು:',
    currentActiveBtn: 'ಪ್ರಸ್ತುತ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಸಕ್ರಿಯವಾಗಿದೆ',
    openPrefix: 'ತೆರೆಯಿರಿ:',
    accountInfoTitle: 'ಖಾತೆಯ ವಿವರಗಳು',
    fullName: 'ಪೂರ್ಣ ಹೆಸರು:',
    email: 'ಇಮೇಲ್:',
    mobilePhone: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ:',
    verifiedRole: 'ಪರಿಶೀಲಿಸಿದ ಪಾತ್ರ:',
    locationLabel: 'ಸ್ಥಳ:',
    roleSecTitle: 'ಪಾತ್ರ ಭದ್ರತೆ ಮತ್ತು ಅಧಿಕಾರ',
    roleSecDescPrefix: 'ನಿಮ್ಮ ಸೆಷನ್ ನಿಮ್ಮ ನೋಂದಾಯಿತ',
    roleSecDescSuffix: 'ಪಾತ್ರಕ್ಕೆ ಸುರಕ್ಷಿತವಾಗಿ ಬದ್ಧವಾಗಿದೆ. ಬ್ರೌಸರ್ ಸಂಗ್ರಹ ಬದಲಾವಣೆಯಿಂದ ಪಾತ್ರ ಬದಲಾವಣೆ ಸಾಧ್ಯವಿಲ್ಲ.',
    backendVerifiedActive: 'ಬ್ಯಾಕೆಂಡ್ ಪಾತ್ರ ಪರಿಶೀಲನೆ ಸಕ್ರಿಯವಾಗಿದೆ',
    roleSecNote: 'ಬೇರೆ ಪಾತ್ರಕ್ಕೆ (ಉದಾ. ಖರೀದಿದಾರ ಅಥವಾ ಕಾರ್ಮಿಕ) ಪ್ರವೇಶಿಸಲು, ದಯವಿಟ್ಟು ಸೈನ್ ಔಟ್ ಮಾಡಿ ಆ ಖಾತೆಯಿಂದ ಲಾಗಿನ್ ಆಗಿ.',
    holdingsTitle: 'ಕೃಷಿ ಜಮೀನು ಮತ್ತು ಬೆಳೆ ವಿವರಗಳು',
    primaryFarm: 'ಪ್ರಮುಖ ಜಮೀನು',
    totalCultArea: 'ಒಟ್ಟು ಸಾಗುವಳಿ ವಿಸ್ತೀರ್ಣ',
    hectares: 'ಹೆಕ್ಟೇರ್',
    activeCrop: 'ಪ್ರಸ್ತುತ ಬೆಳೆ',
    waterInfra: 'ನೀರಾವರಿ ವ್ಯವಸ್ಥೆ',
    editLocPrefix: 'ಜಮೀನು ಸ್ಥಳ ಬದಲಾಯಿಸಿ —',
    editLocSub: 'ನಿಮ್ಮ ಹೊಲದ ನಿರ್ದೇಶಾಂಕಗಳನ್ನು ಸರಿಹೊಂದಿಸಿ. ಇದು ಹವಾಮಾನ, ಉಪಗ್ರಹ ಮತ್ತು ನರ್ಸರಿ ಮಾಹಿತಿಯನ್ನು ನವೀಕರಿಸುತ್ತದೆ.',
    personas: {
      farmer: {
        title: 'ರೈತ ಖಾತೆ',
        subtitle: 'ಕಾವೇರಿ ಕಣಿವೆ ಜಮೀನು (ಮಂಡ್ಯ)',
        desc: 'ಹನಿ ನೀರಾವರಿಯಲ್ಲಿ 2.5 ಹೆಕ್ಟೇರ್ ಟೊಮೆಟೊ ಬೆಳೆಯುತ್ತಿರುವ ರೈತ.',
        capabilities: [
          'BioIntel ತಳಿ ಸಂಶೋಧನೆ ಮತ್ತು ವೈಜ್ಞಾನಿಕ ಪುರಾವೆ',
          'ಹತ್ತಿರದ ನರ್ಸರಿ ಹುಡುಕಾಟ ಮತ್ತು ನೇರ ಸಂಪರ್ಕ',
          'ಸ್ಮಾರ್ಟ್ ಹರಾಜು ಬೆಳೆ ಪಟ್ಟಿ ಮತ್ತು ಬಿಡ್ ಸ್ವೀಕಾರ',
          'ಕೃಷಿ ಕಾರ್ಮಿಕರ ನೇಮಕಾತಿ ಮತ್ತು ಉದ್ಯೋಗ ಪೋಸ್ಟಿಂಗ್',
          'ಸ್ಮಾರ್ಟ್ ನೀರಾವರಿ (FAO-56 ನೀರಿನ ಸಮತೋಲನ)',
        ],
      },
      buyer: {
        title: 'ಖರೀದಿದಾರ ಖಾತೆ',
        subtitle: 'ಯಶವಂತಪುರ APMC ಸಗಟು ಮಾರುಕಟ್ಟೆ',
        desc: 'ರೈತರ ಬೆಳೆ ಲಾಟ್‌ಗಳ ಮೇಲೆ ಬಿಡ್ ಮಾಡುವ ಪರವಾನಗಿ ಪಡೆದ ವ್ಯಾಪಾರಿ.',
        capabilities: [
          'ಬೆಳೆ ಮತ್ತು ಸ್ಥಳದ ಪ್ರಕಾರ ಲಾಟ್‌ಗಳನ್ನು ಹುಡುಕಿ',
          'ಸ್ಪರ್ಧಾತ್ಮಕ ಬಿಡ್ ಸಲ್ಲಿಸಿ ಮತ್ತು ಹರಾಜಿನಲ್ಲಿ ಭಾಗವಹಿಸಿ',
          'ಅಧಿಕೃತ ಖರೀದಿ ಆದೇಶಗಳನ್ನು ಪಡೆಯಿರಿ',
          'ಖರೀದಿಸಿದ ಬೆಳೆಗೆ ನೇರ ಸರಕು ಸಾರಿಗೆ ವ್ಯವಸ್ಥೆ ಮಾಡಿ',
          'ಸರಕು ತಲುಪುವ ಹಂತಗಳನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ',
        ],
      },
      labour: {
        title: 'ಕಾರ್ಮಿಕ ಖಾತೆ',
        subtitle: 'ಮಂಡ್ಯ ಗ್ರಾಮೀಣ ಉದ್ಯೋಗ ವಲಯ',
        desc: 'ಕೊಯ್ಲು, ನಾಟಿ ಮತ್ತು ಕಳೆ ತೆಗೆಯುವ ಕೆಲಸದಲ್ಲಿ ಪರಿಣಿತ ಕೃಷಿ ಕಾರ್ಮಿಕ.',
        capabilities: [
          'ಮೊಬೈಲ್‌ನಲ್ಲಿ ಹತ್ತಿರದ ದಿನಗೂಲಿ ಕೃಷಿ ಕೆಲಸ ಹುಡುಕಾಟ',
          'ಹತ್ತಿರದ ಕೆಲಸಗಳಿಗೆ 1-ಕ್ಲಿಕ್ ಅರ್ಜಿ ಸಲ್ಲಿಕೆ',
          'ದೈನಂದಿನ ಕೂಲಿ ಗಳಿಕೆಯ ಟ್ರ್ಯಾಕಿಂಗ್',
          'ದೃಢೀಕೃತ ಕೆಲಸದ ವೇಳಾಪಟ್ಟಿ ನೋಟ',
          'ಕೌಶಲ್ಯ ಪ್ರೊಫೈಲ್ ನಿರ್ವಹಣೆ',
        ],
      },
      driver: {
        title: 'ಚಾಲಕ ಖಾತೆ',
        subtitle: 'ರಾಜ್ಯ ಹೆದ್ದಾರಿ ಸಾರಿಗೆ ಕೇಂದ್ರ',
        desc: 'ಟಾಟಾ ಏಸ್ (1500 ಕೆಜಿ ಸಾಮರ್ಥ್ಯ) ಹೊಂದಿರುವ ಸ್ವತಂತ್ರ ಸರಕು ಸಾಗಾಣಿಕೆದಾರ.',
        capabilities: [
          'ರೈತರ ಸರಕು ಸಾಗಾಣಿಕೆ ವಿನಂತಿಗಳನ್ನು ನೋಡಿ',
          'ಬುಕಿಂಗ್ ವಿನಂತಿಗಳನ್ನು ಸ್ವೀಕರಿಸಿ ಅಥವಾ ತಿರಸ್ಕರಿಸಿ',
          'ಟ್ರಿಪ್ ಹಂತಗಳನ್ನು ನವೀಕರಿಸಿ: ಪಿಕಪ್, ದಾರಿ, ತಲುಪಿದೆ',
          'ವಾಹನ ಸಾಮರ್ಥ್ಯ ಮತ್ತು ಪ್ರತಿ ಕಿ.ಮೀ ದರ ನಿರ್ವಹಣೆ',
          'ನೇರ ಸಾರಿಗೆ ಗಳಿಕೆಯ ಟ್ರ್ಯಾಕಿಂಗ್',
        ],
      },
    },
  },
  hi: {
    userFallback: 'उपयोगकर्ता प्रोफ़ाइल',
    demoPrefix: 'डेमो',
    accountSuffix: 'खाता',
    signOut: 'साइन आउट',
    judgingTitle: 'निर्णायक मूल्यांकन: इंटरैक्टिव बहु-भूमिका केंद्र',
    judgingDesc:
      'नीचे किसी भी भूमिका कार्ड पर क्लिक करने पर वह व्यक्ति तुरंत सक्रिय हो जाता है, पूरा नेविगेशन बदलता है और उसका डैशबोर्ड खुलता है।',
    active: 'सक्रिय',
    availCapabilities: 'उपलब्ध सुविधाएं:',
    currentActiveBtn: 'वर्तमान डैशबोर्ड सक्रिय',
    openPrefix: 'खोलें:',
    accountInfoTitle: 'खाता जानकारी',
    fullName: 'पूरा नाम:',
    email: 'ईमेल:',
    mobilePhone: 'मोबाइल नंबर:',
    verifiedRole: 'सत्यापित भूमिका:',
    locationLabel: 'स्थान:',
    roleSecTitle: 'भूमिका सुरक्षा व प्राधिकरण',
    roleSecDescPrefix: 'आपका सत्र आपकी पंजीकृत',
    roleSecDescSuffix: 'भूमिका से सुरक्षित रूप से जुड़ा है। बैकएंड API स्तर पर अनधिकृत भूमिका परिवर्तन अवरुद्ध है।',
    backendVerifiedActive: 'बैकएंड भूमिका सत्यापन सक्रिय',
    roleSecNote: 'किसी अन्य भूमिका (जैसे खरीदार या श्रमिक) तक पहुँचने के लिए साइन आउट करके उस खाते से लॉग इन करें।',
    holdingsTitle: 'कृषि भूमि व खेती विवरण',
    primaryFarm: 'मुख्य खेत',
    totalCultArea: 'कुल कृषि क्षेत्रफल',
    hectares: 'हेक्टेयर',
    activeCrop: 'सक्रिय फसल',
    waterInfra: 'सिंचाई व्यवस्था',
    editLocPrefix: 'खेत स्थान बदलें —',
    editLocSub: 'अपने खेत के निर्देशांक समायोजित करें। इससे मौसम, उपग्रह और नर्सरी खोज अपडेट होती है।',
    personas: {
      farmer: {
        title: 'किसान प्रोफ़ाइल',
        subtitle: 'कावेरी वैली फार्म (मंड्या)',
        desc: 'ड्रिप सिंचाई के साथ 2.5 हेक्टेयर टमाटर उगाने वाले किसान।',
        capabilities: [
          'BioIntel जैव-प्रौद्योगिकी अनुसंधान व किस्म प्रमाण',
          'स्मार्ट नर्सरी खोज व सीधे संपर्क',
          'स्मार्ट बोली उपज सूचीकरण व बिक्री स्वीकृति',
          'कृषि श्रमिक कार्य पोस्टिंग व भर्ती',
          'स्मार्ट सिंचाई (FAO-56 जल संतुलन)',
        ],
      },
      buyer: {
        title: 'खरीदार प्रोफ़ाइल',
        subtitle: 'यशवंतपुर APMC थोक मंडी',
        desc: 'सत्यापित खेत-स्तरीय उपज लॉट पर बोली लगाने वाले लाइसेंस प्राप्त खरीदार।',
        capabilities: [
          'फसल व स्थान अनुसार उपज लॉट देखें',
          'प्रतिस्पर्धी बोली लगाएं व नीलामी जीतें',
          'वैध खरीद आदेश (PO) बनाएं',
          'खरीदी गई उपज के लिए सीधी ढुलाई बुक करें',
          'डिलीवरी चरण ट्रैक करें',
        ],
      },
      labour: {
        title: 'श्रमिक प्रोफ़ाइल',
        subtitle: 'मंड्या ग्रामीण रोजगार क्षेत्र',
        desc: 'कटाई, रोपाई और निराई में कुशल कृषि विशेषज्ञ।',
        capabilities: [
          'मोबाइल पर आसपास के दैनिक कृषि काम खोजें',
          'नजदीकी काम के लिए 1-क्लिक आवेदन',
          'गारंटीकृत दैनिक मजदूरी ट्रैकिंग',
          'पक्की कार्य शिफ्ट व समय देखें',
          'कौशल प्रोफ़ाइल प्रबंधन',
        ],
      },
      driver: {
        title: 'चालक प्रोफ़ाइल',
        subtitle: 'स्टेट हाईवे लॉजिस्टिक्स हब',
        desc: 'टाटा एस (1500 किलो क्षमता) चलाने वाले स्वतंत्र माल वाहक।',
        capabilities: [
          'कृषि उपज ढुलाई अनुरोध खोजें',
          'बुकिंग अनुरोध स्वीकार या अस्वीकार करें',
          'स्थिति अपडेट: पिकअप, रास्ते में, डिलीवर',
          'वाहन क्षमता व किराया प्रबंधन',
          'रीयल-टाइम परिवहन आय ट्रैकिंग',
        ],
      },
    },
  },
  te: {
    userFallback: 'వినియోగదారు ప్రొఫైల్',
    demoPrefix: 'డెమో',
    accountSuffix: 'ఖాతా',
    signOut: 'సైన్ అవుట్',
    judgingTitle: 'మూల్యాంకనం: బహుళ-పాత్రల కేంద్రం',
    judgingDesc:
      'క్రింది ఏదైనా పాత్ర కార్డుపై క్లిక్ చేస్తే వెంటనే ఆ ఖాతా సక్రియమై, మొత్తం మెనూ అప్‌డేట్ అయ్యి దాని డ్యాష్‌బోర్డ్ తెరుచుకుంటుంది.',
    active: 'సక్రియం',
    availCapabilities: 'అందుబాటులో ఉన్న సౌకర్యాలు:',
    currentActiveBtn: 'ప్రస్తుత డ్యాష్‌బోర్డ్ సక్రియంగా ఉంది',
    openPrefix: 'తెరవండి:',
    accountInfoTitle: 'ఖాతా సమాచారం',
    fullName: 'పూర్తి పేరు:',
    email: 'ఇమెయిల్:',
    mobilePhone: 'మొబైల్ నంబర్:',
    verifiedRole: 'ధృవీకరించిన పాత్ర:',
    locationLabel: 'స్థలం:',
    roleSecTitle: 'పాత్ర భద్రత & అనుమతి',
    roleSecDescPrefix: 'మీ సెషన్ మీ నమోదిత',
    roleSecDescSuffix: 'పాత్రకు సురక్షితంగా లింక్ చేయబడింది. క్లయింట్ స్టోరేజ్ మార్పుల ద్వారా అధికార మార్పిడి బ్లాక్ చేయబడింది.',
    backendVerifiedActive: 'బ్యాకెండ్ పాత్ర నిర్ధారణ సక్రియంగా ఉంది',
    roleSecNote: 'మరో పాత్రను (ఉదా. కొనుగోలుదారు లేదా కూలీ) యాక్సెస్ చేయడానికి దయచేసి సైన్ అవుట్ చేసి ఆ ఖాతాతో లాగిన్ అవ్వండి.',
    holdingsTitle: 'వ్యవసాయ భూమి & సాగు వివరాలు',
    primaryFarm: 'ప్రధాన పొలం',
    totalCultArea: 'మొత్తం సాగు విస్తీర్ణం',
    hectares: 'హెక్టార్లు',
    activeCrop: 'ప్రస్తుత పంట',
    waterInfra: 'నీటిపారుదల సదుపాయం',
    editLocPrefix: 'పొలం స్థలాన్ని సవరించండి —',
    editLocSub: 'మీ పొలం నిర్దేశాంకాలను సరిచేయండి. ఇది వాతావరణం, ఉపగ్రహం మరియు నర్సరీ శోధనను అప్‌డేట్ చేస్తుంది.',
    personas: {
      farmer: {
        title: 'రైతు ఖాతా',
        subtitle: 'కావేరి లోయ పొలం (మండ్యా)',
        desc: 'బిందు సేద్యంతో 2.5 హెక్టార్లలో టొమాటో సాగు చేస్తున్న రైతు.',
        capabilities: [
          'BioIntel జీవసాంకేతిక పరిశోధన & వంగడాల ఆధారాలు',
          'సమీప నర్సరీల గుర్తింపు & నేరుగా విచారణలు',
          'స్మార్ట్ బిడ్డింగ్ పంట జాబితా & విక్రయ ఆమోదం',
          'వ్యవసాయ కూలీల పని పోస్టింగ్ & నియామకం',
          'స్మార్ట్ నీటిపారుదల (FAO-56 నీటి సమతుల్యత)',
        ],
      },
      buyer: {
        title: 'కొనుగోలుదారు ఖాతా',
        subtitle: 'యశ్వంత్‌పూర్ APMC టోకు మార్కెట్',
        desc: 'రైతుల పంట లాట్లపై బిడ్ వేసే లైసెన్స్ పొందిన వ్యాపారి.',
        capabilities: [
          'పంట & స్థలం ప్రకారం ధృవీకరించిన పంట లాట్లు చూడండి',
          'పోటీ బిడ్లు వేసి వేలంలో పాల్గొనండి',
          'అధికారిక కొనుగోలు ఆర్డర్లు పొందండి',
          'కొనుగోళ్లకు నేరుగా సరుకు రవాణాను ఏర్పాటు చేయండి',
          'సరుకు డెలివరీ దశలను ట్రాక్ చేయండి',
        ],
      },
      labour: {
        title: 'కూలీ ఖాతా',
        subtitle: 'మండ్యా గ్రామీణ ఉపాధి విభాగం',
        desc: 'కోత, నాట్లు మరియు కలుపు తీయడంలో నైపుణ్యం కలిగిన వ్యవసాయ నిపుణుడు.',
        capabilities: [
          'మొబైల్‌లో సమీపంలోని రోజువారీ వ్యవసాయ పనుల శోధన',
          'సమీప పనులకు 1-క్లిక్ దరఖాస్తు',
          'నిర్ధారించిన రోజువారీ వేతనాల ట్రాకింగ్',
          'ఖరారైన పని షెడ్యూల్ & గంటల వీక్షణ',
          'నైపుణ్య ప్రొఫైల్ నిర్వహణ',
        ],
      },
      driver: {
        title: 'డ్రైవర్ ఖాతా',
        subtitle: 'స్టేట్ హైవే రవాణా కేంద్రం',
        desc: 'టాటా ఏస్ (1500 కిలోల సామర్థ్యం) నడుపుతున్న స్వతంత్ర సరుకు వాహనదారు.',
        capabilities: [
          'పంట సరుకు రవాణా అభ్యర్థనలను చూడండి',
          'బుకింగ్ అభ్యర్థనలను అంగీకరించండి లేదా తిరస్కరించండి',
          'ట్రిప్ అప్‌డేట్లు: పికప్, దారిలో ఉంది, డెలివరీ',
          'వాహన సామర్థ్యం & కి.మీ ధర నిర్వహణ',
          'రియల్-టైమ్ రవాణా సంపాదన ట్రాకింగ్',
        ],
      },
    },
  },
};

export default function ProfilePage() {
  const router = useRouter();
  const {
    currentUser,
    currentFarm,
    updateFarmLocation,
    isDemoMode,
    switchDemoUser,
    logout,
    language,
  } = useFarm();
  const t = PROFILE_I18N[language];

  const DEMO_CARDS: {
    role: UserRole;
    name: string;
    title: string;
    subtitle: string;
    desc: string;
    capabilities: string[];
    dashboardUrl: string;
    icon: any;
    color: string;
  }[] = [
    {
      role: 'farmer',
      name: 'Suresh Gowda',
      ...t.personas.farmer,
      dashboardUrl: '/',
      icon: Sprout,
      color: 'from-emerald-500 to-green-600'
    },
    {
      role: 'buyer',
      name: 'Bengaluru Fresh Foods Co',
      ...t.personas.buyer,
      dashboardUrl: '/dashboard/buyer',
      icon: Building2,
      color: 'from-blue-500 to-cyan-600'
    },
    {
      role: 'labour',
      name: 'Basavaraj Koravara',
      ...t.personas.labour,
      dashboardUrl: '/dashboard/labour',
      icon: Users,
      color: 'from-amber-500 to-orange-600'
    },
    {
      role: 'driver',
      name: 'Manjunath Transport',
      ...t.personas.driver,
      dashboardUrl: '/dashboard/driver',
      icon: Truck,
      color: 'from-purple-500 to-indigo-600'
    }
  ];

  const handleOpenDemoDashboard = async (card: typeof DEMO_CARDS[0]) => {
    await switchDemoUser(card.role);
    router.push(card.dashboardUrl);
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-2xl shadow-md">
            {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                {currentUser?.name || t.userFallback}
              </h1>
              <span className={`text-xs px-2.5 py-0.5 font-bold uppercase rounded-md border ${
                isDemoMode
                  ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
              }`}>
                {isDemoMode ? `${t.demoPrefix} ${currentUser.role}` : `${currentUser.role} ${t.accountSuffix}`}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {currentUser.email} • {currentUser.village || 'Mandya'}, {currentUser.district || 'Mandya'}, {currentUser.state || 'Karnataka'}
            </p>
          </div>
        </div>

        <button
          onClick={async () => {
            await logout();
            router.push('/login');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold hover:bg-red-100 transition-colors shadow-sm self-start md:self-auto"
        >
          <LogOut className="w-4 h-4" />
          <span>{t.signOut}</span>
        </button>
      </div>

      {/* DEMO MODE: INTERACTIVE 4-ROLE CARDS WITH DIRECT DASHBOARD NAVIGATION */}
      {isDemoMode && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-900 dark:text-amber-200">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>{t.judgingTitle}</span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
              {t.judgingDesc}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEMO_CARDS.map((card) => {
              const Icon = card.icon;
              const isActive = currentUser.role === card.role;
              return (
                <div
                  key={card.role}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    isActive
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                      : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${card.color} text-white flex items-center justify-center shadow-md`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">
                            {card.title}
                          </h3>
                          <div className="text-xs text-zinc-500 font-medium">
                            {card.name} • {card.subtitle}
                          </div>
                        </div>
                      </div>
                      {isActive && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                          {t.active}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {card.desc}
                    </p>

                    <div className="space-y-1.5 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        {t.availCapabilities}
                      </span>
                      {card.capabilities.map((cap, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span>{cap}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenDemoDashboard(card)}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                      isActive
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white'
                    }`}
                  >
                    <span>{isActive ? t.currentActiveBtn : `${t.openPrefix} ${card.title}`}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AUTHENTICATED MODE: VERIFIED ACCOUNT DETAILS */}
      {!isDemoMode && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-3">
              {t.accountInfoTitle}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">{t.fullName}</span>
                <span className="font-semibold text-zinc-900 dark:text-white">{currentUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">{t.email}</span>
                <span className="font-semibold text-zinc-900 dark:text-white">{currentUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">{t.mobilePhone}</span>
                <span className="font-semibold text-zinc-900 dark:text-white">{currentUser.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">{t.verifiedRole}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">{currentUser.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">{t.locationLabel}</span>
                <span className="font-semibold text-zinc-900 dark:text-white">{currentUser.village || 'Mandya'}, {currentUser.district || 'Mandya'}</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-3">
              {t.roleSecTitle}
            </h3>
            <p className="text-xs text-zinc-500">
              {t.roleSecDescPrefix} <span className="font-bold capitalize text-zinc-700 dark:text-zinc-300">{currentUser.role}</span> {t.roleSecDescSuffix}
            </p>
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>{t.backendVerifiedActive}</span>
              </div>
              <p className="text-[11px] text-zinc-500">
                {t.roleSecNote}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FARMER AGRICULTURAL HOLDINGS (Only if role is farmer) */}
      {currentUser.role === 'farmer' && currentFarm && (
        <>
          <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-3">
              {t.holdingsTitle}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900">
                <span className="text-zinc-400 block mb-1">{t.primaryFarm}</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{currentFarm.farm_name}</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900">
                <span className="text-zinc-400 block mb-1">{t.totalCultArea}</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{currentFarm.land_area_ha} {t.hectares}</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900">
                <span className="text-zinc-400 block mb-1">{t.activeCrop}</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{localizeCropName(currentFarm.primary_crop, language)} ({localizeGrowthStage(currentFarm.crop_stage, language)})</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900">
                <span className="text-zinc-400 block mb-1">{t.waterInfra}</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{localizeCondition(currentFarm.irrigation_method, language)}</span>
              </div>
            </div>
          </div>

          <SmartLocationSelector
            role="farmer"
            title={`${t.editLocPrefix} ${currentFarm.farm_name}`}
            subtitle={t.editLocSub}
            initialLocation={{
              latitude: currentFarm.latitude,
              longitude: currentFarm.longitude,
              village: currentFarm.village,
              district: currentFarm.district,
              state: currentFarm.state,
              pin_code: currentFarm.pin_code,
              formatted_address: currentFarm.formatted_address,
              location_source: currentFarm.location_source,
              location_accuracy_m: currentFarm.location_accuracy_m,
            }}
            onConfirmLocation={async (loc) => {
              await updateFarmLocation(currentFarm.id, loc);
            }}
          />
        </>
      )}
    </div>
  );
}
