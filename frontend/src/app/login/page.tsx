// frontend/src/app/login/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFarm } from '@/context/FarmContext';
import { UserRole, Language } from '@/types';
import { MobileOtpFlow } from '@/components/auth/MobileOtpFlow';

const LOGIN_I18N: Record<Language, {
  farmerTitle: string; farmerSub: string; farmerDesc: string;
  buyerTitle: string; buyerSub: string; buyerDesc: string;
  labourTitle: string; labourSub: string; labourDesc: string;
  driverTitle: string; driverSub: string; driverDesc: string;
  pwMin6: string; villageWard: string;
  buyerSection: string; buyerCategory: string; buyerBusiness: string; buyerWholesale: string; buyerRetail: string;
  entityName: string; deliveryMandi: string;
  labourSection: string; selectSkills: string; expectedWage: string;
  driverSection: string; vehicleType: string; regNo: string; payloadCap: string; baseFare: string;
  registeringBtn: string; registerContinuePrefix: string;
  demoBannerTitle: string; demoBannerDesc: string; personaSuffix: string;
  skillNames: Record<string, string>;
  demoDesc: Record<string, string>;
  demoLoc: Record<string, string>;
}> = {
  en: {
    farmerTitle: 'Farmer Profile', farmerSub: 'Primary Producer',
    farmerDesc: 'Smart irrigation, agronomic intelligence, harvest listing, and labour hiring.',
    buyerTitle: 'Buyer Profile', buyerSub: 'Wholesale / Retail',
    buyerDesc: 'Direct farm-gate produce procurement, transparent bidding, and purchase orders.',
    labourTitle: 'Labour Profile', labourSub: 'Agricultural Worker',
    labourDesc: 'Find nearby agricultural work, register skills, and track daily wages directly.',
    driverTitle: 'Driver Profile', driverSub: 'Freight Logistics',
    driverDesc: 'Farm produce freight logistics, booking acceptance, and route delivery tracking.',
    pwMin6: 'Password (min 6 chars)',
    villageWard: 'Village / Ward',
    buyerSection: 'Buyer Business Details',
    buyerCategory: 'Buyer Category',
    buyerBusiness: 'Business or Entity Name',
    buyerWholesale: 'Wholesale / Business Buyer',
    buyerRetail: 'Direct Retail Buyer',
    entityName: 'Business or Entity Name',
    deliveryMandi: 'Delivery APMC / Mandi Address',
    labourSection: 'Agricultural Skills & Wage Details',
    selectSkills: 'Select Primary Skills',
    expectedWage: 'Expected Daily Wage (₹ / day)',
    driverSection: 'Freight Vehicle & Tariff Details',
    vehicleType: 'Vehicle Type',
    regNo: 'Registration Number',
    payloadCap: 'Payload Capacity (kg)',
    baseFare: 'Base Fare (₹ / km)',
    registeringBtn: 'Registering Account...',
    registerContinuePrefix: 'Register & Continue as',
    demoBannerTitle: 'Demonstration Mode for Quick Exploration',
    demoBannerDesc: 'Instantly preview multi-role agricultural workflows using predefined demonstration identities.',
    personaSuffix: 'Persona',
    skillNames: { Harvesting: 'Harvesting', Transplantation: 'Transplantation', Weeding: 'Weeding', Spraying: 'Spraying', 'Loading & Unloading': 'Loading & Unloading' },
    demoDesc: {
      farmer: 'Tomato (Arka Rakshak, 2.5 ha)',
      buyer: 'Licensed Wholesale Produce Buyer',
      labour: 'Harvesting & Transplantation Specialist',
      driver: 'Tata Ace (1.5T Freight Carrier)',
    },
    demoLoc: {
      farmer: 'Cauvery Valley Farm, Mandya',
      buyer: 'Yeshwanthpur APMC Yard',
      labour: 'Mandya Rural',
      driver: 'Mandya Highway Hub',
    },
  },
  kn: {
    farmerTitle: 'ರೈತ ಪ್ರೊಫೈಲ್', farmerSub: 'ಪ್ರಾಥಮಿಕ ಕೃಷಿಕ',
    farmerDesc: 'ಸ್ಮಾರ್ಟ್ ನೀರಾವರಿ, ಬೆಳೆ ಸಲಹೆ, ಮಾರುಕಟ್ಟೆ ಮಾರಾಟ ಮತ್ತು ಕಾರ್ಮಿಕರ ನೇಮಕಾತಿ.',
    buyerTitle: 'ಖರೀದಿದಾರ ಪ್ರೊಫೈಲ್', buyerSub: 'ಸಗಟು / ಚಿಲ್ಲರೆ',
    buyerDesc: 'ಜಮೀನಿನಿಂದ ನೇರ ಬೆಳೆ ಖರೀದಿ, ಪಾರದರ್ಶಕ ಹರಾಜು ಮತ್ತು ಆರ್ಡರ್‌ಗಳು.',
    labourTitle: 'ಕಾರ್ಮಿಕ ಪ್ರೊಫೈಲ್', labourSub: 'ಕೃಷಿ ಕಾರ್ಮಿಕ',
    labourDesc: 'ಹತ್ತಿರದ ಕೃಷಿ ಕೆಲಸ ಹುಡುಕಿ, ಕೌಶಲ್ಯ ಸೇರಿಸಿ ಮತ್ತು ದೈನಂದಿನ ಕೂಲಿ ನೋಡಿ.',
    driverTitle: 'ಚಾಲಕ ಪ್ರೊಫೈಲ್', driverSub: 'ಸಾರಿಗೆ ಸೇವೆ',
    driverDesc: 'ಬೆಳೆ ಸಾಗಾಣಿಕೆ, ಬುಕಿಂಗ್ ಸ್ವೀಕಾರ ಮತ್ತು ಮಾರ್ಗ ಟ್ರ್ಯಾಕಿಂಗ್.',
    pwMin6: 'ಪಾಸ್‌ವರ್ಡ್ (ಕನಿಷ್ಠ 6 ಅಕ್ಷರಗಳು)',
    villageWard: 'ಗ್ರಾಮ / ವಾರ್ಡ್',
    buyerSection: 'ಖರೀದಿದಾರ ವ್ಯಾಪಾರ ವಿವರಗಳು',
    buyerCategory: 'ಖರೀದಿದಾರ ವಿಭಾಗ',
    buyerBusiness: 'ವ್ಯಾಪಾರ ಅಥವಾ ಸಂಸ್ಥೆಯ ಹೆಸರು',
    buyerWholesale: 'ಸಗಟು / ವ್ಯಾಪಾರ ಖರೀದಿದಾರ',
    buyerRetail: 'ನೇರ ಚಿಲ್ಲರೆ ಖರೀದಿದಾರ',
    entityName: 'ಸಂಸ್ಥೆಯ ಹೆಸರು',
    deliveryMandi: 'ವಿತರಣಾ APMC / ಮಂಡಿ ವಿಳಾಸ',
    labourSection: 'ಕೃಷಿ ಕೌಶಲ್ಯ ಮತ್ತು ಕೂಲಿ ವಿವರಗಳು',
    selectSkills: 'ಮುಖ್ಯ ಕೌಶಲ್ಯಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    expectedWage: 'ನಿರೀಕ್ಷಿತ ದಿನದ ಕೂಲಿ (₹ / ದಿನ)',
    driverSection: 'ಸರಕು ವಾಹನ ಮತ್ತು ದರ ವಿವರಗಳು',
    vehicleType: 'ವಾಹನದ ವಿಧ',
    regNo: 'ನೋಂದಣಿ ಸಂಖ್ಯೆ',
    payloadCap: 'ತೂಕ ಸಾಮರ್ಥ್ಯ (kg)',
    baseFare: 'ಮೂಲ ದರ (₹ / ಕಿ.ಮೀ)',
    registeringBtn: 'ಖಾತೆ ನೋಂದಾಯಿಸಲಾಗುತ್ತಿದೆ...',
    registerContinuePrefix: 'ಖಾತೆ ನೋಂದಾಯಿಸಿ ಮುಂದುವರಿಯಿರಿ:',
    demoBannerTitle: 'ತ್ವರಿತ ಪರಿಶೀಲನೆಗಾಗಿ ಡೆಮೊ ಮೋಡ್',
    demoBannerDesc: 'ಪೂರ್ವ-ನಿರ್ಧರಿತ ಡೆಮೊ ಖಾತೆಗಳ ಮೂಲಕ ರೈತ, ಖರೀದಿದಾರ, ಕಾರ್ಮಿಕ ಮತ್ತು ಚಾಲಕ ಸೌಲಭ್ಯಗಳನ್ನು ತಕ್ಷಣ ನೋಡಿ.',
    personaSuffix: 'ಖಾತೆ',
    skillNames: { Harvesting: 'ಕೊಯ್ಲು', Transplantation: 'ನಾಟಿ ಕೆಲಸ', Weeding: 'ಕಳೆ ಕೀಳುವುದು', Spraying: 'ಸಿಂಪಡಣೆ', 'Loading & Unloading': 'ಲೋಡಿಂಗ್ ಮತ್ತು ಅನ್‌ಲೋಡಿಂಗ್' },
    demoDesc: {
      farmer: 'ಟೊಮೆಟೊ (ಅರ್ಕಾ ರಕ್ಷಕ್, 2.5 ಹೆಕ್ಟೇರ್)',
      buyer: 'ಪರವಾನಗಿ ಪಡೆದ ಸಗಟು ಖರೀದಿದಾರ',
      labour: 'ಕೊಯ್ಲು ಮತ್ತು ನಾಟಿ ತಜ್ಞರು',
      driver: 'ಟಾಟಾ ಏಸ್ (1.5 ಟನ್ ಸರಕು ವಾಹನ)',
    },
    demoLoc: {
      farmer: 'ಕಾವೇರಿ ವ್ಯಾಲಿ ಜಮೀನು, ಮಂಡ್ಯ',
      buyer: 'ಯಶವಂತಪುರ APMC ಮಾರುಕಟ್ಟೆ',
      labour: 'ಮಂಡ್ಯ ಗ್ರಾಮಾಂತರ',
      driver: 'ಮಂಡ್ಯ ಹೈವೇ ಹಬ್',
    },
  },
  hi: {
    farmerTitle: 'किसान प्रोफ़ाइल', farmerSub: 'प्राथमिक उत्पादक',
    farmerDesc: 'स्मार्ट सिंचाई, फसल सलाह, उपज बिक्री और श्रमिक नियुक्ति।',
    buyerTitle: 'खरीदार प्रोफ़ाइल', buyerSub: 'थोक / खुदरा',
    buyerDesc: 'खेत से सीधे उपज खरीद, पारदर्शी नीलामी और खरीद ऑर्डर।',
    labourTitle: 'श्रमिक प्रोफ़ाइल', labourSub: 'कृषि मजदूर',
    labourDesc: 'नज़दीकी खेती का काम खोजें, कौशल जोड़ें और दैनिक मजदूरी देखें।',
    driverTitle: 'ड्राइवर प्रोफ़ाइल', driverSub: 'माल परिवहन',
    driverDesc: 'उपज ढुलाई, बुकिंग स्वीकृति और रूट डिलीवरी ट्रैकिंग।',
    pwMin6: 'पासवर्ड (कम से कम 6 अक्षर)',
    villageWard: 'गाँव / वार्ड',
    buyerSection: 'खरीदार व्यापार विवरण',
    buyerCategory: 'खरीदार श्रेणी',
    buyerBusiness: 'व्यापार या कंपनी का नाम',
    buyerWholesale: 'थोक / व्यापार खरीदार',
    buyerRetail: 'सीधा खुदरा खरीदार',
    entityName: 'संस्था का नाम',
    deliveryMandi: 'डिलीवरी APMC / मंडी पता',
    labourSection: 'कृषि कौशल और मजदूरी विवरण',
    selectSkills: 'मुख्य कौशल चुनें',
    expectedWage: 'अपेक्षित दैनिक मजदूरी (₹ / दिन)',
    driverSection: 'माल वाहन और किराया विवरण',
    vehicleType: 'वाहन प्रकार',
    regNo: 'पंजीकरण संख्या',
    payloadCap: 'भार क्षमता (kg)',
    baseFare: 'किराया दर (₹ / किमी)',
    registeringBtn: 'खाता बनाया जा रहा है...',
    registerContinuePrefix: 'पंजीकरण कर आगे बढ़ें:',
    demoBannerTitle: 'त्वरित देखने के लिए डेमो मोड',
    demoBannerDesc: 'तैयार डेमो खातों के माध्यम से किसान, खरीदार, श्रमिक और ड्राइवर वर्कफ़्लो तुरंत देखें।',
    personaSuffix: 'प्रोफ़ाइल',
    skillNames: { Harvesting: 'कटाई', Transplantation: 'रोपाई', Weeding: 'निराई', Spraying: 'छिड़काव', 'Loading & Unloading': 'लोडिंग व अनलोडिंग' },
    demoDesc: {
      farmer: 'टमाटर (अर्का रक्षक, 2.5 हेक्टेयर)',
      buyer: 'लाइसेंस प्राप्त थोक खरीदार',
      labour: 'कटाई व रोपाई विशेषज्ञ',
      driver: 'टाटा ऐस (1.5 टन माल वाहन)',
    },
    demoLoc: {
      farmer: 'कावेरी वैली खेत, मांड्या',
      buyer: 'यशवंतपुर APMC मंडी',
      labour: 'मांड्या ग्रामीण',
      driver: 'मांड्या हाईवे हब',
    },
  },
  te: {
    farmerTitle: 'రైతు ప్రొఫైల్', farmerSub: 'రైతు / ఉత్పత్తిదారు',
    farmerDesc: 'స్మార్ట్ నీటిపారుదల, పంట సలహాలు, పంట అమ్మకం మరియు కూలీల నియామకం.',
    buyerTitle: 'కొనుగోలుదారు ప్రొఫైల్', buyerSub: 'హోల్‌సేల్ / రిటైల్',
    buyerDesc: 'పొలం నుండి నేరుగా పంట కొనుగోలు, పారదర్శక వేలం మరియు ఆర్డర్లు.',
    labourTitle: 'కూలీ ప్రొఫైల్', labourSub: 'వ్యవసాయ కార్మికుడు',
    labourDesc: 'సమీప వ్యవసాయ పనులు కనుగొనండి, నైపుణ్యాలు చేర్చండి మరియు రోజువారీ కూలీ చూడండి.',
    driverTitle: 'డ్రైవర్ ప్రొఫైల్', driverSub: 'సరుకు రవాణా',
    driverDesc: 'పంట రవాణా, బుకింగ్ అంగీకారం మరియు రూట్ ట్రాకింగ్.',
    pwMin6: 'పాస్‌వర్డ్ (కనీసం 6 అక్షరాలు)',
    villageWard: 'గ్రామం / వార్డు',
    buyerSection: 'కొనుగోలుదారు వ్యాపార వివరాలు',
    buyerCategory: 'కొనుగోలుదారు వర్గం',
    buyerBusiness: 'వ్యాపార లేదా సంస్థ పేరు',
    buyerWholesale: 'హోల్‌సేల్ / వ్యాపార కొనుగోలుదారు',
    buyerRetail: 'నేరుగా రిటైల్ కొనుగోలుదారు',
    entityName: 'వ్యాపార పేరు',
    deliveryMandi: 'డెలివరీ APMC / మార్కెట్ చిరునామా',
    labourSection: 'వ్యవసాయ నైపుణ్యాలు & కూలీ వివరాలు',
    selectSkills: 'ప్రధాన నైపుణ్యాలను ఎంచుకోండి',
    expectedWage: 'ఆశించే రోజువారీ కూలీ (₹ / రోజు)',
    driverSection: 'సరుకు వాహనం & ధర వివరాలు',
    vehicleType: 'వాహనం రకం',
    regNo: 'రిజిస్ట్రేషన్ నంబర్',
    payloadCap: 'లోడ్ సామర్థ్యం (kg)',
    baseFare: 'ప్రారంభ ధర (₹ / కి.మీ)',
    registeringBtn: 'ఖాతా నమోదు అవుతోంది...',
    registerContinuePrefix: 'నమోదు చేసి కొనసాగండి:',
    demoBannerTitle: 'తక్షణ పరిశీలన కోసం డెమో మోడ్',
    demoBannerDesc: 'ముందే సిద్ధం చేసిన డెమో ఖాతాలతో రైతు, కొనుగోలుదారు, కూలీ మరియు డ్రైవర్ విభాగాలను చూడండి.',
    personaSuffix: 'ఖాతా',
    skillNames: { Harvesting: 'కోత పని', Transplantation: 'నాట్లు వేయడం', Weeding: 'కలుపు తీయడం', Spraying: 'మందు పిచికారీ', 'Loading & Unloading': 'లోడింగ్ & అన్‌లోడింగ్' },
    demoDesc: {
      farmer: 'టొమాటో (అర్కా రక్షక్, 2.5 హెక్టార్లు)',
      buyer: 'లైసెన్స్ పొందిన హోల్‌సేల్ కొనుగోలుదారు',
      labour: 'కోత మరియు నాట్లు నిపుణులు',
      driver: 'టాటా ఏస్ (1.5T సరుకు వాహనం)',
    },
    demoLoc: {
      farmer: 'కావేరి వ్యాలీ పొలం, మాండ్య',
      buyer: 'యశ్వంత్‌పూర్ APMC యార్డ్',
      labour: 'మాండ్య గ్రామీణ ప్రాంతం',
      driver: 'మాండ్య హైవే హబ్',
    },
  },
};
import {
  Sprout,
  Building2,
  Users,
  Truck,
  Sparkles,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Lock,
  Mail,
  Phone,
  MapPin,
  Check,
  Globe,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, registerUser, switchDemoUser, language, setLanguage, setIsOnboardingOpen, t } = useFarm();
  const L = LOGIN_I18N[language] || LOGIN_I18N.en;

  const [activeTab, setActiveTab] = useState<'otp' | 'signin' | 'register' | 'demo'>('otp');
  const [selectedRole, setSelectedRole] = useState<UserRole>('farmer');
  
  // Sign In state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Registration state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regVillage, setRegVillage] = useState('Mandya Rural');
  const [regDistrict, setRegDistrict] = useState('Mandya');
  
  // Role-specific fields
  const [buyerType, setBuyerType] = useState<'individual' | 'business'>('business');
  const [businessName, setBusinessName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['Harvesting', 'Transplantation']);
  const [dailyWage, setDailyWage] = useState<number>(600);
  const [vehicleType, setVehicleType] = useState('Tata Ace');
  const [regNumber, setRegNumber] = useState('KA-11-EA-4521');
  const [capacityKg, setCapacityKg] = useState<number>(1500);
  const [baseFarePerKm, setBaseFarePerKm] = useState<number>(30);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const PRIMARY_ROLES: { role: UserRole; title: string; subtitle: string; icon: any; color: string; desc: string }[] = [
    {
      role: 'farmer',
      title: L.farmerTitle,
      subtitle: L.farmerSub,
      icon: Sprout,
      color: 'from-emerald-500 to-green-600',
      desc: L.farmerDesc
    },
    {
      role: 'buyer',
      title: L.buyerTitle,
      subtitle: L.buyerSub,
      icon: Building2,
      color: 'from-blue-500 to-cyan-600',
      desc: L.buyerDesc
    },
    {
      role: 'labour',
      title: L.labourTitle,
      subtitle: L.labourSub,
      icon: Users,
      color: 'from-amber-500 to-orange-600',
      desc: L.labourDesc
    },
    {
      role: 'driver',
      title: L.driverTitle,
      subtitle: L.driverSub,
      icon: Truck,
      color: 'from-purple-500 to-indigo-600',
      desc: L.driverDesc
    }
  ];

  const DEMO_PERSONAS = [
    {
      role: 'farmer' as UserRole,
      name: 'Suresh Gowda',
      email: 'farmer@raithamitra.in',
      location: L.demoLoc.farmer,
      crop: L.demoDesc.farmer,
      redirect: '/',
      icon: Sprout
    },
    {
      role: 'buyer' as UserRole,
      name: 'Bengaluru Fresh Foods Co',
      email: 'buyer1@raithamitra.in',
      location: L.demoLoc.buyer,
      crop: L.demoDesc.buyer,
      redirect: '/dashboard/buyer',
      icon: Building2
    },
    {
      role: 'labour' as UserRole,
      name: 'Basavaraj Koravara',
      email: 'labour@raithamitra.in',
      location: L.demoLoc.labour,
      crop: L.demoDesc.labour,
      redirect: '/dashboard/labour',
      icon: Users
    },
    {
      role: 'driver' as UserRole,
      name: 'Manjunath Transport',
      email: 'driver@raithamitra.in',
      location: L.demoLoc.driver,
      crop: L.demoDesc.driver,
      redirect: '/dashboard/driver',
      icon: Truck
    }
  ];

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await login({
        email: loginEmail,
        password: loginPassword,
        role: selectedRole
      });
      if (res.success && res.redirect_url) {
        router.push(res.redirect_url);
      } else {
        const defaultErr =
          language === 'kn' ? 'ತಪ್ಪಾದ ಲಾಗಿನ್ ವಿವರಗಳು ಅಥವಾ ಪಾತ್ರದ ಹೊಂದಾಣಿಕೆಯಿಲ್ಲ.' :
          language === 'hi' ? 'अमान्य विवरण या भूमिका मेल नहीं खाती।' :
          language === 'te' ? 'చెల్లని వివరాలు లేదా పాత్ర సరిపోలడం లేదు.' :
          'Invalid credentials or role mismatch.';
        setErrorMsg(res.error || defaultErr);
      }
    } catch (err: any) {
      const connErr =
        language === 'kn' ? 'ಲಾಗಿನ್ ಸಂಪರ್ಕ ವಿಫಲವಾಗಿದೆ.' :
        language === 'hi' ? 'लॉगिन कनेक्शन विफल रहा।' :
        language === 'te' ? 'లాగిన్ కనెక్షన్ విఫలమైంది.' :
        'Login connection failed.';
      setErrorMsg(err.message || connErr);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const payload: any = {
        name: regName,
        email: regEmail,
        phone: regPhone,
        password: regPassword,
        role: selectedRole,
        preferred_language: language,
        village: regVillage,
        district: regDistrict,
        state: 'Karnataka'
      };

      if (selectedRole === 'buyer') {
        payload.buyer_type = buyerType;
        payload.business_name = businessName || regName;
        payload.delivery_address = deliveryAddress || `${regVillage}, ${regDistrict}`;
      } else if (selectedRole === 'labour') {
        payload.skills = selectedSkills;
        payload.daily_wage_rate = dailyWage;
      } else if (selectedRole === 'driver') {
        payload.vehicle_type = vehicleType;
        payload.vehicle_reg_number = regNumber;
        payload.capacity_kg = capacityKg;
        payload.base_fare_per_km = baseFarePerKm;
      }

      const res = await registerUser(payload);
      if (res.success) {
        if (selectedRole === 'farmer') {
          setIsOnboardingOpen(true);
        }
        router.push(res.redirect_url || '/');
      } else {
        const regErr =
          language === 'kn' ? 'ನೋಂದಣಿ ವಿಫಲವಾಗಿದೆ.' :
          language === 'hi' ? 'पंजीकरण विफल रहा।' :
          language === 'te' ? 'నమోదు విఫలమైంది.' :
          'Registration failed.';
        setErrorMsg(res.error || regErr);
      }
    } catch (err: any) {
      const regConnErr =
        language === 'kn' ? 'ನೋಂದಣಿ ಸಂಪರ್ಕ ವಿಫಲವಾಗಿದೆ.' :
        language === 'hi' ? 'पंजीकरण कनेक्शन विफल रहा।' :
        language === 'te' ? 'నమోదు కనెక్షన్ విఫలమైంది.' :
        'Registration connection failed.';
      setErrorMsg(err.message || regConnErr);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (persona: typeof DEMO_PERSONAS[0]) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await switchDemoUser(persona.role);
      router.push(persona.redirect);
    } catch (err: any) {
      setErrorMsg(err.message || 'Demo login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dark min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center py-8 px-4 bg-[#030907] text-[#F7F5ED]">
      {/* Outer-Space Sky & Subtle Starfield */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-gradient-to-b from-[#020706] via-[#061410] to-[#0b2318]">
        <div
          className="absolute inset-0 opacity-45"
          style={{
            backgroundImage:
              'radial-gradient(1px 1px at 14% 12%, rgba(255,255,255,0.75), transparent), radial-gradient(1px 1px at 38% 8%, rgba(186,230,253,0.7), transparent), radial-gradient(1.5px 1.5px at 72% 14%, rgba(255,255,255,0.65), transparent), radial-gradient(1px 1px at 88% 9%, rgba(167,243,208,0.6), transparent), radial-gradient(1px 1px at 56% 18%, rgba(255,255,255,0.5), transparent)',
          }}
        />

        {/* Realistic Earth-Observation Satellite in Upper-Left */}
        <svg
          viewBox="0 0 180 100"
          aria-hidden="true"
          className="hidden sm:block absolute top-6 left-6 md:top-10 md:left-12 w-36 md:w-44 opacity-85 drop-shadow-[0_6px_18px_rgba(56,189,248,0.28)]"
        >
          <defs>
            <linearGradient id="rmSatPanel" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="rmSatBody" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
          </defs>
          {/* Left solar wing */}
          <rect x="8" y="34" width="52" height="22" rx="2" fill="url(#rmSatPanel)" stroke="#7dd3fc" strokeOpacity="0.45" strokeWidth="1" />
          <line x1="25" y1="34" x2="25" y2="56" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="0.8" />
          <line x1="42" y1="34" x2="42" y2="56" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="0.8" />
          <line x1="8" y1="45" x2="60" y2="45" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="0.8" />
          {/* Right solar wing */}
          <rect x="114" y="34" width="52" height="22" rx="2" fill="url(#rmSatPanel)" stroke="#7dd3fc" strokeOpacity="0.45" strokeWidth="1" />
          <line x1="131" y1="34" x2="131" y2="56" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="0.8" />
          <line x1="148" y1="34" x2="148" y2="56" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="0.8" />
          <line x1="114" y1="45" x2="166" y2="45" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="0.8" />
          {/* Connecting boom */}
          <rect x="60" y="43" width="54" height="4" fill="#94a3b8" />
          {/* Main satellite bus */}
          <rect x="74" y="29" width="26" height="32" rx="4" fill="url(#rmSatBody)" stroke="#cbd5e1" strokeWidth="1" />
          <circle cx="87" cy="45" r="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
          <circle cx="87" cy="45" r="2.2" fill="#38bdf8" />
          {/* Dish & sensor */}
          <path d="M80 61 L87 72 L94 61 Z" fill="#94a3b8" />
        </svg>

        {/* Curved Earth Horizon & Aerial Green Agricultural Fields */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[18%] sm:top-[16%] w-[165vw] sm:w-[140vw] h-[140vh] rounded-[50%] overflow-hidden border-t border-sky-300/40 shadow-[0_-18px_70px_rgba(56,189,248,0.28)]">
          <img
            src="/images/agriculture/indian-farmland-sunrise.jpg"
            alt="Aerial green agricultural fields"
            className="w-full h-full object-cover object-center opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0b2b1d]/35 to-[#04110b]/75" />
        </div>
      </div>

      {/* Centered Translucent Dark-Green Glassmorphic Login Card */}
      <div className="relative z-10 w-full max-w-2xl bg-[#0b2318]/82 backdrop-blur-xl border border-emerald-400/25 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden p-6 md:p-8 space-y-5 rm-animate-in">
        {/* Brand & Language Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-400/15">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-[#2b6a47] to-[#173C2B] border border-emerald-400/30 text-white shadow-lg">
              <Sprout className="w-6 h-6 text-[#86efac]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl font-semibold text-white tracking-tight">
                  {t('appName')}
                </h1>
                <span className="text-[11px] px-2 py-0.5 font-semibold rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  ರೈತ ಮಿತ್ರ
                </span>
              </div>
              <p className="text-xs text-[#C9A35C] font-medium">
                {t('tagline')}
              </p>
            </div>
          </div>

          {/* Multilingual Selector (4 Languages) */}
          <div className="flex flex-wrap items-center gap-1 bg-[#071810]/80 border border-emerald-400/20 rounded-xl p-1 self-start sm:self-auto">
            <Globe className="w-3.5 h-3.5 text-emerald-300/80 ml-2" />
            {(['en', 'kn', 'hi', 'te'] as Language[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLanguage(l)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  language === l
                    ? 'bg-[#2b6a47] text-white shadow-sm'
                    : 'text-emerald-100/75 hover:bg-white/10'
                }`}
              >
                {l === 'en' ? 'English' : l === 'kn' ? 'ಕನ್ನಡ' : l === 'hi' ? 'हिन्दी' : 'తెలుగు'}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation Mode Tabs */}
        <div className="grid grid-cols-4 gap-1.5 p-1.5 bg-[#071810]/80 border border-emerald-400/15 rounded-2xl">
          <button
            type="button"
            onClick={() => { setActiveTab('otp'); setErrorMsg(null); }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'otp'
                ? 'bg-[#2b6a47] text-white shadow-sm'
                : 'text-emerald-100/70 hover:text-white hover:bg-white/5'
            }`}
          >
            {t('loginTabOtp')}
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('signin'); setErrorMsg(null); }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'signin'
                ? 'bg-[#2b6a47] text-white shadow-sm'
                : 'text-emerald-100/70 hover:text-white hover:bg-white/5'
            }`}
          >
            {t('loginTabPassword')}
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setErrorMsg(null); }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'register'
                ? 'bg-[#2b6a47] text-white shadow-sm'
                : 'text-emerald-100/70 hover:text-white hover:bg-white/5'
            }`}
          >
            {t('loginTabRegister')}
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('demo'); setErrorMsg(null); }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1 ${
              activeTab === 'demo'
                ? 'bg-[#b48332] text-white shadow-sm'
                : 'text-[#e2c285] hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>{t('loginTabDemo')}</span>
          </button>
        </div>

        {activeTab === 'otp' && (
          <div className="rounded-2xl bg-[#071810]/65 border border-emerald-400/15 p-4">
            <MobileOtpFlow />
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: Sign In & TAB 2: Register (Role Cards Selection) */}
        {(activeTab === 'signin' || activeTab === 'register') && (
          <div className="space-y-4">
            <div className="text-center md:text-left">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                {activeTab === 'signin' ? t('selectRoleToSignIn') : t('selectRegistrationCategory')}
              </h2>
              <p className="text-xs text-zinc-500">
                {t('choosePrimaryRoleDesc')}
              </p>
            </div>

            {/* Exactly Four Primary Role-Selection Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {PRIMARY_ROLES.map((r) => {
                const Icon = r.icon;
                const isSelected = selectedRole === r.role;
                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => { setSelectedRole(r.role); setErrorMsg(null); }}
                    className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 shadow-md ring-2 ring-emerald-500/30'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${r.color} text-white flex items-center justify-center shadow-md`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">
                        {r.title}
                      </h3>
                      <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {r.subtitle}
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2">
                      {r.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 1: SIGN IN FORM */}
        {activeTab === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Email Address or Mobile ID
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder={
                      selectedRole === 'farmer' ? 'farmer@raithamitra.in' :
                      selectedRole === 'buyer' ? 'buyer1@raithamitra.in' : 'labour@raithamitra.in'
                    }
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {t('accountPassword')}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder={t('enterPassword')}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span>{isSubmitting ? t('authenticating') : t('signInBtn')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* TAB 2: REGISTRATION FORM */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('fullName')}
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Anand Kumar"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('emailAddress')}
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('mobilePhone')}
                </label>
                <input
                  type="tel"
                  required
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+91 98450 00000"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {L.pwMin6}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {L.villageWard}
                </label>
                <input
                  type="text"
                  required
                  value={regVillage}
                  onChange={(e) => setRegVillage(e.target.value)}
                  placeholder="Maddur Rural"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('districtName')}
                </label>
                <input
                  type="text"
                  required
                  value={regDistrict}
                  onChange={(e) => setRegDistrict(e.target.value)}
                  placeholder="Mandya"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Role Specific Additional Fields */}
            {selectedRole === 'buyer' && (
              <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-3">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase">
                  {L.buyerSection}
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      {L.buyerCategory}
                    </label>
                    <select
                      value={buyerType}
                      onChange={(e) => setBuyerType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
                    >
                      <option value="business">{L.buyerWholesale}</option>
                      <option value="individual">{L.buyerRetail}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      {L.entityName}
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Apex Agri Retail"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      {L.deliveryMandi}
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Yeshwanthpur APMC Yard"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedRole === 'labour' && (
              <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-3">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase">
                  {L.labourSection}
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                      {L.selectSkills}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {['Harvesting', 'Transplantation', 'Weeding', 'Spraying', 'Loading & Unloading'].map((sk) => {
                        const hasSkill = selectedSkills.includes(sk);
                        return (
                          <button
                            key={sk}
                            type="button"
                            onClick={() => {
                              setSelectedSkills(hasSkill ? selectedSkills.filter(s => s !== sk) : [...selectedSkills, sk]);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                              hasSkill
                                ? 'bg-amber-500 text-white border-amber-600'
                                : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'
                            }`}
                          >
                            {L.skillNames[sk] || sk}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      {L.expectedWage}
                    </label>
                    <input
                      type="number"
                      min={400}
                      max={2000}
                      value={dailyWage}
                      onChange={(e) => setDailyWage(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedRole === 'driver' && (
              <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 space-y-3">
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase">
                  {L.driverSection}
                </span>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      {L.vehicleType}
                    </label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
                    >
                      <option value="Tata Ace">Tata Ace (1.5T)</option>
                      <option value="Mahindra Bolero Pickup">Mahindra Bolero Pickup (1.75T)</option>
                      <option value="Ashok Leyland Dost">Ashok Leyland Dost (2.0T)</option>
                      <option value="Eicher Pro 14ft">Eicher Pro 14ft (4.5T)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      {L.regNo}
                    </label>
                    <input
                      type="text"
                      value={regNumber}
                      onChange={(e) => setRegNumber(e.target.value)}
                      placeholder="KA-11-EA-4521"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      {L.payloadCap}
                    </label>
                    <input
                      type="number"
                      min={500}
                      max={10000}
                      value={capacityKg}
                      onChange={(e) => setCapacityKg(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      {L.baseFare}
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={200}
                      value={baseFarePerKm}
                      onChange={(e) => setBaseFarePerKm(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span>
                {isSubmitting
                  ? L.registeringBtn
                  : `${L.registerContinuePrefix} ${t(`role${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`)}`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* TAB 3: TRY DEMO (JUDGING EVALUATION QUICK-ACCESS) */}
        {activeTab === 'demo' && (
          <div className="space-y-4 pt-1">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>{L.demoBannerTitle}</span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                {L.demoBannerDesc}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DEMO_PERSONAS.map((p) => {
                const Icon = p.icon;
                const roleLabel = t(`role${p.role.charAt(0).toUpperCase() + p.role.slice(1)}`);
                return (
                  <button
                    key={p.role}
                    type="button"
                    onClick={() => handleDemoLogin(p)}
                    disabled={isSubmitting}
                    className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 hover:border-emerald-500 transition-all text-left flex items-start gap-4 group"
                  >
                    <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          {roleLabel} {L.personaSuffix}
                        </span>
                        <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 group-hover:text-emerald-500 transition-all" />
                      </div>
                      <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white mt-0.5">
                        {p.name}
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                        {p.crop} • {p.location}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
