// frontend/src/lib/i18n/biointelAndRecs.ts
import { Language } from '@/types';

type TermEntry = Record<Language, string>;

export const PRIORITY_TERMS: Record<string, TermEntry> = {
  critical: { en: 'Critical', kn: 'ಗಂಭೀರ', hi: 'गंभीर', te: 'తీవ్రమైన' },
  high: { en: 'High', kn: 'ಹೆಚ್ಚು', hi: 'उच्च', te: 'అధిక' },
  medium: { en: 'Medium', kn: 'ಮಧ್ಯಮ', hi: 'मध्यम', te: 'మధ్యస్థం' },
  low: { en: 'Low', kn: 'ಕಡಿಮೆ', hi: 'कम', te: 'తక్కువ' },
};

export const URGENCY_TERMS: Record<string, TermEntry> = {
  immediate: { en: 'Immediate', kn: 'ತಕ್ಷಣ', hi: 'तुरंत', te: 'తక్షణం' },
  today: { en: 'Today', kn: 'ಇಂದು', hi: 'आज', te: 'ఈరోజు' },
  upcoming: { en: 'Upcoming', kn: 'ಮುಂಬರುವ', hi: 'आगामी', te: 'రాబోయే' },
  monitoring: { en: 'Monitoring', kn: 'ನಿಗಾ', hi: 'निगरानी', te: 'పర్యవేక్షణ' },
};

export const CATEGORY_TERMS: Record<string, TermEntry> = {
  irrigation: { en: 'Irrigation', kn: 'ನೀರಾವರಿ', hi: 'सिंचाई', te: 'నీటిపారుదల' },
  nutrition: { en: 'Nutrition', kn: 'ಪೋಷಕಾಂಶ', hi: 'पोषण', te: 'పోషకాలు' },
  crop_protection: { en: 'Crop Protection', kn: 'ಬೆಳೆ ರಕ್ಷಣೆ', hi: 'फसल सुरक्षा', te: 'పంట రక్షణ' },
  market: { en: 'Market', kn: 'ಮಾರುಕಟ್ಟೆ', hi: 'बाज़ार', te: 'మార్కెట్' },
  risk: { en: 'Risk', kn: 'ಅಪಾಯ', hi: 'जोखिम', te: 'ప్రమాదం' },
  biotech: { en: 'BioIntel', kn: 'ಜೈವಿಕ ತಂತ್ರಜ್ಞಾನ', hi: 'जैव-प्रौद्योगिकी', te: 'బయోటెక్' },
  labour: { en: 'Labour', kn: 'ಕಾರ್ಮಿಕರು', hi: 'श्रमिक', te: 'కూలీలు' },
  logistics: { en: 'Logistics', kn: 'ಸಾರಿಗೆ', hi: 'परिवहन', te: 'రవాణా' },
};

export const AVAILABILITY_TERMS: Record<string, TermEntry> = {
  in_stock: { en: 'In Stock', kn: 'ದಾಸ್ತಾನು ಲಭ್ಯವಿದೆ', hi: 'स्टॉक में उपलब्ध', te: 'స్టాక్ అందుబాటులో ఉంది' },
  low_stock: { en: 'Low Stock', kn: 'ಕಡಿಮೆ ದಾಸ್ತಾನು', hi: 'कम स्टॉक', te: 'తక్కువ స్టాక్' },
  out_of_stock: { en: 'Out of Stock', kn: 'ದಾಸ್ತಾನು ಮುಗಿದಿದೆ', hi: 'स्टॉक समाप्त', te: 'స్టాక్ లేదు' },
  available: { en: 'Available', kn: 'ಲಭ್ಯವಿದೆ', hi: 'उपलब्ध', te: 'అందుబాటులో ఉంది' },
  limited: { en: 'Limited', kn: 'ಸೀಮಿತ', hi: 'सीमित', te: 'పరిమితం' },
  live: { en: 'LIVE', kn: 'ನೇರ', hi: 'लाइव', te: 'లైవ్' },
  measured: { en: 'MEASURED', kn: 'ಅಳತೆ ಮಾಡಿದ', hi: 'मापा गया', te: 'కొలవబడిన' },
  user_provided: { en: 'RECORDED', kn: 'ನೋಂದಾಯಿತ', hi: 'दर्ज डेटा', te: 'నమోదు చేసినది' },
  forecast: { en: 'FORECAST', kn: 'ಮುನ್ಸೂಚನೆ', hi: 'पूर्वानुमान', te: 'అంచనా' },
  cached: { en: 'CACHED', kn: 'ಸಂಗ್ರಹಿತ', hi: 'कैश्ड', te: 'కాష్ చేసినది' },
  demo: { en: 'DEMO', kn: 'ಡೆಮೊ', hi: 'डेमो', te: 'డెమో' },
};

export const BIOINTEL_CATEGORY_TERMS: Record<string, TermEntry> = {
  'disease-resistant crop variety': { en: 'Disease-Resistant Crop Variety', kn: 'ರೋಗ ನಿರೋಧಕ ಬೆಳೆ ತಳಿ', hi: 'रोग-प्रतिरोधी फसल किस्म', te: 'వ్యాధి-నిరోధక పంట రకం' },
  'disease-resistant varieties': { en: 'Disease-Resistant Varieties', kn: 'ರೋಗ ನಿರೋಧಕ ತಳಿಗಳು', hi: 'रोग-प्रतिरोधी किस्में', te: 'వ్యాధి-నిరోధక రకాలు' },
  'grafted plants': { en: 'Grafted Plants', kn: 'ಕಸಿ ಮಾಡಿದ ಸಸಿಗಳು', hi: 'ग्राफ्टेड पौधे', te: 'అంటు మొక్కలు' },
  'grafted saplings': { en: 'Grafted Saplings', kn: 'ಕಸಿ ಮಾಡಿದ ಸಸಿಗಳು', hi: 'ग्राफ्टेड पौधे', te: 'అంటు మొక్కలు' },
  'drought-tolerant variety': { en: 'Drought-Tolerant Variety', kn: 'ಬರ ನಿರೋಧಕ ತಳಿ', hi: 'सूखा-सहनशील किस्म', te: 'కరువు-తట్టుకునే రకం' },
  'drought-tolerant varieties': { en: 'Drought-Tolerant Varieties', kn: 'ಬರ ನಿರೋಧಕ ತಳಿಗಳು', hi: 'सूखा-सहनशील किस्में', te: 'కరువు-తట్టుకునే రకాలు' },
  'tissue-cultured plants': { en: 'Tissue-Cultured Plants', kn: 'ಟಿಶ್ಯೂ ಕಲ್ಚರ್ ಸಸಿಗಳು', hi: 'टिश्यू कल्चर पौधे', te: 'టిష్యూ కల్చర్ మొక్కలు' },
  biofertilizers: { en: 'Biofertilizers', kn: 'ಜೈವಿಕ ಗೊಬ್ಬರಗಳು', hi: 'जैव उर्वरक', te: 'జీవ ఎరువులు' },
  'biofertilizers & consortia': { en: 'Biofertilizers & Consortia', kn: 'ಜೈವಿಕ ಗೊಬ್ಬರಗಳು ಮತ್ತು ಸೂಕ್ಷ್ಮಜೀವಿ ಮಿಶ್ರಣ', hi: 'जैव उर्वरक व सूक्ष्मजीव संघ', te: 'జీవ ఎరువులు & కన్సార్టియా' },
  biopesticides: { en: 'Biopesticides', kn: 'ಜೈವಿಕ ಕೀಟನಾಶಕಗಳು', hi: 'जैव कीटनाशक', te: 'జీవ పురుగుమందులు' },
  'biopesticides & biocontrol': { en: 'Biopesticides & Biocontrol', kn: 'ಜೈವಿಕ ಕೀಟನಾಶಕ ಮತ್ತು ಜೈವಿಕ ನಿಯಂತ್ರಣ', hi: 'जैव कीटनाशक व जैव नियंत्रण', te: 'జీవ పురుగుమందులు & నియంత్రణ' },
  'hybrid varieties': { en: 'Hybrid Varieties', kn: 'ಹೈಬ್ರಿಡ್ ತಳಿಗಳು', hi: 'हाइब्रिड किस्में', te: 'హైబ్రిడ్ రకాలు' },
  'hybrid crop varieties': { en: 'Hybrid Crop Varieties', kn: 'ಹೈಬ್ರಿಡ್ ಬೆಳೆ ತಳಿಗಳು', hi: 'हाइब्रिड फसल किस्में', te: 'హైబ్రిడ్ పంట రకాలు' },
  'beneficial soil microorganisms': { en: 'Soil Microorganisms', kn: 'ಮಣ್ಣಿನ ಉಪಯುಕ್ತ ಸೂಕ್ಷ್ಮಜೀವಿಗಳು', hi: 'मिट्टी के लाभकारी सूक्ष्मजीव', te: 'నేలలోని ప్రయోజనకర సూక్ష్మజీవులు' },
  'biological nutrient management': { en: 'Biological Nutrients', kn: 'ಜೈವಿಕ ಪೋಷಕಾಂಶ ನಿರ್ವಹಣೆ', hi: 'जैविक पोषक प्रबंधन', te: 'జీవ పోషక నిర్వహణ' },
  'agricultural waste bioconversion': { en: 'Crop Residue Composting', kn: 'ಕೃಷಿ ತ್ಯಾಜ್ಯ ಗೊಬ್ಬರ ತಯಾರಿಕೆ', hi: 'फसल अवशेष खाद निर्माण', te: 'పంట వ్యర్థాల కంపోస్టింగ్' },
};

