// frontend/src/app/diagnostics/page.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import {
  analyzeCropLeaves,
  CropDiagnosticResult,
  DiagnosticHistoryItem,
  fetchCropDiagnosticsStatus,
  fetchDiagnosticHistory,
  MultiImageDiagnosticResponse,
  submitCommunityDiseaseReport,
} from '@/lib/cropDiagnosticsApi';
import { localizeCropName, localizeDiseaseName, localizeCondition, getIntlLocale } from '@/lib/translations';
import { Language } from '@/types';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  CloudSun,
  Dna,
  History,
  Info,
  Microscope,
  RotateCw,
  ShieldAlert,
  Sprout,
  Upload,
  Volume2,
  X,
} from 'lucide-react';

const UI_STRINGS: Record<string, Record<string, string>> = {
  en: {
    title: 'RaithaMitra AI Crop Doctor',
    tagline: 'Detect Early. Protect Crops. Reduce Losses.',
    analyze: 'Analyze Crop',
    readAloud: 'Read Diagnosis Aloud',
    autoCrop: 'Auto-detect Crop (Recommended)',
    healthy: 'Healthy Leaf',
    diseased: 'Suspected Disease',
    uncertain: 'Uncertain Result',
  },
  kn: {
    title: 'ರೈತ ಮಿತ್ರ AI ಬೆಳೆ ವೈದ್ಯ',
    tagline: 'ಬೇಗ ಪತ್ತೆ ಹಚ್ಚಿ. ಬೆಳೆ ರಕ್ಷಿಸಿ. ನಷ್ಟ ಕಡಿಮೆ ಮಾಡಿ.',
    analyze: 'ಬೆಳೆ ಪರೀಕ್ಷಿಸಿ',
    readAloud: 'ಫಲಿತಾಂಶವನ್ನು ಕೇಳಿ',
    autoCrop: 'ಸ್ವಯಂಚಾಲಿತ ಬೆಳೆ ಗುರುತಿಸುವಿಕೆ',
    healthy: 'ಆರೋಗ್ಯಕರ ಎಲೆ',
    diseased: 'ಶಂಕಿತ ರೋಗ',
    uncertain: 'ಅನಿಶ್ಚಿತ ಫಲಿತಾಂಶ',
  },
  hi: {
    title: 'रैत मित्र AI फसल डॉक्टर',
    tagline: 'जल्दी पहचानें। फसल बचाएं। नुकसान कम करें।',
    analyze: 'फसल की जांच करें',
    readAloud: 'निदान सुनें',
    autoCrop: 'स्वचालित फसल पहचान',
    healthy: 'स्वस्थ पत्ती',
    diseased: 'संभावित रोग',
    uncertain: 'अनिश्चित परिणाम',
  },
  te: {
    title: 'రైతు మిత్ర AI పంట డాక్టర్',
    tagline: 'ముందుగా గుర్తించండి. పంటను కాపాడండి.',
    analyze: 'పంటను పరీక్షించండి',
    readAloud: 'నిర్ధారణ వినండి',
    autoCrop: 'ఆటోమేటిక్ పంట గుర్తింపు',
    healthy: 'ఆరోగ్యకరమైన ఆకు',
    diseased: 'అనుమానిత వ్యాధి',
    uncertain: 'అనిశ్చిత ఫలితం',
  },
};