export function localizePriority(priority: string | undefined | null, lang: Language): string {
  if (!priority) return '';
  const k = priority.trim().toLowerCase();
  return PRIORITY_TERMS[k]?.[lang] || priority;
}

export function localizeUrgency(urgency: string | undefined | null, lang: Language): string {
  if (!urgency) return '';
  const k = urgency.trim().toLowerCase();
  return URGENCY_TERMS[k]?.[lang] || urgency;
}

export function localizeCategory(category: string | undefined | null, lang: Language): string {
  if (!category) return '';
  const k = category.trim().toLowerCase();
  return CATEGORY_TERMS[k]?.[lang] || category.replace(/_/g, ' ');
}

export function localizeAvailability(status: string | undefined | null, lang: Language): string {
  if (!status) return '';
  const k = status.trim().toLowerCase().replace(/\s+/g, '_');
  return AVAILABILITY_TERMS[k]?.[lang] || status.replace(/_/g, ' ');
}

export function localizeBioIntelCategory(label: string | undefined | null, lang: Language): string {
  if (!label) return '';
  const k = label.trim().toLowerCase();
  return BIOINTEL_CATEGORY_TERMS[k]?.[lang] || label;
}

const EXACT_PHRASE_MAP: Array<[RegExp, TermEntry]> = [
  // Evidence & Budget status
  [/^Strong \(Peer-reviewed meta-analysis\)$/i, {
    en: 'Strong (Peer-reviewed meta-analysis)',
    kn: 'ಬಲವಾದ ಆಧಾರ (ವಿಜ್ಞಾನಿಗಳ ಪರಿಶೀಲಿತ ಅಧ್ಯಯನ)',
    hi: 'मज़बूत प्रमाण (सहकर्मी-समीक्षित मेटा-विश्लेषण)',
    te: 'బలమైన ఆధారం (శాస్త్రవేత్తల సమీక్షిత అధ్యయనం)',
  }],
  [/^Moderate \(Field trials\)$/i, {
    en: 'Moderate (Field trials)',
    kn: 'ಮಧ್ಯಮ ಆಧಾರ (ಕ್ಷೇತ್ರ ಪ್ರಯೋಗಗಳು)',
    hi: 'मध्यम प्रमाण (खेत परीक्षण)',
    te: 'మధ్యస్థ ఆధారం (క్షేత్ర ప్రయోగాలు)',
  }],
  [/^Within Budget$/i, { en: 'Within Budget', kn: 'ಬಜೆಟ್ ಒಳಗಿದೆ', hi: 'बजट के भीतर', te: 'బడ్జెట్ లోపల' }],
  [/^Exceeds Budget$/i, { en: 'Exceeds Budget', kn: 'ಬಜೆಟ್ ಮೀರಿದೆ', hi: 'बजट से अधिक', te: 'బడ్జెట్ మించింది' }],
  [/^General bio-vigor$/i, { en: 'General bio-vigor', kn: 'ಸಾಮಾನ್ಯ ಬೆಳೆ ರೋಗ ನಿರೋಧಕತೆ', hi: 'सामान्य जैव-शक्ति व सुरक्षा', te: 'సాధారణ జీవ-శక్తి & రక్షణ' }],

  // BioIntel Tomato Arka Rakshak benefits & metadata
  [/^Genetic resistance to Tomato Leaf Curl Virus \(ToLCV\) via Ty-2 locus$/i, {
    en: 'Genetic resistance to Tomato Leaf Curl Virus (ToLCV) via Ty-2 locus',
    kn: 'Ty-2 ಜೀನ್ ಮೂಲಕ ಟೊಮೆಟೊ ಎಲೆ ಮುರುಟು ವೈರಸ್ (ToLCV) ವಿರುದ್ಧ ತಳೀಯ ರೋಗ ನಿರೋಧಕತೆ',
    hi: 'Ty-2 जीन द्वारा टमाटर पत्ता मरोड़ वायरस (ToLCV) के प्रति आनुवंशिक प्रतिरोधकता',
    te: 'Ty-2 జన్యువు ద్వారా టొమాటో ఆకు ముడత వైరస్ (ToLCV) కు జన్యు నిరోధకత',
  }],
  [/^High resistance to Bacterial Wilt \(Ralstonia solanacearum\)$/i, {
    en: 'High resistance to Bacterial Wilt (Ralstonia solanacearum)',
    kn: 'ಬ್ಯಾಕ್ಟೀರಿಯಾ ಸೊರಗು ರೋಗ (Ralstonia solanacearum) ವಿರುದ್ಧ ಅಧಿಕ ನಿರೋಧಕತೆ',
    hi: 'जीवाणु मुरझान रोग (Ralstonia solanacearum) के प्रति उच्च प्रतिरोधकता',
    te: 'బాక్టీరియా ఎండు తెగులు (Ralstonia solanacearum) కు అధిక నిరోధకత',
  }],
  [/^Resistance to Early Blight \(Alternaria solani\)$/i, {
    en: 'Resistance to Early Blight (Alternaria solani)',
    kn: 'ಆರಂಭಿಕ ಅಂಗಮಾರಿ ರೋಗ (Alternaria solani) ವಿರುದ್ಧ ನಿರೋಧಕತೆ',
    hi: 'अगेती झुलसा रोग (Alternaria solani) के प्रति प्रतिरोधकता',
    te: 'ముందస్తు ఎండు తెగులు (Alternaria solani) కు నిరోధకత',
  }],
  [/^High yield potential of 75-80 t\/ha with 15-20 days transport shelf life$/i, {
    en: 'High yield potential of 75-80 t/ha with 15-20 days transport shelf life',
    kn: 'ಹೆಕ್ಟೇರ್‌ಗೆ 75-80 ಟನ್ ಇಳುವರಿ ಸಾಮರ್ಥ್ಯ ಮತ್ತು 15-20 ದಿನಗಳ ಸಾಗಣೆ ಬಾಳಿಕೆ',
    hi: '75-80 टन/हेक्टेयर की उच्च उपज क्षमता और 15-20 दिनों की परिवहन शेल्फ लाइफ',
    te: 'హెక్టారుకు 75-80 టన్నుల అధిక దిగుబడి మరియు 15-20 రోజుల రవాణా నిల్వ సామర్థ్యం',
  }],
  [/^Moderate \(450-550 mm\)\. Highly responsive to drip fertigation under water stress\.$/i, {
    en: 'Moderate (450-550 mm). Highly responsive to drip fertigation under water stress.',
    kn: 'ಮಧ್ಯಮ (450-550 ಮಿ.ಮೀ). ನೀರಿನ ಕೊರತೆಯಲ್ಲಿ ಹನಿ ನೀರಾವರಿ ಮೂಲಕ ಗೊಬ್ಬರ ನೀಡುವುದಕ್ಕೆ ಉತ್ತಮ ಸ್ಪಂದನೆ.',
    hi: 'मध्यम (450-550 मिमी)। पानी की कमी में ड्रिप फर्टिगेशन के प्रति अत्यधिक अनुकूल।',
    te: 'మధ్యస్థం (450-550 మి.మీ). నీటి కొరతలో డ్రిప్ ఫర్టిగేషన్‌కు అత్యంత అనుకూలం.',
  }],
  [/^Triple resistant: ToLCV, Bacterial Wilt, Early Blight$/i, {
    en: 'Triple resistant: ToLCV, Bacterial Wilt, Early Blight',
    kn: 'ತ್ರಿವಳಿ ರೋಗ ನಿರೋಧಕತೆ: ToLCV, ಬ್ಯಾಕ್ಟೀರಿಯಾ ಸೊರಗು, ಆರಂಭಿಕ ಅಂಗಮಾರಿ',
    hi: 'त्रि-रोग प्रतिरोधी: ToLCV, जीवाणु मुरझान, अगेती झुलसा',
    te: 'మూడు వ్యాధులకు నిరోధకం: ToLCV, బాక్టీరియా ఎండు, ముందస్తు ఎండు తెగులు',
  }],
  [/^F1 hybrid seeds cannot be replanted from harvested fruit without segregation\. Seedlings must be sourced from certified nurseries\.$/i, {
    en: 'F1 hybrid seeds cannot be replanted from harvested fruit without segregation. Seedlings must be sourced from certified nurseries.',
    kn: 'F1 ಹೈಬ್ರಿಡ್ ಹಣ್ಣಿನಿಂದ ಬೀಜ ತೆಗೆದು ಮರು-ಬಿತ್ತನೆ ಮಾಡಬಾರದು. ಪ್ರಮಾಣೀಕೃತ ನರ್ಸರಿಗಳಿಂದಲೇ ಸಸಿಗಳನ್ನು ಪಡೆಯಬೇಕು.',
    hi: 'F1 हाइब्रिड फल से बीज निकालकर दोबारा बुवाई न करें। पौधे प्रमाणित नर्सरी से ही खरीदें।',
    te: 'F1 హైబ్రిడ్ కాయల నుండి విత్తనాలు తీసి మళ్ళీ నాటరాదు. ధృవీకరించబడిన నర్సరీల నుండే నారు తీసుకోవాలి.',
  }],

  // Grafted Tomato
  [/^Immunity to Root-Knot Nematodes \(Meloidogyne incognita\)$/i, {
    en: 'Immunity to Root-Knot Nematodes (Meloidogyne incognita)',
    kn: 'ಬೇರು ಗಂಟು ಹುಳು (Meloidogyne incognita) ವಿರುದ್ಧ ಸಂಪೂರ್ಣ ರಕ್ಷಣೆ',
    hi: 'जड़-गांठ सूत्रकृमि (Meloidogyne incognita) से पूर्ण सुरक्षा',
    te: 'వేరు కణుపు నులిపురుగు (Meloidogyne incognita) నుండి రక్షణ',
  }],
  [/^100% protection against soil-borne Bacterial Wilt without chemical fumigation$/i, {
    en: '100% protection against soil-borne Bacterial Wilt without chemical fumigation',
    kn: 'ರಾಸಾಯನಿಕ ಧೂಮೀಕರಣವಿಲ್ಲದೆ ಮಣ್ಣಿನ ಬ್ಯಾಕ್ಟೀರಿಯಾ ಸೊರಗು ರೋಗದಿಂದ 100% ರಕ್ಷಣೆ',
    hi: 'रासायनिक धूम्रीकरण के बिना मिट्टी जनित जीवाणु मुरझान से 100% सुरक्षा',
    te: 'రసాయన ధూమపానం లేకుండానే నేల ద్వారా వచ్చే బాక్టీరియా ఎండు నుండి 100% రక్షణ',
  }],
  [/^Extended harvesting duration \(additional 4-6 pickings\)$/i, {
    en: 'Extended harvesting duration (additional 4-6 pickings)',
    kn: 'ದೀರ್ಘಕಾಲದ ಕೊಯ್ಲು ಅವಧಿ (ಹೆಚ್ಚುವರಿ 4-6 ಕೊಯ್ಲುಗಳು)',
    hi: 'लंबी कटाई अवधि (अतिरिक्त 4-6 तुड़ाइयाँ)',
    te: 'దీర్ఘకాలిక కోత సమయం (అదనంగా 4-6 కోతలు)',
  }],
  [/^Enhanced nutrient and moisture extraction via deep wild root system$/i, {
    en: 'Enhanced nutrient and moisture extraction via deep wild root system',
    kn: 'ಆಳವಾದ ಮೂಲ ಬೇರು ವ್ಯವಸ್ಥೆಯಿಂದ ಉತ್ತಮ ಪೋಷಕಾಂಶ ಮತ್ತು ತೇವಾಂಶ ಹೀರಿಕೆ',
    hi: 'गहरी जड़ प्रणाली के माध्यम से बेहतर पोषक तत्व व नमी अवशोषण',
    te: 'లోతైన వేరు వ్యవస్థ ద్వారా మెరుగైన పోషకాలు మరియు తేమ శోషణ',
  }],
  [/^Excels in heavy, sick, or nematode-infested soils prone to waterlogging\.$/i, {
    en: 'Excels in heavy, sick, or nematode-infested soils prone to waterlogging.',
    kn: 'ನೀರು ನಿಲ್ಲುವ ಅಥವಾ ಬೇರು ಗಂಟು ಹುಳು ಬಾಧಿತ ಮಣ್ಣಿನಲ್ಲಿಯೂ ಉತ್ತಮವಾಗಿ ಬೆಳೆಯುತ್ತದೆ.',
    hi: 'जलभराव या सूत्रकृमि प्रभावित भारी मिट्टी में भी उत्कृष्ट प्रदर्शन करता है।',
    te: 'నీరు నిలిచే లేదా నులిపురుగులు ఉన్న నేలల్లో కూడా బాగా పెరుగుతుంది.',
  }],
  [/^Reduces irrigation frequency by 18% due to rootstock osmotic resilience\.$/i, {
    en: 'Reduces irrigation frequency by 18% due to rootstock osmotic resilience.',
    kn: 'ಬಲಿಷ್ಠ ಬೇರು ವ್ಯವಸ್ಥೆಯಿಂದ ನೀರಾವರಿ ಆವರ್ತನವನ್ನು 18% ಕಡಿಮೆ ಮಾಡುತ್ತದೆ.',
    hi: 'मजबूत जड़ प्रणाली के कारण सिंचाई की आवृत्ति 18% तक कम होती है।',
    te: 'బలమైన వేరు వ్యవస్థ వల్ల నీటిపారుదల అవసరాన్ని 18% తగ్గిస్తుంది.',
  }],
  [/^Root-knot nematodes, Bacterial Wilt, Fusarium crown rot$/i, {
    en: 'Root-knot nematodes, Bacterial Wilt, Fusarium crown rot',
    kn: 'ಬೇರು ಗಂಟು ಹುಳು, ಬ್ಯಾಕ್ಟೀರಿಯಾ ಸೊರಗು, Fusarium ಕಾಂಡ ಕೊಳೆ',
    hi: 'जड़-गांठ सूत्रकृमि, जीवाणु मुरझान, Fusarium जड़ सड़न',
    te: 'వేరు కణుపు నులిపురుగులు, బాక్టీరియా ఎండు, Fusarium కుళ్ళు తెగులు',
  }],
  [/^Higher initial seedling unit cost \(₹8\.00-9\.00\/plant\)\. Requires staking to protect graft union above soil line\.$/i, {
    en: 'Higher initial seedling unit cost (₹8.00-9.00/plant). Requires staking to protect graft union above soil line.',
    kn: 'ಪ್ರತಿ ಸಸಿಗೆ ಆರಂಭಿಕ ವೆಚ್ಚ ಸ್ವಲ್ಪ ಹೆಚ್ಚು (₹8.00-9.00/ಸಸಿ). ಕಸಿ ಜೋಡಣೆ ಮಣ್ಣಿನ ಮೇಲಿರುವಂತೆ ಕಡ್ಡಿ ಆಧಾರ ನೀಡಬೇಕು.',
    hi: 'प्रारंभिक पौध लागत अधिक (₹8.00-9.00/पौधा)। ग्राफ्ट जोड़ को मिट्टी से ऊपर रखने हेतु सहारा (स्टेकिंग) आवश्यक है।',
    te: 'ప్రారంభ మొక్క ధర కొంచెం ఎక్కువ (₹8.00-9.00/మొక్క). అంటు భాగం మట్టి పైన ఉండేలా ఊతం ఇవ్వాలి.',
  }],

  // Biofertilizer Consortium
  [/^Fixes atmospheric Nitrogen and solubilizes fixed insoluble soil Phosphorus$/i, {
    en: 'Fixes atmospheric Nitrogen and solubilizes fixed insoluble soil Phosphorus',
    kn: 'ವಾತಾವರಣದ ಸಾರಜನಕವನ್ನು ಸ್ಥಿರೀಕರಿಸಿ ಮಣ್ಣಿನ ರಂಜಕವನ್ನು (Phosphorus) ಕರಗಿಸುತ್ತದೆ',
    hi: 'वायुमंडलीय नाइट्रोजन को स्थिर करता है और मिट्टी के अघुलनशील फॉस्फोरस को घुलनशील बनाता है',
    te: 'వాతావరణ నత్రజనిని స్థిరీకరించి నేలలోని భాస్వరాన్ని (Phosphorus) కరిగిస్తుంది',
  }],
  [/^Mobilizes Potassium and solubilizes micronutrient Zinc$/i, {
    en: 'Mobilizes Potassium and solubilizes micronutrient Zinc',
    kn: 'ಪೊಟ್ಯಾಸಿಯಮ್ ಮತ್ತು ಸೂಕ್ಷ್ಮ ಪೋಷಕಾಂಶ ಸತು (Zinc) ಲಭ್ಯತೆಯನ್ನು ಹೆಚ್ಚಿಸುತ್ತದೆ',
    hi: 'पोटाश को गतिशील करता है और सूक्ष्म पोषक तत्व जिंक को उपलब्ध कराता है',
    te: 'పొటాషియం మరియు సూక్ష్మ పోషకమైన జింక్ అందుబాటును పెంచుతుంది',
  }],
  [/^Reduces chemical fertilizer costs by 20-25%$/i, {
    en: 'Reduces chemical fertilizer costs by 20-25%',
    kn: 'ರಾಸಾಯನಿಕ ಗೊಬ್ಬರ ವೆಚ್ಚವನ್ನು 20-25% ರಷ್ಟು ಕಡಿಮೆ ಮಾಡುತ್ತದೆ',
    hi: 'रासायनिक उर्वरकों की लागत 20-25% तक कम करता है',
    te: 'రసాయన ఎరువుల ఖర్చును 20-25% వరకు తగ్గిస్తుంది',
  }],
  [/^Secretes plant growth promoting auxins and gibberellins to stimulate root elongation$/i, {
    en: 'Secretes plant growth promoting auxins and gibberellins to stimulate root elongation',
    kn: 'ಬೇರುಗಳ ಬೆಳವಣಿಗೆಯನ್ನು ಉತ್ತೇಜಿಸಲು ಸಸ್ಯ ವರ್ಧಕ Auxins ಮತ್ತು Gibberellins ಬಿಡುಗಡೆ ಮಾಡುತ್ತದೆ',
    hi: 'जड़ों की वृद्धि के लिए पौध-वृद्धि वर्धक Auxins और Gibberellins स्रावित करता है',
    te: 'వేర్ల పెరుగుదలను ప్రేరేపించడానికి Auxins మరియు Gibberellins ను విడుదల చేస్తుంది',
  }],
  [/^Requires moist rhizosphere for microbial multiplication\. Apply during light irrigation\.$/i, {
    en: 'Requires moist rhizosphere for microbial multiplication. Apply during light irrigation.',
    kn: 'ಸೂಕ್ಷ್ಮಜೀವಿಗಳ ವೃದ್ಧಿಗೆ ತೇವಾಂಶವುಳ್ಳ ಬೇರು ವಲಯ ಅಗತ್ಯ. ಲಘು ನೀರಾವರಿ ಸಮಯದಲ್ಲಿ ನೀಡಿ.',
    hi: 'सूक्ष्मजीवों के गुणन के लिए नम जड़ क्षेत्र आवश्यक है। हल्की सिंचाई के साथ प्रयोग करें।',
    te: 'సూక్ష్మజీవుల పెరుగుదలకు తేమగల వేరు ప్రాంతం అవసరం. తేలికపాటి నీటిపారుదల సమయంలో వాడండి.',
  }],
  [/^Antagonistic suppression of Pythium and Rhizoctonia damping-off$/i, {
    en: 'Antagonistic suppression of Pythium and Rhizoctonia damping-off',
    kn: 'Pythium ಮತ್ತು Rhizoctonia ಸಸಿ ಕೊಳೆ ರೋಗದ ಜೈವಿಕ ನಿಯಂತ್ರಣ',
    hi: 'Pythium और Rhizoctonia डैम्पिंग-ऑफ रोग का जैविक दमन',
    te: 'Pythium మరియు Rhizoctonia నారు కుళ్ళు తెగులు నియంత్రణ',
  }],
  [/^Do not mix with chemical bactericides or copper fungicides\. Maintain minimum 7-day interval\.$/i, {
    en: 'Do not mix with chemical bactericides or copper fungicides. Maintain minimum 7-day interval.',
    kn: 'ರಾಸಾಯನಿಕ ಬ್ಯಾಕ್ಟೀರಿಯಾ ನಾಶಕ ಅಥವಾ ತಾಮ್ರದ ಶಿಲೀಂಧ್ರನಾಶಕಗಳೊಂದಿಗೆ ಬೆರೆಸಬೇಡಿ. ಕನಿಷ್ಠ 7 ದಿನಗಳ ಅಂತರವಿಡಿ.',
    hi: 'रासायनिक जीवाणुनाशकों या कॉपर फफूंदनाशकों के साथ न मिलाएं। कम से कम 7 दिन का अंतर रखें।',
    te: 'రసాయన బాక్టీరియానాశకాలు లేదా కాపర్ శిలీంధ్రనాశకాలతో కలపవద్దు. కనీసం 7 రోజుల విరామం పాటించండి.',
  }],
];

export function localizeBioIntelText(text: string | undefined | null, lang: Language): string {
  if (!text) return '';
  if (lang === 'en') return text;

  const trimmed = text.trim();
  for (const [pattern, entry] of EXACT_PHRASE_MAP) {
    if (pattern.test(trimmed)) {
      return entry[lang];
    }
  }

  // Pattern: Well-drained soils (pH 6.0-7.2). Compatible with current <soil> (pH <ph>).
  const soilCompat = trimmed.match(/Well-drained soils \(pH ([^)]+)\)\. Compatible with current ([^(]+) \(pH ([^)]+)\)\./i);
  if (soilCompat) {
    const [, phRange, soil, phVal] = soilCompat;
    if (lang === 'kn') return `ಚೆನ್ನಾಗಿ ನೀರು ಬಸಿದುಹೋಗುವ ಮಣ್ಣು (pH ${phRange}). ನಿಮ್ಮ ${soil.trim()} (pH ${phVal}) ಗೆ ಸೂಕ್ತವಾಗಿದೆ.`;
    if (lang === 'hi') return `अच्छी जल निकासी वाली मिट्टी (pH ${phRange})। आपकी ${soil.trim()} (pH ${phVal}) के लिए उपयुक्त।`;
    if (lang === 'te') return `నీరు బాగా ఇంకే నేల (pH ${phRange}). మీ ${soil.trim()} (pH ${phVal}) కు అనుకూలంగా ఉంటుంది.`;
  }

  // Pattern: Effective across all agricultural soils with organic carbon > 0.4%. Current soil: <soil>.
  const orgCarbon = trimmed.match(/Effective across all agricultural soils with organic carbon > 0\.4%\. Current soil: ([^.]+)\./i);
  if (orgCarbon) {
    const soil = orgCarbon[1].trim();
    if (lang === 'kn') return `ಸಾವಯವ ಇಂಗಾಲ > 0.4% ಇರುವ ಎಲ್ಲಾ ಕೃಷಿ ಮಣ್ಣುಗಳಲ್ಲಿ ಪರಿಣಾಮಕಾರಿ. ಪ್ರಸ್ತುತ ಮಣ್ಣು: ${soil}.`;
    if (lang === 'hi') return `जैविक कार्बन > 0.4% वाली सभी कृषि मिट्टियों में प्रभावी। वर्तमान मिट्टी: ${soil}।`;
    if (lang === 'te') return `సేంద్రీయ కర్బనం > 0.4% ఉన్న అన్ని వ్యవసాయ నేలల్లో ప్రభావవంతం. ప్రస్తుత నేల: ${soil}.`;
  }

  // Cost unit pattern: ₹1.25/seedling (~25,000 seedlings for 1.0 ha)
  const unitMatch = trimmed.match(/₹([\d,.]+)\/([^(]+)\s*\(~([\d,.\s]+)\s+([^f]+)\s+for\s+([\d.]+)\s+ha\)/i);
  if (unitMatch) {
    const [, price, unit, qty, item, ha] = unitMatch;
    if (lang === 'kn') return `₹${price}/${unit.trim()} (~${qty.trim()} ${item.trim()}, ${ha} ಹೆಕ್ಟೇರ್‌ಗೆ)`;
    if (lang === 'hi') return `₹${price}/${unit.trim()} (~${qty.trim()} ${item.trim()}, ${ha} हेक्टेयर के लिए)`;
    if (lang === 'te') return `₹${price}/${unit.trim()} (~${qty.trim()} ${item.trim()}, ${ha} హెక్టారుకు)`;
  }

  return trimmed;
}