const DIAG_I18N: Record<Language, {
  onnxReady: string; checkingModel: string; selectCropAria: string;
  uploadHint: string; uploadSubHint: string; cameraBtn: string;
  needPhotoErr: string; unsupportedFmt: string; sizeLimitErr: string; analyzeErr: string;
  noPhotosHint: string; tip1: string; tip2: string;
  modelScore: string; disagreementNote: string; noPreds: string;
  qualityLbl: string; sevLbl: string; sevUnavailable: string;
  techSummary: string; modelLbl: string; latencyLbl: string;
  whatShouldIDo: string; causesConds: string; sourcesLbl: string; liveWeatherUnavail: string;
  biointelNote: string; optAlertTitle: string; optAlertDescPrefix: string; optAlertDescSuffix: string;
  submittingBtn: string; confirmAlertBtn: string; reportSuccessPrefix: string; reportErr: string;
  signInHist: string; noHist: string; scoreLbl: string;
  spokenCrop: string; spokenDiag: string; spokenPct: string; spokenRecs: string;
}> = {
  en: {
    onnxReady: 'Offline AI Ready (38 Diseases)', checkingModel: 'Checking AI Model...', selectCropAria: 'Select crop',
    uploadHint: 'Click to upload leaf photo(s) (JPEG, PNG, WEBP · max 3 images)',
    uploadSubHint: 'Whole leaf, close-up lesion, or another affected leaf in natural daylight.',
    cameraBtn: 'Use Camera Capture',
    needPhotoErr: 'Please upload or capture at least one leaf photo (up to 3).',
    unsupportedFmt: 'Unsupported file format. Use JPEG, PNG, or WEBP.',
    sizeLimitErr: 'File exceeds the 10 MB limit.',
    analyzeErr: 'Could not analyze leaf photo. Please check backend connection.',
    noPhotosHint: 'Upload 1–3 clear leaf photos and click Analyze Crop. AI disease recognition runs offline on this server.',
    tip1: 'Take the photo in bright natural daylight.',
    tip2: 'Keep the leaf sharp and avoid soil/shadow clutter.',
    modelScore: 'Model Confidence:', disagreementNote: 'Multi-image note:', noPreds: 'No predictions available.',
    qualityLbl: 'Photo Quality:', sevLbl: 'Severity:', sevUnavailable: 'Unavailable (disease identification model only)',
    techSummary: 'Technical Model & Limitation Details', modelLbl: 'Model:', latencyLbl: 'CPU Inference Time:',
    whatShouldIDo: 'What Should I Do?', causesConds: 'Favorable conditions:', sourcesLbl: 'Sources:', liveWeatherUnavail: 'Live weather unavailable.',
    biointelNote: 'Explore disease-tolerant seeds and verified nearby nurseries for',
    optAlertTitle: 'Optional Regional Alert (No Exact Location Shared)',
    optAlertDescPrefix: 'Share an anonymized disease observation for',
    optAlertDescSuffix: 'to warn neighboring farmers.',
    submittingBtn: 'Submitting...', confirmAlertBtn: 'Confirm & Share District Alert',
    reportSuccessPrefix: 'Reported region-level alert for', reportErr: 'Unable to submit report.',
    signInHist: 'Sign in to save and review your crop checkup history.', noHist: 'No leaf checkups saved for your account yet.',
    scoreLbl: 'Confidence:', spokenCrop: 'Crop:', spokenDiag: 'Diagnosis:', spokenPct: 'percent confidence', spokenRecs: 'Recommended actions:',
  },
  kn: {
    onnxReady: 'ಆಫ್‌ಲೈನ್ AI ಸಿದ್ಧವಾಗಿದೆ (38 ರೋಗಗಳು)', checkingModel: 'AI ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...', selectCropAria: 'ಬೆಳೆ ಆಯ್ಕೆಮಾಡಿ',
    uploadHint: 'ಎಲೆಯ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಲು ಇಲ್ಲಿ ಒತ್ತಿ (JPEG, PNG · ಗರಿಷ್ಠ 3 ಚಿತ್ರಗಳು)',
    uploadSubHint: 'ಸಂಪೂರ್ಣ ಎಲೆ ಅಥವಾ ರೋಗವಿರುವ ಭಾಗವನ್ನು ಹಗಲು ಬೆಳಕಿನಲ್ಲಿ ಸ್ಪಷ್ಟವಾಗಿ ತೆಗೆಯಿರಿ.',
    cameraBtn: 'ಕ್ಯಾಮೆರಾ ಬಳಸಿ ಫೋಟೋ ತೆಗೆಯಿರಿ',
    needPhotoErr: 'ದಯವಿಟ್ಟು ಕನಿಷ್ಠ ಒಂದು ಎಲೆಯ ಫೋಟೋವನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ (ಗರಿಷ್ಠ 3).',
    unsupportedFmt: 'ಬೆಂಬಲಿಸದ ಫೈಲ್ ಮಾದರಿ. JPEG, PNG, ಅಥವಾ WEBP ಬಳಸಿ.',
    sizeLimitErr: 'ಫೋಟೋ ಗಾತ್ರ 10 MB ಗಿಂತ ಹೆಚ್ಚಿದೆ.',
    analyzeErr: 'ಪರೀಕ್ಷಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಬ್ಯಾಕೆಂಡ್ ಸಂಪರ್ಕ ಪರಿಶೀಲಿಸಿ.',
    noPhotosHint: '1–3 ಸ್ಪಷ್ಟ ಎಲೆ ಫೋಟೋಗಳನ್ನು ಹಾಕಿ ಮತ್ತು "ಬೆಳೆ ಪರೀಕ್ಷಿಸಿ" ಒತ್ತಿ. ರೋಗ ಪತ್ತೆ ಸಂಪೂರ್ಣವಾಗಿ ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿ ನಡೆಯುತ್ತದೆ.',
    tip1: 'ಸೂರ್ಯನ ಬೆಳಕಿನಲ್ಲಿ ಸ್ಪಷ್ಟ ಫೋಟೋ ತೆಗೆಯಿರಿ.',
    tip2: 'ನೆರಳು ಮತ್ತು ಮಣ್ಣಿನ ಗೊಂದಲವಿಲ್ಲದಂತೆ ಎಲೆಯನ್ನು ತೋರಿಸಿ.',
    modelScore: 'AI ವಿಶ್ವಾಸ:', disagreementNote: 'ಬಹು-ಚಿತ್ರ ಸೂಚನೆ:', noPreds: 'ಯಾವುದೇ ಫಲಿತಾಂಶ ಲಭ್ಯವಿಲ್ಲ.',
    qualityLbl: 'ಫೋಟೋ ಗುಣಮಟ್ಟ:', sevLbl: 'ತೀವ್ರತೆ:', sevUnavailable: 'ಲಭ್ಯವಿಲ್ಲ (ರೋಗ ಗುರುತಿಸುವಿಕೆ ಮಾತ್ರ)',
    techSummary: 'ತಾಂತ್ರಿಕ ಮಾದರಿ ಮತ್ತು ಮಿತಿಗಳ ವಿವರಗಳು', modelLbl: 'ಮಾದರಿ:', latencyLbl: 'ಪರೀಕ್ಷಾ ಸಮಯ:',
    whatShouldIDo: 'ಈಗ ನಾನು ಏನು ಮಾಡಬೇಕು?', causesConds: 'ಹರಡುವ ಪರಿಸ್ಥಿತಿ:', sourcesLbl: 'ಆಧಾರಗಳು:', liveWeatherUnavail: 'ನೇರ ಹವಾಮಾನ ಲಭ್ಯವಿಲ್ಲ.',
    biointelNote: 'ರೋಗ ನಿರೋಧಕ ಬೀಜ ತಳಿಗಳು ಮತ್ತು ಹತ್ತಿರದ ನರ್ಸರಿಗಳನ್ನು ನೋಡಿ:',
    optAlertTitle: 'ಜಿಲ್ಲಾ ಮಟ್ಟದ ರೋಗ ಎಚ್ಚರಿಕೆ (ನಿಖರ ಸ್ಥಳ ಗೌಪ್ಯವಾಗಿರುತ್ತದೆ)',
    optAlertDescPrefix: 'ಸುತ್ತಮುತ್ತಲಿನ ರೈತರಿಗೆ ಎಚ್ಚರಿಕೆ ನೀಡಲು',
    optAlertDescSuffix: 'ಜಿಲ್ಲೆಗೆ ಅನಾಮಧೇಯ ರೋಗ ಮಾಹಿತಿ ಹಂಚಿಕೊಳ್ಳಿ.',
    submittingBtn: 'ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ...', confirmAlertBtn: 'ದೃಢೀಕರಿಸಿ ಜಿಲ್ಲಾ ಎಚ್ಚರಿಕೆ ನೀಡಿ',
    reportSuccessPrefix: 'ರೋಗ ಎಚ್ಚರಿಕೆ ಹಂಚಿಕೊಳ್ಳಲಾಗಿದೆ:', reportErr: 'ವರದಿ ಸಲ್ಲಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.',
    signInHist: 'ನಿಮ್ಮ ಹಿಂದಿನ ಎಲೆ ಪರೀಕ್ಷೆಗಳನ್ನು ನೋಡಲು ಲಾಗಿನ್ ಆಗಿ.', noHist: 'ಇನ್ನೂ ಯಾವುದೇ ಎಲೆ ಪರೀಕ್ಷೆಗಳು ಉಳಿಸಲ್ಪಟ್ಟಿಲ್ಲ.',
    scoreLbl: 'ವಿಶ್ವಾಸ:', spokenCrop: 'ಬೆಳೆ:', spokenDiag: 'ರೋಗ ಪತ್ತೆ:', spokenPct: 'ಶೇಕಡಾ ವಿಶ್ವಾಸ', spokenRecs: 'ಸಲಹೆ ಕ್ರಮಗಳು:',
  },
  hi: {
    onnxReady: 'ऑफलाइन AI तैयार (38 रोग पहचान)', checkingModel: 'AI मॉडल जांच रहे हैं...', selectCropAria: 'फसल चुनें',
    uploadHint: 'पत्ती की फोटो अपलोड करने के लिए क्लिक करें (JPEG, PNG · अधिकतम 3 फोटो)',
    uploadSubHint: 'दिन के उजाले में पूरी पत्ती या रोगग्रस्त हिस्से की साफ फोटो लें।',
    cameraBtn: 'कैमरे से फोटो लें',
    needPhotoErr: 'कृपया कम से कम एक पत्ती की फोटो अपलोड करें (अधिकतम 3)।',
    unsupportedFmt: 'असमर्थित फ़ाइल प्रकार। JPEG, PNG या WEBP का उपयोग करें।',
    sizeLimitErr: 'फ़ाइल का आकार 10 MB से अधिक है।',
    analyzeErr: 'जांच विफल रही। कृपया बैकएंड कनेक्शन जांचें।',
    noPhotosHint: '1–3 साफ पत्ती की फोटो अपलोड करें और "फसल की जांच करें" पर क्लिक करें। AI जांच ऑफलाइन होती है।',
    tip1: 'साफ प्राकृतिक दिन के उजाले में फोटो लें।',
    tip2: 'गहरी परछाई और मिट्टी से बचें।',
    modelScore: 'मॉडल विश्वास:', disagreementNote: 'बहु-छवि टिप्पणी:', noPreds: 'कोई अनुमान उपलब्ध नहीं।',
    qualityLbl: 'फोटो गुणवत्ता:', sevLbl: 'गंभीरता:', sevUnavailable: 'अनुपलब्ध (केवल रोग पहचान मॉडल)',
    techSummary: 'तकनीकी मॉडल व सीमा विवरण', modelLbl: 'मॉडल:', latencyLbl: 'जांच समय:',
    whatShouldIDo: 'मुझे अब क्या करना चाहिए?', causesConds: 'अनुकूल परिस्थितियाँ:', sourcesLbl: 'स्रोत:', liveWeatherUnavail: 'लाइव मौसम अनुपलब्ध।',
    biointelNote: 'रोग-प्रतिरोधी बीज किस्में और नज़दीकी नर्सरी देखें:',
    optAlertTitle: 'वैकल्पिक जिला-स्तरीय चेतावनी (सटीक स्थान गोपनीय)',
    optAlertDescPrefix: 'आसपास के किसानों को सतर्क करने के लिए',
    optAlertDescSuffix: 'क्षेत्र में गुमनाम रोग सूचना साझा करें।',
    submittingBtn: 'जमा हो रहा है...', confirmAlertBtn: 'पुष्टि कर जिला चेतावनी साझा करें',
    reportSuccessPrefix: 'जिला स्तरीय चेतावनी दर्ज:', reportErr: 'रिपोर्ट जमा करने में असमर्थ।',
    signInHist: 'अपना पिछला फसल जांच इतिहास देखने के लिए लॉगिन करें।', noHist: 'अभी तक कोई जांच सहेजी नहीं गई है।',
    scoreLbl: 'विश्वास:', spokenCrop: 'फसल:', spokenDiag: 'रोग पहचान:', spokenPct: 'प्रतिशत विश्वास', spokenRecs: 'अनुशंसित कदम:',
  },
  te: {
    onnxReady: 'ఆఫ్‌లైన్ AI సిద్ధంగా ఉంది (38 వ్యాధులు)', checkingModel: 'AI తనిఖీ చేస్తోంది...', selectCropAria: 'పంటను ఎంచుకోండి',
    uploadHint: 'ఆకు ఫోటో అప్‌లోడ్ చేయడానికి ఇక్కడ నొక్కండి (JPEG, PNG · గరిష్టంగా 3 ఫోటోలు)',
    uploadSubHint: 'పగటి వెలుతురులో పూర్తి ఆకు లేదా మచ్చ ఉన్న భాగాన్ని స్పష్టంగా తీయండి.',
    cameraBtn: 'కెమెరాతో ఫోటో తీయండి',
    needPhotoErr: 'దయచేసి కనీసం ఒక ఆకు ఫోటోను అప్‌లోడ్ చేయండి (గరిష్టంగా 3).',
    unsupportedFmt: 'మద్దతు లేని ఫైల్ ఫార్మాట్. JPEG, PNG లేదా WEBP వాడండి.',
    sizeLimitErr: 'ఫోటో 10 MB కంటే ఎక్కువగా ఉంది.',
    analyzeErr: 'పరీక్ష విఫలమైంది. దయచేసి సర్వర్ కనెక్షన్ తనిఖీ చేయండి.',
    noPhotosHint: '1–3 స్పష్టమైన ఆకు ఫోటోలు అప్‌లోడ్ చేసి "పంటను పరీక్షించండి" నొక్కండి. AI ఆఫ్‌లైన్‌లో పని చేస్తుంది.',
    tip1: 'పగటి వెలుతురులో స్పష్టమైన ఫోటో తీయండి.',
    tip2: 'నీడలు మరియు మట్టి గందరగోళం లేకుండా ఫోటో తీయండి.',
    modelScore: 'AI నమ్మకం:', disagreementNote: 'బహుళ-ఫోటో గమనిక:', noPreds: 'అంచనాలు అందుబాటులో లేవు.',
    qualityLbl: 'ఫోటో నాణ్యత:', sevLbl: 'తీవ్రత:', sevUnavailable: 'అందుబాటులో లేదు (వ్యాధి గుర్తింపు మాత్రమే)',
    techSummary: 'సాంకేతిక మోడల్ & పరిమితుల వివరాలు', modelLbl: 'మోడల్:', latencyLbl: 'పరీక్ష సమయం:',
    whatShouldIDo: 'నేను ఇప్పుడు ఏమి చేయాలి?', causesConds: 'వ్యాప్తి పరిస్థితులు:', sourcesLbl: 'ఆధారాలు:', liveWeatherUnavail: 'ప్రత్యక్ష వాతావరణం అందుబాటులో లేదు.',
    biointelNote: 'వ్యాధి-తట్టుకునే విత్తన రకాలు మరియు సమీప నర్సరీలను చూడండి:',
    optAlertTitle: 'ఐచ్ఛిక జిల్లా హెచ్చరిక (ఖచ్చితమైన స్థానం గోప్యంగా ఉంటుంది)',
    optAlertDescPrefix: 'చుట్టుపక్కల రైతులను అప్రమత్తం చేయడానికి',
    optAlertDescSuffix: 'జిల్లాకు అనామక సమాచారాన్ని పంచండి.',
    submittingBtn: 'పంపిస్తోంది...', confirmAlertBtn: 'నిర్ధారించి జిల్లా హెచ్చరిక పంపండి',
    reportSuccessPrefix: 'ప్రాంతీయ హెచ్చరిక పంపబడింది:', reportErr: 'నివేదిక పంపడం సాధ్యం కాలేదు.',
    signInHist: 'మీ గత పంట పరీక్ష చరిత్రను చూడటానికి లాగిన్ చేయండి.', noHist: 'ఇంకా ఎటువంటి పరీక్షలు సేవ్ కాలేదు.',
    scoreLbl: 'నమ్మకం:', spokenCrop: 'పంట:', spokenDiag: 'నిర్ధారణ:', spokenPct: 'శాతం నమ్మకం', spokenRecs: 'సూచించిన చర్యలు:',
  },
};