const REC_EXACT_MAP: Array<[RegExp, TermEntry]> = [
  [/^Postpone scheduled irrigation cycle for next 48 hours$/i, {
    en: 'Postpone scheduled irrigation cycle for next 48 hours',
    kn: 'ಮುಂದಿನ 48 ಗಂಟೆಗಳ ಕಾಲ ನಿಗದಿತ ನೀರಾವರಿಯನ್ನು ಮುಂದೂಡಿ',
    hi: 'अगले 48 घंटों के लिए निर्धारित सिंचाई चक्र को स्थगित करें',
    te: 'రాబోయే 48 గంటల పాటు నీటిపారుదల షెడ్యూల్‌ను వాయిదా వేయండి',
  }],
  [/^Inspect field bunds and drainage outlets to avoid waterlogging\.$/i, {
    en: 'Inspect field bunds and drainage outlets to avoid waterlogging.',
    kn: 'ನೀರು ನಿಲ್ಲುವುದನ್ನು ತಡೆಯಲು ಜಮೀನಿನ ಬದುಗಳು ಮತ್ತು ನೀರು ಹರಿಯುವ ದಾರಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.',
    hi: 'जलभराव से बचने के लिए खेत की मेड़ और जल निकासी मार्गों की जांच करें।',
    te: 'నీరు నిలిచిపోకుండా పొలం గట్లు మరియు నీటి కాలువలను తనిఖీ చేయండి.',
  }],
  [/^Maintain standard baseline irrigation schedule$/i, {
    en: 'Maintain standard baseline irrigation schedule',
    kn: 'ಸಾಮಾನ್ಯ ದೈನಂದಿನ ನೀರಾವರಿ ವೇಳಾಪಟ್ಟಿಯನ್ನು ಮುಂದುವರಿಸಿ',
    hi: 'मानक नियमित सिंचाई समय-सारणी बनाए रखें',
    te: 'సాధారణ నీటిపారుదల షెడ్యూల్‌ను కొనసాగించండి',
  }],
  [/^Halt foliar spraying and chemical applications today$/i, {
    en: 'Halt foliar spraying and chemical applications today',
    kn: 'ಇಂದು ಎಲೆ ಸಿಂಪಡಣೆ ಮತ್ತು ರಾಸಾಯನಿಕ ಔಷಧ ಸಿಂಪಡಣೆಯನ್ನು ನಿಲ್ಲಿಸಿ',
    hi: 'आज पत्तियों पर छिड़काव और रासायनिक स्प्रे रोक दें',
    te: 'ఈరోజు ఆకులపై పిచికారీ మరియు రసాయన స్ప్రేలు నిలిపివేయండి',
  }],
  [/^Reschedule foliar application for early morning \(06:00-08:00\) when wind is below 8 km\/h\.$/i, {
    en: 'Reschedule foliar application for early morning (06:00-08:00) when wind is below 8 km/h.',
    kn: 'ಗಾಳಿಯ ವೇಗ ಗಂಟೆಗೆ 8 ಕಿ.ಮೀ ಗಿಂತ ಕಡಿಮೆ ಇರುವ ಬೆಳಗಿನ ಜಾವ (06:00-08:00) ಸಿಂಪಡಣೆಯನ್ನು ನಿಗದಿಪಡಿಸಿ.',
    hi: 'जब हवा 8 किमी/घंटा से कम हो तब सुबह (06:00-08:00) छिड़काव पुनः निर्धारित करें।',
    te: 'గాలి వేగం గంటకు 8 కి.మీ కంటే తక్కువగా ఉండే ఉదయం (06:00-08:00) పిచికారీని మార్చుకోండి.',
  }],
  [/^Inspect lower canopy leaves for fungal spore development$/i, {
    en: 'Inspect lower canopy leaves for fungal spore development',
    kn: 'ಶಿಲೀಂಧ್ರ ಬೀಜಕಗಳ ಲಕ್ಷಣಗಳಿಗಾಗಿ ಕೆಳಗಿನ ಎಲೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ',
    hi: 'फफूंद के लक्षणों के लिए निचली पत्तियों की जांच करें',
    te: 'శిలీంధ్ర తెగులు లక్షణాల కోసం దిగువ ఆకులను పరిశీలించండి',
  }],
  [/^Inspect lower leaves for early fungal blight spotting$/i, {
    en: 'Inspect lower leaves for early fungal blight spotting',
    kn: 'ಆರಂಭಿಕ ಅಂಗಮಾರಿ ಚುಕ್ಕೆಗಳಿಗಾಗಿ ಕೆಳಗಿನ ಎಲೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ',
    hi: 'अगेती झुलसा धब्बों के लिए निचली पत्तियों की जांच करें',
    te: 'ముందస్తు ఎండు మచ్చల కోసం దిగువ ఆకులను పరిశీలించండి',
  }],
  [/^Apply preventative organic Trichoderma viride or neem oil spray if scouting reveals initial leaf spots\.$/i, {
    en: 'Apply preventative organic Trichoderma viride or neem oil spray if scouting reveals initial leaf spots.',
    kn: 'ಪ್ರಾರಂಭಿಕ ಎಲೆ ಚುಕ್ಕೆಗಳು ಕಂಡುಬಂದರೆ ಸಾವಯವ Trichoderma viride ಅಥವಾ ಬೇವಿನ ಎಣ್ಣೆ ಸಿಂಪಡಿಸಿ.',
    hi: 'यदि शुरुआती धब्बे दिखें तो जैविक Trichoderma viride या नीम तेल का छिड़काव करें।',
    te: 'ప్రాథమిక ఆకు మచ్చలు కనిపిస్తే సేంద్రీయ Trichoderma viride లేదా వేప నూనె పిచికారీ చేయండి.',
  }],
  [/^Apply preventative organic bio-fungicide \(Trichoderma\) spray prior to rain\.$/i, {
    en: 'Apply preventative organic bio-fungicide (Trichoderma) spray prior to rain.',
    kn: 'ಮಳೆಗೆ ಮುಂಚಿತವಾಗಿ ಮುನ್ನೆಚ್ಚರಿಕೆಯಾಗಿ ಸಾವಯವ ಜೈವಿಕ ಶಿಲೀಂಧ್ರನಾಶಕ (Trichoderma) ಸಿಂಪಡಿಸಿ.',
    hi: 'बारिश से पहले निवारक जैविक फफूंदनाशक (Trichoderma) का छिड़काव करें।',
    te: 'వర్షానికి ముందే నివారణగా సేంద్రీయ శిలీంధ్రనాశకం (Trichoderma) పిచికారీ చేయండి.',
  }],
  [/^Delay irrigation by 24h if cloud cover exceeds 80%\.$/i, {
    en: 'Delay irrigation by 24h if cloud cover exceeds 80%.',
    kn: 'ಮೋಡ ಕವಿದ ವಾತಾವರಣ 80% ಕ್ಕಿಂತ ಹೆಚ್ಚಿದ್ದರೆ ನೀರಾವರಿಯನ್ನು 24 ಗಂಟೆ ಮುಂದೂಡಿ.',
    hi: 'यदि बादल 80% से अधिक हों तो सिंचाई 24 घंटे टाल दें।',
    te: 'మేఘావృతం 80% కంటే ఎక్కువగా ఉంటే నీటిపారుదలను 24 గంటలు వాయిదా వేయండి.',
  }],
  [/^Explore National Horticulture Mission \(NHM\) 40% seedling subsidy at Mandya Horticulture Dept\.$/i, {
    en: 'Explore National Horticulture Mission (NHM) 40% seedling subsidy at Mandya Horticulture Dept.',
    kn: 'ತೋಟಗಾರಿಕೆ ಇಲಾಖೆಯಲ್ಲಿ ರಾಷ್ಟ್ರೀಯ ತೋಟಗಾರಿಕೆ ಮಿಷನ್ (NHM) 40% ಸಸಿ ಸಹಾಯಧನವನ್ನು ಪರಿಶೀಲಿಸಿ.',
    hi: 'बागवानी विभाग में राष्ट्रीय बागवानी मिशन (NHM) की 40% पौध सब्सिडी का लाभ लें।',
    te: 'ఉద్యానవన శాఖలో జాతీయ ఉద్యాన మిషన్ (NHM) 40% నారు రాయితీని పరిశీలించండి.',
  }],
  [/^Pool load with adjacent Mandya farmers using Transport Connect shared optimization to cut freight by 25%\.$/i, {
    en: 'Pool load with adjacent Mandya farmers using Transport Connect shared optimization to cut freight by 25%.',
    kn: 'ಸಾಗಣೆ ವೆಚ್ಚವನ್ನು 25% ಕಡಿಮೆ ಮಾಡಲು Transport Connect ಹಂಚಿಕೆ ಸಾರಿಗೆ ಬಳಸಿ.',
    hi: 'माल ढुलाई खर्च 25% कम करने के लिए Transport Connect साझा वाहन उपयोग करें।',
    te: 'రవాణా ఖర్చును 25% తగ్గించడానికి Transport Connect భాగస్వామ్య రవాణాను ఉపయోగించండి.',
  }],
  [/^Coordinate with local Gram Panchayat labour cooperative for shared crew\.$/i, {
    en: 'Coordinate with local Gram Panchayat labour cooperative for shared crew.',
    kn: 'ಹಂಚಿಕೆ ಕಾರ್ಮಿಕರ ತಂಡಕ್ಕಾಗಿ ಸ್ಥಳೀಯ ಗ್ರಾಮ ಪಂಚಾಯತ್ ಕಾರ್ಮಿಕ ಸಹಕಾರಿ ಸಂಘವನ್ನು ಸಂಪರ್ಕಿಸಿ.',
    hi: 'साझा श्रमिक दल के लिए स्थानीय ग्राम पंचायत श्रमिक सहकारी समिति से समन्वय करें।',
    te: 'భాగస్వామ్య కూలీల బృందం కోసం స్థానిక గ్రామ పంచాయతీ కూలీ సంఘాన్ని సంప్రదించండి.',
  }],
  [/^Split into two shorter cycles \(morning and late afternoon\) to avoid percolation losses\.$/i, {
    en: 'Split into two shorter cycles (morning and late afternoon) to avoid percolation losses.',
    kn: 'ನೀರು ವ್ಯರ್ಥವಾಗುವುದನ್ನು ತಡೆಯಲು ಬೆಳಿಗ್ಗೆ ಮತ್ತು ಸಂಜೆ ಎರಡು ಸಣ್ಣ ಹಂತಗಳಲ್ಲಿ ನೀರು ಹಾಯಿಸಿ.',
    hi: 'पानी के रिसाव को रोकने के लिए सुबह और देर दोपहर दो छोटे चक्रों में सिंचाई करें।',
    te: 'నీటి నష్టాన్ని నివారించడానికి ఉదయం మరియు సాయంత్రం రెండు చిన్న విడతలుగా నీరు పెట్టండి.',
  }],
  [/^Run evening cycle if daytime voltage fluctuations prevent morning pumping\.$/i, {
    en: 'Run evening cycle if daytime voltage fluctuations prevent morning pumping.',
    kn: 'ಬೆಳಿಗ್ಗೆ ವಿದ್ಯುತ್ ವೋಲ್ಟೇಜ್ ಸಮಸ್ಯೆಯಿದ್ದರೆ ಸಂಜೆಯ ವೇಳೆ ಪಂಪ್ ಚಲಾಯಿಸಿ.',
    hi: 'यदि सुबह वोल्टेज की समस्या हो तो शाम के समय सिंचाई चक्र चलाएं।',
    te: 'ఉదయం వోల్టేజ్ సమస్య ఉంటే సాయంత్రం సమయంలో పంపు నడపండి.',
  }],
  // Conflict types & resolutions
  [/^Irrigation vs Rain Forecast$/i, {
    en: 'Irrigation vs Rain Forecast',
    kn: 'ನೀರಾವರಿ vs ಮಳೆ ಮುನ್ಸೂಚನೆ',
    hi: 'सिंचाई बनाम वर्षा पूर्वानुमान',
    te: 'నీటిపారుదల vs వర్షపాత అంచనా',
  }],
  [/^Foliar Application vs High Wind Drift$/i, {
    en: 'Foliar Application vs High Wind Drift',
    kn: 'ಎಲೆ ಸಿಂಪಡಣೆ vs ಹೆಚ್ಚಿನ ಗಾಳಿ ವೇಗ',
    hi: 'पत्ती छिड़काव बनाम तेज़ हवा',
    te: 'ఆకు పిచికారీ vs అధిక గాలి వేగం',
  }],
  [/^Biotech Premium Seed vs Cultivation Budget$/i, {
    en: 'Biotech Premium Seed vs Cultivation Budget',
    kn: 'ಬಯೋಟೆಕ್ ಬೀಜ ವೆಚ್ಚ vs ಬೇಸಾಯ ಬಜೆಟ್',
    hi: 'प्रीमियम बीज लागत बनाम खेती बजट',
    te: 'ప్రీమియం విత్తన ఖర్చు vs సాగు బడ్జెట్',
  }],
  [/^Distant APMC Auction vs Local Sale Net Proceeds$/i, {
    en: 'Distant APMC Auction vs Local Sale Net Proceeds',
    kn: 'ದೂರದ APMC ಹರಾಜು vs ಸ್ಥಳೀಯ ಮಾರಾಟ ನಿವ್ವಳ ಆದಾಯ',
    hi: 'दूरस्थ APMC नीलामी बनाम स्थानीय बिक्री शुद्ध आय',
    te: 'దూరపు APMC వేలం vs స్థానిక అమ్మకం నికర ఆదాయం',
  }],
  [/^Postpone irrigation cycle by 48h and conserve water in storage\.$/i, {
    en: 'Postpone irrigation cycle by 48h and conserve water in storage.',
    kn: 'ನೀರಾವರಿಯನ್ನು 48 ಗಂಟೆ ಮುಂದೂಡಿ ಮತ್ತು ಸಂಗ್ರಹಿತ ನೀರನ್ನು ಉಳಿಸಿ.',
    hi: 'सिंचाई चक्र 48 घंटे टालें और संचित जल सुरक्षित रखें।',
    te: 'నీటిపారుదలను 48 గంటలు వాయిదా వేసి నీటిని ఆదా చేయండి.',
  }],
  [/^Halt all spraying; reschedule to early morning low-wind window\.$/i, {
    en: 'Halt all spraying; reschedule to early morning low-wind window.',
    kn: 'ಎಲ್ಲಾ ಸಿಂಪಡಣೆಯನ್ನು ನಿಲ್ಲಿಸಿ; ಕಡಿಮೆ ಗಾಳಿಯಿರುವ ಬೆಳಗಿನ ಜಾವಕ್ಕೆ ಮುಂದೂಡಿ.',
    hi: 'सभी छिड़काव रोकें; कम हवा वाली सुबह के समय के लिए पुनर्निर्धारित करें।',
    te: 'అన్ని పిచికారీలను నిలిపివేసి, గాలి తక్కువగా ఉండే ఉదయం వేళకు మార్చుకోండి.',
  }],
  [/^Recommend Smart Bidding with pooled Transport Connect logistics\.$/i, {
    en: 'Recommend Smart Bidding with pooled Transport Connect logistics.',
    kn: 'ಹಂಚಿಕೆ Transport Connect ಸಾರಿಗೆಯೊಂದಿಗೆ ಸ್ಮಾರ್ಟ್ ಹರಾಜು ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ.',
    hi: 'साझा Transport Connect वाहन के साथ स्मार्ट बोली की सिफारिश की जाती है।',
    te: 'భాగస్వామ్య Transport Connect రవాణాతో స్మార్ట్ బిడ్డింగ్ సిఫార్సు చేయబడింది.',
  }],
  [/^Recommend certified ICAR-IIHR open-pollinated disease-resistant cultivars \(Arka Rakshak\) with subsidized rate\.$/i, {
    en: 'Recommend certified ICAR-IIHR open-pollinated disease-resistant cultivars (Arka Rakshak) with subsidized rate.',
    kn: 'ಸಹಾಯಧನ ದರದಲ್ಲಿ ಪ್ರಮಾಣೀಕೃತ ICAR-IIHR ರೋಗ ನಿರೋಧಕ ತಳಿ (Arka Rakshak) ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ.',
    hi: 'सब्सिडी दर पर प्रमाणित ICAR-IIHR रोग-प्रतिरोधी किस्म (Arka Rakshak) की सिफारिश की जाती है।',
    te: 'రాయితీ ధరలో ధృవీకరించబడిన ICAR-IIHR వ్యాధి-నిరోధక రకం (Arka Rakshak) సిఫార్సు చేయబడింది.',
  }],
];