export default function DiagnosticsPage() {
  const { currentFarm, currentUser, weather, language, token, t } = useFarm();
  const s = UI_STRINGS[language] || UI_STRINGS.en;
  const L = DIAG_I18N[language] || DIAG_I18N.en;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [supportedCrops, setSupportedCrops] = useState<string[]>([
    'Tomato',
    'Potato',
    'Corn (Maize)',
    'Bell Pepper',
    'Grape',
    'Apple',
  ]);
  const [modelMeta, setModelMeta] = useState<{
    model_available: boolean;
    model_name?: string;
    model_version?: string;
    sha256?: string;
  } | null>(null);

  const [selectedCrop, setSelectedCrop] = useState<string>('auto');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [multiResult, setMultiResult] = useState<MultiImageDiagnosticResponse | null>(null);
  const [history, setHistory] = useState<DiagnosticHistoryItem[]>([]);
  const [reportPending, setReportPending] = useState<boolean>(false);
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  const authToken =
    token ||
    (typeof window !== 'undefined'
      ? window.localStorage.getItem('rm_token') || window.localStorage.getItem('rm_auth_token')
      : null);

  useEffect(() => {
    fetchCropDiagnosticsStatus().then((st) => {
      if (st) {
        setModelMeta(st);
        if (st.supported_crops?.length) setSupportedCrops(st.supported_crops);
      }
    });
  }, []);

  useEffect(() => {
    if (authToken) {
      fetchDiagnosticHistory(authToken).then(setHistory);
    } else {
      setHistory([]);
    }
  }, [authToken, currentUser.id]);

  const handleFilesSelected = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    setValidationError(null);
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const nextFiles: File[] = [...files];

    for (let i = 0; i < incoming.length && nextFiles.length < 3; i++) {
      const f = incoming[i];
      if (!allowed.includes(f.type.toLowerCase())) {
        setValidationError(`${L.unsupportedFmt} (${f.name})`);
        continue;
      }
      if (f.size > 10 * 1024 * 1024) {
        setValidationError(`${L.sizeLimitErr} (${f.name})`);
        continue;
      }
      nextFiles.push(f);
    }
    setFiles(nextFiles);
    setPreviews(nextFiles.map((f) => URL.createObjectURL(f)));
    setMultiResult(null);
    setReportStatus(null);
  };

  const removeFile = (idx: number) => {
    const next = files.filter((_, i) => i !== idx);
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
    setMultiResult(null);
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      setValidationError(L.needPhotoErr);
      return;
    }
    setValidationError(null);
    setIsLoading(true);
    try {
      const res = await analyzeCropLeaves({
        files,
        crop: selectedCrop,
        farmId: currentFarm?.id,
        token: authToken,
        temperatureC: weather?.current?.temperature_c,
        humidityPct: weather?.current?.relative_humidity_pct,
        rainfallMm: weather?.current?.precipitation_mm,
        language,
      } as any);
      setMultiResult(res);
      if (authToken) {
        fetchDiagnosticHistory(authToken).then(setHistory);
      }
    } catch (err: any) {
      setValidationError(err?.message || L.analyzeErr);
    } finally {
      setIsLoading(false);
    }
  };

  const primary: CropDiagnosticResult | undefined = multiResult?.primary_result;

  const handleReadAloud = () => {
    if (!primary || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const parts: string[] = [];
    if (primary.crop) parts.push(`${L.spokenCrop} ${localizeCropName(primary.crop, language)}.`);
    if (primary.predicted_disease) {
      const pct = primary.confidence ? `${Math.round(primary.confidence * 100)} ${L.spokenPct}` : '';
      parts.push(`${L.spokenDiag} ${localizeDiseaseName(primary.predicted_disease, language)} (${pct}).`);
    }
    if (primary.uncertainty) parts.push(primary.uncertainty);
    if (primary.recommended_actions?.length) {
      parts.push(`${L.spokenRecs} ${primary.recommended_actions.slice(0, 2).join('. ')}`);
    }
    const utt = new SpeechSynthesisUtterance(parts.join(' '));
    utt.lang =
      language === 'kn'
        ? 'kn-IN'
        : language === 'hi'
          ? 'hi-IN'
          : language === 'te'
            ? 'te-IN'
            : 'en-IN';
    window.speechSynthesis.speak(utt);
  };

  const handleConfirmSurveillance = async () => {
    if (!authToken || !primary?.crop || !primary?.predicted_disease) return;
    setReportPending(true);
    try {
      const region = currentFarm?.district || 'Mandya';
      await submitCommunityDiseaseReport(authToken, {
        crop: primary.crop,
        suspected_disease: primary.predicted_disease,
        region,
        confidence: primary.confidence,
        user_confirmed: true,
      });
      setReportStatus(`${L.reportSuccessPrefix} ${region}.`);
    } catch (err: any) {
      setReportStatus(err?.message || L.reportErr);
    } finally {
      setReportPending(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl border border-[#DCD8CA] dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-[#173C2B] text-white">
            <Microscope className="w-6 h-6 text-[#86efac]" />
          </div>
          <div>
            <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#20372A] dark:text-white">
              {s.title}
            </h1>
            <p className="text-xs text-[#8D7357] dark:text-zinc-400 font-medium">{s.tagline}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span
            className={`px-2.5 py-1 rounded-full font-semibold border ${
              modelMeta?.model_available
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {modelMeta?.model_available ? L.onnxReady : L.checkingModel}
          </span>
        </div>
      </div>

      {/* Section A & B: Upload/Scan + Diagnosis Result */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Section A — Upload and Scan */}
        <div className="lg:col-span-5 p-6 bg-white dark:bg-zinc-950 border border-[#DCD8CA] dark:border-zinc-800 rounded-2xl shadow-sm space-y-4 text-xs">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#20372A] dark:text-white">{t('cropDoctorUploadTitle')}</h2>
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              aria-label={L.selectCropAria}
              className="p-2 rounded-xl bg-[#F7F5ED] dark:bg-zinc-900 border border-[#DCD8CA] dark:border-zinc-700 text-xs font-medium"
            >
              <option value="auto">{s.autoCrop}</option>
              {supportedCrops.map((c) => (
                <option key={c} value={c}>
                  {localizeCropName(c, language)}
                </option>
              ))}
            </select>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#DCD8CA] dark:border-zinc-700 rounded-2xl p-6 text-center space-y-2 cursor-pointer hover:border-[#36784D] transition bg-[#F7F5ED]/60 dark:bg-zinc-900/40"
          >
            <Upload className="w-7 h-7 mx-auto text-[#36784D]" />
            <p className="font-semibold text-[#20372A] dark:text-zinc-200">
              {L.uploadHint}
            </p>
            <p className="text-[11px] text-zinc-500">
              {L.uploadSubHint}
            </p>
          </div>

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="w-full py-2 rounded-xl border border-[#DCD8CA] dark:border-zinc-700 text-[#20372A] dark:text-zinc-200 font-semibold flex items-center justify-center gap-2 hover:bg-[#F7F5ED] dark:hover:bg-zinc-900"
          >
            <Camera className="w-4 h-4 text-[#36784D]" />
            {L.cameraBtn}
          </button>

          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((url, idx) => (
                <div key={url} className="relative rounded-xl overflow-hidden border border-[#DCD8CA] dark:border-zinc-800 h-24">
                  <img src={url} alt={`Leaf ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    aria-label={`${t('close')} ${idx + 1}`}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/65 text-white hover:bg-black"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {validationError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full py-3 bg-[#173C2B] hover:bg-[#102D20] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition shadow-sm"
          >
            {isLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Microscope className="w-4 h-4" />}
            <span>{isLoading ? t('cropDoctorAnalyzing') : s.analyze}</span>
          </button>
        </div>

        {/* Section B — Diagnosis Result */}
        <div className="lg:col-span-7 p-6 bg-white dark:bg-zinc-950 border border-[#DCD8CA] dark:border-zinc-800 rounded-2xl shadow-sm space-y-4 text-xs">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[#20372A] dark:text-white">{t('cropDoctorResultTitle')}</h2>
            {primary && (
              <button
                type="button"
                onClick={handleReadAloud}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F7F5ED] dark:bg-zinc-900 border border-[#DCD8CA] dark:border-zinc-700 font-semibold text-[#173C2B] dark:text-emerald-300"
              >
                <Volume2 className="w-3.5 h-3.5" />
                {s.readAloud}
              </button>
            )}
          </div>

          {!primary ? (
            <div className="p-6 rounded-xl bg-[#F7F5ED] dark:bg-zinc-900 border border-[#DCD8CA] dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 space-y-2">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#36784D]" />
                <span>{L.noPhotosHint}</span>
              </div>
              <ul className="list-disc pl-6 space-y-1 text-[11px]">
                <li>{L.tip1}</li>
                <li>{L.tip2}</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Primary Status Card */}
              <div
                className={`p-4 rounded-xl border space-y-2 ${
                  primary.diagnosis_status === 'healthy'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-100'
                    : primary.diagnosis_status === 'diseased'
                      ? 'bg-amber-50 border-amber-200 text-amber-950 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-100'
                      : 'bg-rose-50 border-rose-200 text-rose-950 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-100'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {primary.diagnosis_status === 'healthy' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-amber-600" />
                    )}
                    <span>
                      {primary.crop ? `${localizeCropName(primary.crop, language)} — ` : ''}
                      {primary.predicted_disease ? localizeDiseaseName(primary.predicted_disease, language) : s.uncertain}
                    </span>
                  </div>
                  {primary.confidence !== null && primary.confidence !== undefined && (
                    <span className="px-2.5 py-0.5 rounded-full bg-white/80 dark:bg-black/40 font-bold text-[11px]">
                      {L.modelScore} {(primary.confidence * 100).toFixed(1)}%
                    </span>
                  )}
                </div>

                {primary.uncertainty && (
                  <p className="text-xs font-medium">{primary.uncertainty}</p>
                )}

                {multiResult?.disagreement_warning && (
                  <div className="p-2.5 rounded-lg bg-white/70 dark:bg-black/30 border border-amber-300 text-xs font-medium">
                    {L.disagreementNote} {multiResult.disagreement_warning}
                  </div>
                )}
              </div>

              {/* Top 3 Candidates + Image Quality + Severity Honesty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#F7F5ED] dark:bg-zinc-900 border border-[#DCD8CA] dark:border-zinc-800 space-y-2">
                  <div className="font-bold text-[#20372A] dark:text-white">{t('cropDoctorTopCandidates')}</div>
                  {primary.top_predictions.length === 0 ? (
                    <div className="text-zinc-500">{L.noPreds}</div>
                  ) : (
                    primary.top_predictions.map((cand, i) => (
                      <div key={cand.class_index} className="flex items-center justify-between text-[11px]">
                        <span>
                          {i + 1}. {localizeCropName(cand.crop, language)}: <strong>{localizeDiseaseName(cand.disease, language)}</strong>
                        </span>
                        <span className="font-semibold">{(cand.score * 100).toFixed(1)}%</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-[#F7F5ED] dark:bg-zinc-900 border border-[#DCD8CA] dark:border-zinc-800 space-y-1.5">
                  <div className="font-bold text-[#20372A] dark:text-white">{t('cropDoctorQualityLabel')}</div>
                  <div>
                    {L.qualityLbl} <strong className="capitalize">{localizeCondition(primary.image_quality?.quality_rating || 'unknown', language)}</strong>{' '}
                    ({primary.image_quality?.width}×{primary.image_quality?.height}px)
                  </div>
                  <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    {L.sevLbl} <strong>{L.sevUnavailable}</strong>
                  </div>
                  {primary.image_quality?.warnings?.map((w, i) => (
                    <div key={i} className="text-[11px] text-amber-700 dark:text-amber-300">
                      • {w}
                    </div>
                  ))}
                </div>
              </div>

              {/* Expandable Technical Details */}
              <details className="p-3 rounded-xl border border-[#DCD8CA] dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400">
                <summary className="cursor-pointer font-semibold text-[#20372A] dark:text-zinc-200">
                  {L.techSummary}
                </summary>
                <div className="mt-2 space-y-1">
                  <div>{L.modelLbl} {primary.model_name} ({primary.model_version})</div>
                  {primary.inference_time_ms !== undefined && (
                    <div>{L.latencyLbl} {primary.inference_time_ms} ms</div>
                  )}
                  {modelMeta?.sha256 && <div className="break-all">SHA-256: {modelMeta.sha256}</div>}
                  <ul className="list-disc pl-4 pt-1 space-y-0.5">
                    {primary.limitations?.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* Section D & E: Farmer Guidance, Weather Risk, BioIntel & Community Surveillance */}
      {primary?.knowledge && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
          <div className="lg:col-span-7 p-6 bg-white dark:bg-zinc-950 border border-[#DCD8CA] dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-[#20372A] dark:text-white flex items-center gap-2">
              <Sprout className="w-4 h-4 text-[#36784D]" />
              {L.whatShouldIDo} — {localizeDiseaseName(primary.knowledge.disease_name, language)}
            </h2>

            <div className="space-y-3">
              <div>
                <div className="font-bold text-[#20372A] dark:text-zinc-200">{t('cropDoctorQ1')}</div>
                <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">{primary.knowledge.symptoms}</p>
              </div>
              <div>
                <div className="font-bold text-[#20372A] dark:text-zinc-200">{t('cropDoctorQ2')}</div>
                <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">
                  {primary.knowledge.causes} {L.causesConds} {primary.knowledge.favorable_conditions}
                </p>
              </div>
              <div>
                <div className="font-bold text-[#20372A] dark:text-zinc-200">{t('cropDoctorQ3')}</div>
                <ul className="list-disc pl-5 text-zinc-600 dark:text-zinc-400 mt-0.5 space-y-1">
                  {primary.knowledge.immediate_actions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                  {primary.knowledge.biological_options.map((b, i) => (
                    <li key={`bio-${i}`}>{b}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-bold text-[#20372A] dark:text-zinc-200">{t('cropDoctorQ4')}</div>
                <ul className="list-disc pl-5 text-zinc-600 dark:text-zinc-400 mt-0.5 space-y-1">
                  {primary.knowledge.cultural_practices.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                  {primary.knowledge.preventive_measures.map((p, i) => (
                    <li key={`prev-${i}`}>{p}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-bold text-[#20372A] dark:text-zinc-200">{t('cropDoctorQ5')}</div>
                <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">{primary.knowledge.when_to_consult_expert}</p>
              </div>
              <div className="text-[11px] text-zinc-500 pt-2 border-t border-[#E9E5D8] dark:border-zinc-800">
                {L.sourcesLbl}{' '}
                {primary.knowledge.sources.map((src) => `${src.institution} — ${src.title} (${src.verified_on})`).join(' | ')}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            {/* Weather-Aware Disease Risk */}
            <div className="p-5 bg-white dark:bg-zinc-950 border border-[#DCD8CA] dark:border-zinc-800 rounded-2xl shadow-sm space-y-2">
              <div className="font-bold text-sm text-[#20372A] dark:text-white flex items-center gap-2">
                <CloudSun className="w-4 h-4 text-[#C9A35C]" />
                {t('cropDoctorWeatherRisk')}
              </div>
              <p className="text-zinc-600 dark:text-zinc-400">
                {primary.weather_risk?.summary || L.liveWeatherUnavail}
              </p>
              <p className="text-[11px] text-zinc-500 italic">
                {primary.weather_risk?.disclaimer}
              </p>
            </div>

            {/* BioIntel & Nursery Integration */}
            <div className="p-5 bg-[#F7F5ED] dark:bg-zinc-900 border border-[#DCD8CA] dark:border-zinc-800 rounded-2xl space-y-3">
              <div className="font-bold text-sm text-[#20372A] dark:text-white flex items-center gap-2">
                <Dna className="w-4 h-4 text-[#36784D]" />
                {t('cropDoctorBioIntelTitle')}
              </div>
              <p className="text-zinc-600 dark:text-zinc-400">
                {L.biointelNote} <strong>{localizeCropName(primary.crop, language)}</strong>.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/biointel?crop=${encodeURIComponent(primary.crop || 'Tomato')}#nurseries`}
                  className="px-3.5 py-2 rounded-xl bg-[#173C2B] text-white font-semibold hover:bg-[#102D20]"
                >
                  {t('cropDoctorBioIntelBtn')}
                </Link>
              </div>
            </div>

            {/* Optional Community Surveillance Reporting */}
            {!primary.is_healthy && authToken && (
              <div className="p-5 bg-white dark:bg-zinc-950 border border-[#DCD8CA] dark:border-zinc-800 rounded-2xl space-y-2.5">
                <div className="font-bold text-sm text-[#20372A] dark:text-white">
                  {L.optAlertTitle}
                </div>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {L.optAlertDescPrefix} {currentFarm?.district || 'Mandya'} {L.optAlertDescSuffix}
                </p>
                <button
                  type="button"
                  disabled={reportPending || !!reportStatus}
                  onClick={handleConfirmSurveillance}
                  className="px-3.5 py-2 rounded-xl border border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 font-semibold"
                >
                  {reportPending ? L.submittingBtn : L.confirmAlertBtn}
                </button>
                {reportStatus && <div className="text-[11px] text-emerald-700 dark:text-emerald-300">{reportStatus}</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section F — Crop Health History */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-[#DCD8CA] dark:border-zinc-800 rounded-2xl shadow-sm space-y-3 text-xs">
        <div className="flex items-center gap-2 font-bold text-sm text-[#20372A] dark:text-white">
          <History className="w-4 h-4 text-[#36784D]" />
          {t('cropDoctorHistoryTitle')}
        </div>
        {!authToken ? (
          <p className="text-zinc-500">{L.signInHist}</p>
        ) : history.length === 0 ? (
          <p className="text-zinc-500">{L.noHist}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {history.slice(0, 6).map((item) => (
              <div key={item.id} className="p-3.5 rounded-xl bg-[#F7F5ED] dark:bg-zinc-900 border border-[#DCD8CA] dark:border-zinc-800 space-y-1">
                <div className="font-bold text-[#20372A] dark:text-white">
                  {localizeCropName(item.predicted_crop || item.requested_crop, language)} — {localizeDiseaseName(item.predicted_disease || item.diagnosis_status, language)}
                </div>
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  {L.scoreLbl} {item.confidence !== null && item.confidence !== undefined ? `${(item.confidence * 100).toFixed(1)}%` : '—'} · {L.qualityLbl} {localizeCondition(item.image_quality || '', language) || '—'}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {new Date(item.created_at).toLocaleString(getIntlLocale(language))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