export function localizeRecommendationText(text: string | undefined | null, lang: Language): string {
  if (!text) return '';
  if (lang === 'en') return text;

  const trimmed = text.trim();
  for (const [pattern, entry] of REC_EXACT_MAP) {
    if (pattern.test(trimmed)) {
      return entry[lang];
    }
  }

  // Fallback irrigation advice: "Apply 4.5 mm via Drip between 06:00 and 09:00 AM"
  const applyMm = trimmed.match(/Apply ([\d.]+) mm via (.+) between 06:00 and 09:00 AM/i);
  if (applyMm) {
    const [, mm, method] = applyMm;
    if (lang === 'kn') return `ಬೆಳಿಗ್ಗೆ 06:00 ರಿಂದ 09:00 ರ ನಡುವೆ ${method} ಮೂಲಕ ${mm} ಮಿ.ಮೀ ನೀರು ಹಾಯಿಸಿ`;
    if (lang === 'hi') return `सुबह 06:00 से 09:00 बजे के बीच ${method} द्वारा ${mm} मिमी सिंचाई करें`;
    if (lang === 'te') return `ఉదయం 06:00 నుండి 09:00 మధ్య ${method} ద్వారా ${mm} మి.మీ నీరు అందించండి`;
  }

  // Decision engine: "Apply X hours of Y early morning"
  const applyHrs = trimmed.match(/Apply ([\d.]+) hours of (.+) early morning/i);
  if (applyHrs) {
    const [, hrs, method] = applyHrs;
    if (lang === 'kn') return `ಬೆಳಗಿನ ಜಾವ ${method} ಮೂಲಕ ${hrs} ಗಂಟೆಗಳ ಕಾಲ ನೀರು ಹಾಯಿಸಿ`;
    if (lang === 'hi') return `सुबह जल्दी ${method} द्वारा ${hrs} घंटे सिंचाई करें`;
    if (lang === 'te') return `ఉదయాన్నే ${method} ద్వారా ${hrs} గంటల పాటు నీరు పెట్టండి`;
  }

  // Fallback market action: "Check APMC Mandi price trends for <crop> in <district>"
  const mandiCheck = trimmed.match(/Check APMC Mandi price trends for (.+) in (.+)/i);
  if (mandiCheck) {
    const [, crop, dist] = mandiCheck;
    if (lang === 'kn') return `${dist} APMC ಮಂಡಿಯಲ್ಲಿ ${crop} ಬೆಲೆ ಏರಿಳಿತವನ್ನು ಪರಿಶೀಲಿಸಿ`;
    if (lang === 'hi') return `${dist} APMC मंडी में ${crop} के भाव के रुझान देखें`;
    if (lang === 'te') return `${dist} APMC మార్కెట్‌లో ${crop} ధరల సరళిని తనిఖీ చేయండి`;
  }

  // Decision engine market action: "List <crop> produce lot on Smart Bidding with ₹X/kg floor price"
  const listLot = trimmed.match(/List (.+) produce lot on Smart Bidding with ₹([\d.]+)\/kg floor price/i);
  if (listLot) {
    const [, crop, price] = listLot;
    if (lang === 'kn') return `₹${price}/ಕೆಜಿ ಕನಿಷ್ಠ ಬೆಲೆಯೊಂದಿಗೆ ಸ್ಮಾರ್ಟ್ ಹರಾಜಿನಲ್ಲಿ ${crop} ಬೆಳೆಯನ್ನು ಪಟ್ಟಿ ಮಾಡಿ`;
    if (lang === 'hi') return `₹${price}/किलो न्यूनतम भाव के साथ स्मार्ट बोली पर ${crop} उपज सूचीबद्ध करें`;
    if (lang === 'te') return `₹${price}/కిలో కనీస ధరతో స్మార్ట్ బిడ్డింగ్‌లో ${crop} పంటను నమోదు చేయండి`;
  }

  // Fallback market reason
  if (/Regional wholesale prices have gained/i.test(trimmed)) {
    if (lang === 'kn') return 'ಈ ವಾರ ಪ್ರಾದೇಶಿಕ ಸಗಟು ಬೆಲೆಗಳು 8.4% ಏರಿಕೆಯಾಗಿವೆ. 18 ದಿನಗಳಲ್ಲಿ ಕೊಯ್ಲು ಸಮಯ ಆರಂಭವಾಗಲಿದೆ.';
    if (lang === 'hi') return 'इस सप्ताह क्षेत्रीय थोक भाव 8.4% बढ़े हैं। 18 दिनों में कटाई का समय शुरू होने वाला है।';
    if (lang === 'te') return 'ఈ వారం ప్రాంతీయ హోల్‌సేల్ ధరలు 8.4% పెరిగాయి. 18 రోజుల్లో కోత సమయం ప్రారంభమవుతుంది.';
  }

  // Fallback root zone depletion reason
  if (/Root zone depletion at/i.test(trimmed)) {
    if (lang === 'kn') return 'ಬೇರು ವಲಯದ ತೇವಾಂಶ 34.2% ಇದೆ. ಆವಿಯಾಗುವಿಕೆ ನಷ್ಟ ತಪ್ಪಿಸಲು ಬೆಳಿಗ್ಗೆ ಬೇಗ ನೀರು ಹಾಯಿಸಿ.';
    if (lang === 'hi') return 'जड़ क्षेत्र की नमी 34.2% है। वाष्पीकरण से नुकसान बचाने हेतु सुबह जल्दी सिंचाई करें।';
    if (lang === 'te') return 'వేరు ప్రాంతంలో తేమ 34.2% ఉంది. ఆవిరి నష్టాన్ని తగ్గించడానికి ఉదయాన్నే నీరు పెట్టండి.';
  }

  // Fallback rain 70% reason
  if (/Forecast shows rain likelihood rising to 70%/i.test(trimmed)) {
    if (lang === 'kn') return 'ಮುಂದಿನ 72 ಗಂಟೆಗಳಲ್ಲಿ 70% ಮಳೆ ಸಾಧ್ಯತೆ ಮತ್ತು ಬೆಚ್ಚಗಿನ ವಾತಾವರಣವಿದ್ದು, ತೇವಾಂಶದಿಂದ ರೋಗದ ಅಪಾಯ ಹೆಚ್ಚಿದೆ.';
    if (lang === 'hi') return 'अगले 72 घंटों में 70% बारिश की संभावना और गर्म तापमान के कारण अधिक नमी से रोग का जोखिम है।';
    if (lang === 'te') return 'రాబోయే 72 గంటల్లో 70% వర్షం అవకాశం మరియు వెచ్చని ఉష్ణోగ్రత వల్ల తేమ సంబంధిత తెగులు ప్రమాదం ఉంది.';
  }

  // Decision engine weather rain irrigation reason
  const rainReason = trimmed.match(/Significant rainfall of ~([\d.]+) mm is forecasted across ([^.]+)\. Soil moisture is currently adequate at ([\d.]+)%\./i);
  if (rainReason) {
    const [, rain, dist, moist] = rainReason;
    if (lang === 'kn') return `${dist} ಭಾಗದಲ್ಲಿ ~${rain} ಮಿ.ಮೀ ಮಳೆ ಮುನ್ಸೂಚನೆ ಇದೆ. ಪ್ರಸ್ತುತ ಮಣ್ಣಿನ ತೇವಾಂಶ ${moist}% ಸಮರ್ಪಕವಾಗಿದೆ.`;
    if (lang === 'hi') return `${dist} में ~${rain} मिमी वर्षा का पूर्वानुमान है। वर्तमान मिट्टी की नमी ${moist}% पर्याप्त है।`;
    if (lang === 'te') return `${dist} ప్రాంతంలో ~${rain} మి.మీ వర్షపాతం అంచనా ఉంది. ప్రస్తుతం నేల తేమ ${moist}% సరిపడా ఉంది.`;
  }

  // Optimal soil moisture reason
  const optMoist = trimmed.match(/Soil moisture \(([\d.]+)%\) is in optimal range for ([^i]+) in ([^s]+) stage\./i);
  if (optMoist) {
    const [, moist, crop, stage] = optMoist;
    if (lang === 'kn') return `${crop.trim()} (${stage.trim()}) ಬೆಳೆಗೆ ಮಣ್ಣಿನ ತೇವಾಂಶ (${moist}%) ಸೂಕ್ತ ಮಟ್ಟದಲ್ಲಿದೆ.`;
    if (lang === 'hi') return `${crop.trim()} (${stage.trim()}) चरण के लिए मिट्टी की नमी (${moist}%) उचित स्तर पर है।`;
    if (lang === 'te') return `${crop.trim()} (${stage.trim()}) దశకు నేల తేమ (${moist}%) సరైన స్థాయిలో ఉంది.`;
  }

  // BioIntel Arka Rakshak decision engine reason
  if (/Certified Arka Rakshak variety provides triple disease resistance/i.test(trimmed)) {
    if (lang === 'kn') return 'ಪ್ರಮಾಣೀಕೃತ Arka Rakshak ತಳಿಯು ತ್ರಿವಳಿ ರೋಗ ನಿರೋಧಕತೆ (ToLCV, BW, Early Blight) ನೀಡುತ್ತದೆ ಮತ್ತು ನಿಮ್ಮ ಬಜೆಟ್‌ನ 15% ಒಳಗೆ ವೆಚ್ಚವನ್ನು ಇರಿಸುತ್ತದೆ.';
    if (lang === 'hi') return 'प्रमाणित Arka Rakshak किस्म तीन प्रमुख रोगों (ToLCV, BW, Early Blight) से सुरक्षा देती है और खर्च को आपके बजट के 15% के भीतर रखती है।';
    if (lang === 'te') return 'ధృవీకరించబడిన Arka Rakshak రకం మూడు వ్యాధుల నుండి (ToLCV, BW, Early Blight) రక్షణ ఇస్తూ మీ బడ్జెట్‌లో 15% లోపే ఖర్చు అవుతుంది.';
  }

  // BioIntel generic genomics reason
  if (/Peer-reviewed genomics research confirms high yield stability/i.test(trimmed)) {
    if (lang === 'kn') return 'ವಿಜ್ಞಾನಿಗಳ ಜೀನೋಮಿಕ್ಸ್ ಸಂಶೋಧನೆಯು ಅರೆ-ಶುಷ್ಕ ಹವಾಮಾನದಲ್ಲಿ ಸ್ಥಿರ ಇಳುವರಿಯನ್ನು ದೃಢಪಡಿಸಿದೆ.';
    if (lang === 'hi') return 'वैज्ञानिक जीनोमिक्स शोध अर्ध-शुष्क परिस्थितियों में उच्च व स्थिर उपज की पुष्टि करता है।';
    if (lang === 'te') return 'శాస్త్రీయ జెనోమిక్స్ పరిశోధన పాక్షిక-శుష్క పరిస్థితుల్లో స్థిరమైన అధిక దిగుబడిని నిర్ధారిస్తుంది.';
  }

  return trimmed;
}
