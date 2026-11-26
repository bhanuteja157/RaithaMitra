// frontend/src/lib/i18n/dynamicTerms.ts
import { Language } from '@/types';
import { getIntlLocale } from './types';

type TermEntry = Record<Language, string>;

export const CROP_NAMES: Record<string, TermEntry> = {
  tomato: { en: 'Tomato', kn: 'ಟೊಮೆಟೊ', hi: 'टमाटर', te: 'టొమాటో' },
  maize: { en: 'Maize', kn: 'ಮೆಕ್ಕೆಜೋಳ', hi: 'मक्का', te: 'మొక్కజొన్న' },
  'corn (maize)': { en: 'Corn (Maize)', kn: 'ಮೆಕ್ಕೆಜೋಳ', hi: 'मक्का', te: 'మొక్కజొన్న' },
  paddy: { en: 'Paddy', kn: 'ಭತ್ತ', hi: 'धान', te: 'వరి' },
  rice: { en: 'Rice', kn: 'ಭತ್ತ / ಅಕ್ಕಿ', hi: 'धान / चावल', te: 'వరి' },
  wheat: { en: 'Wheat', kn: 'ಗೋಧಿ', hi: 'गेहूं', te: 'గోధుమ' },
  ragi: { en: 'Ragi (Finger Millet)', kn: 'ರಾಗಿ', hi: 'रागी', te: 'రాగి' },
  groundnut: { en: 'Groundnut', kn: 'ಕಡಲೆಕಾಯಿ', hi: 'मूंगफली', te: 'వేరుశెనగ' },
  chilli: { en: 'Chilli', kn: 'ಮೆಣಸಿನಕಾಯಿ', hi: 'मिर्च', te: 'మిర్చి' },
  'bell pepper': { en: 'Bell Pepper (Capsicum)', kn: 'ದೊಣ್ಣಮೆಣಸಿನಕಾಯಿ', hi: 'शिमला मिर्च', te: 'క్యాప్సికం' },
  cotton: { en: 'Cotton', kn: 'ಹತ್ತಿ', hi: 'कपास', te: 'పత్తి' },
  sugarcane: { en: 'Sugarcane', kn: 'ಕಬ್ಬು', hi: 'गन्ना', te: 'చెరకు' },
  sunflower: { en: 'Sunflower', kn: 'ಸೂರ್ಯಕಾಂತಿ', hi: 'सूरजमुखी', te: 'పొద్దుతిరుగుడు' },
  potato: { en: 'Potato', kn: 'ಆಲೂಗಡ್ಡೆ', hi: 'आलू', te: 'బంగాళాదుంప' },
  onion: { en: 'Onion', kn: 'ಈರುಳ್ಳಿ', hi: 'प्याज', te: 'ఉల్లిపాయ' },
  banana: { en: 'Banana', kn: 'ಬಾಳೆಹಣ್ಣು', hi: 'केला', te: 'అరటి' },
  brinjal: { en: 'Brinjal', kn: 'ಬದನೆಕಾಯಿ', hi: 'बैंगन', te: 'వంకాయ' },
  turmeric: { en: 'Turmeric', kn: 'ಅರಿಶಿನ', hi: 'हल्दी', te: 'పసుపు' },
  apple: { en: 'Apple', kn: 'ಸೇಬು', hi: 'सेब', te: 'ఆపిల్' },
  grape: { en: 'Grape', kn: 'ದ್ರಾಕ್ಷಿ', hi: 'अंगूर', te: 'ద్రాక్ష' },
  soybean: { en: 'Soybean', kn: 'ಸೋಯಾಬೀನ್', hi: 'सोयाबीन', te: 'సోయాబీన్' },
  strawberry: { en: 'Strawberry', kn: 'ಸ್ಟ್ರಾಬೆರಿ', hi: 'स्ट्रॉबेरी', te: 'స్ట్రాబెర్రీ' },
  squash: { en: 'Squash', kn: 'ಕುಂಬಳಕಾಯಿ', hi: 'कद्दू', te: 'గుమ్మడికాయ' },
  peach: { en: 'Peach', kn: 'ಪೀಚ್ ಹಣ್ಣು', hi: 'आड़ू', te: 'పీచ్' },
  cherry: { en: 'Cherry', kn: 'ಚೆರ್ರಿ', hi: 'चेरी', te: 'చెర్రీ' },
  orange: { en: 'Orange', kn: 'ಕಿತ್ತಳೆ', hi: 'संतरा', te: 'నారింజ' },
  blueberry: { en: 'Blueberry', kn: 'ಬ್ಲೂಬೆರಿ', hi: 'ब्लूबेरी', te: 'బ్లూబెర్రీ' },
  raspberry: { en: 'Raspberry', kn: 'ರಾಸ್ಪ್ಬೆರಿ', hi: 'रास्पबेरी', te: 'రాస్ప్బెర్రీ' },
};

export const GROWTH_STAGE_NAMES: Record<string, TermEntry> = {
  'empty agricultural land': { en: 'Empty Agricultural Land', kn: 'ಖಾಲಿ ಕೃಷಿ ಭೂಮಿ', hi: 'खाली कृषि भूमि', te: 'ఖాళీ వ్యవసాయ భూమి' },
  'soil preparation': { en: 'Soil Preparation', kn: 'ಭೂಮಿ ಸಿದ್ಧತೆ', hi: 'मिट्टी की तैयारी', te: 'నేల తయారీ' },
  sowing: { en: 'Sowing', kn: 'ಬಿತ್ತನೆ', hi: 'बुवाई', te: 'విత్తడం' },
  'seed sowing': { en: 'Seed Sowing', kn: 'ಬೀಜ ಬಿತ್ತನೆ', hi: 'बीज बुवाई', te: 'విత్తనాల విత్తడం' },
  'seed imbibition': { en: 'Seed Imbibition', kn: 'ಬೀಜ ತೇವಾಂಶ ಹೀರಿಕೊಳ್ಳುವಿಕೆ', hi: 'बीज द्वारा नमी सोखना', te: 'విత్తనం తేమను పీల్చుకోవడం' },
  'radicle emergence': { en: 'Radicle Emergence', kn: 'ಪ್ರಾಥಮಿಕ ಬೇರು ಮೊಳಕೆ', hi: 'प्राथमिक जड़ का निकलना', te: 'ప్రాథమిక వేరు రావడం' },
  'coleoptile emergence': { en: 'Coleoptile Emergence', kn: 'ಮೊಳಕೆ ಚಿಗುರು ಮೇಲ್ಬರುವಿಕೆ', hi: 'अंकुर का मिट्टी से बाहर आना', te: 'మొలక నేల పైకి రావడం' },
  'seedling establishment': { en: 'Seedling Establishment', kn: 'ಸಸಿ ಸ್ಥಾಪನೆ', hi: 'पौधे की स्थापना', te: 'నారు నిలదొక్కుకోవడం' },
  'early vegetative development': { en: 'Early Vegetative Development', kn: 'ಪ್ರಾರಂಭಿಕ ಸಸ್ಯ ಬೆಳವಣಿಗೆ', hi: 'प्रारंभिक वानस्पतिक विकास', te: 'ప్రారంభ శాఖీయ పెరుగుదల' },
  'progressive leaf formation': { en: 'Progressive Leaf Formation', kn: 'ಹಂತ ಹಂತವಾಗಿ ಎಲೆ ಬೆಳವಣಿಗೆ', hi: 'क्रमिक पत्ती विकास', te: 'క్రమంగా ఆకుల పెరుగుదల' },
  'stem elongation': { en: 'Stem Elongation', kn: 'ಕಾಂಡ ಉದ್ದವಾಗುವಿಕೆ', hi: 'तना बढ़ना', te: 'కాండం పెరుగుదల' },
  'tassel emergence': { en: 'Tassel Emergence (VT)', kn: 'ಗಂಡು ಹೂವು / ಗೊಂಚಲು ಮೂಡುವಿಕೆ', hi: 'नर मंजरी निकलना (VT)', te: 'తెనె పువ్వు రావడం (VT)' },
  'silk emergence': { en: 'Silk Emergence (R1)', kn: 'ರೇಷ್ಮೆ ಎಳೆ ಮೂಡುವಿಕೆ (R1)', hi: 'रेशम निकलना (R1)', te: 'సిల్క్ / జుట్టు రావడం (R1)' },
  'pollination period': { en: 'Pollination Period', kn: 'ಪರಾಗಸ್ಪರ್ಶ ಹಂತ', hi: 'परागण अवधि', te: 'పరాగసంపర్క దశ' },
  'ear development': { en: 'Ear Development', kn: 'ತೆನೆ ಬೆಳವಣಿಗೆ', hi: 'भुट्टा विकास', te: 'కంకి పెరుగుదల' },
  'kernel filling': { en: 'Kernel Filling', kn: 'ಕಾಳು ತುಂಬುವಿಕೆ', hi: 'दाना भराव', te: 'గింజ నిండే దశ' },
  'physiological maturity': { en: 'Physiological Maturity', kn: 'ಬೆಳೆ ಪೂರ್ಣ ಪಕ್ವತೆ', hi: 'शारीरिक परिपक्वता', te: 'పూర్తి పక్వ దశ' },
  'grain drying & harvest': { en: 'Grain Drying & Harvest', kn: 'ಕಾಳು ಒಣಗುವಿಕೆ ಮತ್ತು ಕೊಯ್ಲು', hi: 'दाना सूखना व कटाई', te: 'గింజ ఆరడం మరియు కోత' },
  germination: { en: 'Germination', kn: 'ಮೊಳಕೆಯೊಡೆಯುವಿಕೆ', hi: 'अंकुरण', te: 'మొలకెత్తడం' },
  seedlings: { en: 'Seedlings', kn: 'ಸಸಿಗಳು', hi: 'नन्हे पौधे', te: 'మొలకలు' },
  'vegetative growth': { en: 'Vegetative Growth', kn: 'ಸಸ್ಯಕ ಬೆಳವಣಿಗೆ', hi: 'वानस्पतिक वृद्धि', te: 'శాఖీయ పెరుగుదల' },
  flowering: { en: 'Flowering', kn: 'ಹೂ ಬಿಡುವ ಹಂತ', hi: 'फूल आने की अवस्था', te: 'పూత దశ' },
  'fruit / grain formation': { en: 'Fruit / Grain Formation', kn: 'ಕಾಯಿ / ಕಾಳು ಕಟ್ಟುವ ಹಂತ', hi: 'फल / दाना बनने की अवस्था', te: 'కాయ / గింజ కట్టే దశ' },
  'crop maturity': { en: 'Crop Maturity', kn: 'ಬೆಳೆ ಪಕ್ವತೆ', hi: 'फसल की परिपक्वता', te: 'పంట పక్వత' },
  harvested: { en: 'Harvested', kn: 'ಕೊಯ್ಲು ಪೂರ್ಣಗೊಂಡಿದೆ', hi: 'कटाई पूर्ण', te: 'కోత పూర్తయింది' },
  initial: { en: 'Initial Stage', kn: 'ಪ್ರಾರಂಭಿಕ ಹಂತ', hi: 'प्रारंभिक चरण', te: 'ప్రారంభ దశ' },
  'crop development': { en: 'Crop Development', kn: 'ಬೆಳೆ ಬೆಳವಣಿಗೆ ಹಂತ', hi: 'फसल विकास चरण', te: 'పంట అభివృద్ధి దశ' },
  'mid-season': { en: 'Mid-Season', kn: 'ಮಧ್ಯಮ ಹಂತ', hi: 'मध्य-मौसम चरण', te: 'మధ్య దశ' },
  'late season': { en: 'Late Season', kn: 'ಕೊನೆಯ ಹಂತ', hi: 'अंतिम चरण', te: 'చివరి దశ' },
  'harvest ready': { en: 'Harvest Ready', kn: 'ಕೊಯ್ಲಿಗೆ ಸಿದ್ಧವಾಗಿದೆ', hi: 'कटाई के लिए तैयार', te: 'కోతకు సిద్ధంగా ఉంది' },
};

export const DISEASE_NAMES: Record<string, TermEntry> = {
  healthy: { en: 'Healthy Leaf', kn: 'ಆರೋಗ್ಯಕರ ಎಲೆ', hi: 'स्वस्थ पत्ती', te: 'ఆరోగ్యకరమైన ఆకు' },
  'healthy leaf': { en: 'Healthy Leaf', kn: 'ಆರೋಗ್ಯಕರ ಎಲೆ', hi: 'स्वस्थ पत्ती', te: 'ఆరోగ్యకరమైన ఆకు' },
  'early blight': { en: 'Early Blight', kn: 'ಆರಂಭಿಕ ಅಂಗಮಾರಿ ರೋಗ', hi: 'अगेती झुलसा रोग', te: 'ముందస్తు ఎండు తెగులు' },
  'late blight': { en: 'Late Blight', kn: 'ತಡವಾದ ಅಂಗಮಾರಿ ರೋಗ', hi: 'पछेती झुलसा रोग', te: 'ఆలస్య ఎండు తెగులు' },
  'bacterial spot': { en: 'Bacterial Spot', kn: 'ಬ್ಯಾಕ್ಟೀರಿಯಾ ಚುಕ್ಕೆ ರೋಗ', hi: 'जीवाणु धब्बा रोग', te: 'బాక్టీరియా మచ్చ తెగులు' },
  'leaf mold': { en: 'Leaf Mold', kn: 'ಎಲೆ ಬೂಷ್ಟು ರೋಗ', hi: 'पत्ती फफूंदी रोग', te: 'ఆకు బూజు తెగులు' },
  'septoria leaf spot': { en: 'Septoria Leaf Spot', kn: 'ಸೆಪ್ಟೋರಿಯಾ ಎಲೆ ಚುಕ್ಕೆ ರೋಗ', hi: 'सेप्टोरिया पत्ती धब्बा', te: 'సెప్టోరియా ఆకు మచ్చ తెగులు' },
  'spider mites or two-spotted spider mite': { en: 'Spider Mite Damage', kn: 'ಜೇಡ ನುಸಿ ಹಾನಿ', hi: 'मकड़ी घुन क्षति', te: 'నల్లి పురుగు నష్టం' },
  'spider mite damage': { en: 'Spider Mite Damage', kn: 'ಜೇಡ ನುಸಿ ಹಾನಿ', hi: 'मकड़ी घुन क्षति', te: 'నల్లి పురుగు నష్టం' },
  'target spot': { en: 'Target Spot', kn: 'ಟಾರ್ಗೆಟ್ ಚುಕ್ಕೆ ರೋಗ', hi: 'टारगेट स्पॉट रोग', te: 'టార్గెట్ మచ్చ తెగులు' },
  'yellow leaf curl virus': { en: 'Yellow Leaf Curl Virus', kn: 'ಹಳದಿ ಎಲೆ ಮುರುಟು ವೈರಸ್', hi: 'पीला पत्ता मरोड़ वायरस', te: 'పసుపు ఆకు ముడత వైరస్' },
  'mosaic virus': { en: 'Mosaic Virus', kn: 'ಮೊಸಾಯಿಕ್ ವೈರಸ್', hi: 'मोज़ेक वायरस', te: 'మొజాయిక్ వైరస్' },
  'common rust': { en: 'Common Rust', kn: 'ಸಾಮಾನ್ಯ ತುಕ್ಕು ರೋಗ', hi: 'सामान्य रतुआ रोग', te: 'సాధారణ తుప్పు తెగులు' },
  'northern leaf blight': { en: 'Northern Leaf Blight', kn: 'ಉತ್ತರ ಎಲೆ ಅಂಗಮಾರಿ', hi: 'उत्तरी पत्ती झुलसा', te: 'ఆకు ఎండు తెగులు' },
  'cercospora and gray leaf spot': { en: 'Gray Leaf Spot', kn: 'ಬೂದು ಎಲೆ ಚುಕ್ಕೆ ರೋಗ', hi: 'ग्रे लीफ स्पॉट', te: 'బూడిద ఆకు మచ్చ తెగులు' },
  scab: { en: 'Apple Scab', kn: 'ಸ್ಕ್ಯಾಬ್ ರೋಗ', hi: 'स्कैब रोग', te: 'స్కాబ్ తెగులు' },
  'isariopsis leaf spot': { en: 'Isariopsis Leaf Spot', kn: 'ಇಸರಿಯೋಪ್ಸಿಸ್ ಎಲೆ ಚುಕ್ಕೆ', hi: 'इसारियोप्सिस पत्ती धब्बा', te: 'ఆకు మచ్చ తెగులు' },
};

export const CONDITION_TERMS: Record<string, TermEntry> = {
  clear: { en: 'Clear Sky', kn: 'ಶುಭ್ರ ಆಕಾಶ', hi: 'साफ आसमान', te: 'నిర్మలమైన ఆకాశం' },
  'mainly clear': { en: 'Mainly Clear', kn: 'ಮುಖ್ಯವಾಗಿ ಶುಭ್ರ', hi: 'मुख्यतः साफ', te: 'ఎక్కువగా నిర్మలం' },
  'partly cloudy': { en: 'Partly Cloudy', kn: 'ಭಾಗಶಃ ಮೋಡ', hi: 'आंशिक बादल', te: 'పాక్షికంగా మేఘావృతం' },
  overcast: { en: 'Overcast', kn: 'ಮೋಡ ಕವಿದಿದೆ', hi: 'घने बादल', te: 'మేఘావృతం' },
  rain: { en: 'Rain', kn: 'ಮಳೆ', hi: 'बारिश', te: 'వర్షం' },
  'light rain': { en: 'Light Rain', kn: 'ಸಣ್ಣ ಮಳೆ', hi: 'हल्की बारिश', te: 'తేలికపాటి వర్షం' },
  'moderate rain': { en: 'Moderate Rain', kn: 'ಮಧ್ಯಮ ಮಳೆ', hi: 'मध्यम बारिश', te: 'మోస్తరు వర్షం' },
  'heavy rain': { en: 'Heavy Rain', kn: 'ಭಾರಿ ಮಳೆ', hi: 'भारी बारिश', te: 'భారీ వర్షం' },
  thunderstorm: { en: 'Thunderstorm', kn: 'ಗುಡುಗು ಸಹಿತ ಮಳೆ', hi: 'आंधी-तूफान', te: 'ఉరుములతో కూడిన వర్షం' },
  abundant: { en: 'Abundant Water', kn: 'ಹೆಚ್ಚು ನೀರು ಲಭ್ಯವಿದೆ', hi: 'प्रचुर पानी उपलब्ध', te: 'సమృద్ధిగా నీరు ఉంది' },
  moderate: { en: 'Moderate Water', kn: 'ಮಧ್ಯಮ ನೀರು', hi: 'मध्यम पानी', te: 'మోస్తరు నీరు' },
  scarce: { en: 'Scarce Water', kn: 'ಕಡಿಮೆ ನೀರು', hi: 'कम पानी', te: 'తక్కువ నీరు' },
  low: { en: 'Low', kn: 'ಕಡಿಮೆ', hi: 'कम', te: 'తక్కువ' },
  medium: { en: 'Medium', kn: 'ಮಧ್ಯಮ', hi: 'मध्यम', te: 'మధ్యస్థం' },
  high: { en: 'High', kn: 'ಹೆಚ್ಚು', hi: 'अधिक', te: 'ఎక్కువ' },
  critical: { en: 'Critical', kn: 'ಗಂಭೀರ', hi: 'गंभीर', te: 'తీవ్రమైన' },
  optimal: { en: 'Optimal', kn: 'ಸೂಕ್ತವಾಗಿದೆ', hi: 'उचित', te: 'సరైనది' },
  'optimal vegetative vigour': { en: 'Optimal Vegetative Vigour', kn: 'ಉತ್ತಮ ಬೆಳೆ ಬೆಳವಣಿಗೆ', hi: 'उत्तम वानस्पतिक विकास', te: 'ఉత్తమ శాఖీయ పెరుగుదల' },
  'optimal vegetative vigor': { en: 'Optimal Vegetative Vigour', kn: 'ಉತ್ತಮ ಬೆಳೆ ಬೆಳವಣಿಗೆ', hi: 'उत्तम वानस्पतिक विकास', te: 'ఉత్తమ శాఖీయ పెరుగుదల' },
  'vigorous / healthy': { en: 'Vigorous / Healthy', kn: 'ಉತ್ತಮ / ಆರೋಗ್ಯಕರ', hi: 'स्वस्थ और अच्छी वृद्धि', te: 'ఆరోగ్యకరమైన పెరుగుదల' },
  'moisture deficit': { en: 'Moisture Deficit', kn: 'ತೇವಾಂಶ ಕೊರತೆ', hi: 'नमी की कमी', te: 'తేమ లోపం' },
  observed: { en: 'OBSERVED', kn: 'ಪರಿಶೀಲಿಸಿದ ನೈಜ ದತ್ತಾಂಶ', hi: 'प्रत्यक्ष मापा गया', te: 'ప్రత్యక్ష పరిశీలన' },
  estimated: { en: 'ESTIMATED', kn: 'ಅಂದಾಜು', hi: 'अनुमानित', te: 'అంచనా' },
  predicted: { en: 'PREDICTED', kn: 'ಭವಿಷ್ಯದ ಅಂದಾಜು', hi: 'अनुमानित भविष्य', te: 'భవిష్యత్ అంచనా' },
  illustrative: { en: 'ILLUSTRATIVE', kn: 'ದೃಷ್ಟಾಂತ ಮಾದರಿ', hi: 'उदाहरण मॉडल', te: 'ఉదాహరణ నమూనా' },
  unavailable: { en: 'UNAVAILABLE', kn: 'ಲಭ್ಯವಿಲ್ಲ', hi: 'उपलब्ध नहीं', te: 'అందుబాటులో లేదు' },
  'red sandy loam': { en: 'Red Sandy Loam', kn: 'ಕೆಂಪು ಮರಳು ಮಿಶ್ರಿತ ಗೋಡು ಮಣ್ಣು', hi: 'लाल रेतीली दोमट मिट्टी', te: 'ఎర్ర ఇసుక గరప నేల' },
  'red soil': { en: 'Red Soil', kn: 'ಕೆಂಪು ಮಣ್ಣು', hi: 'लाल मिट्टी', te: 'ఎర్ర నేల' },
  'black soil': { en: 'Black Soil', kn: 'ಕಪ್ಪು ಮಣ್ಣು', hi: 'काली मिट्टी', te: 'నల్ల రేగడి నేల' },
  'loamy soil': { en: 'Loamy Soil', kn: 'ಗೋಡು ಮಣ್ಣು', hi: 'दोमट मिट्टी', te: 'లోమ్ / గరప నేల' },
  'sandy soil': { en: 'Sandy Soil', kn: 'ಮರಳು ಮಣ್ಣು', hi: 'रेतीली मिट्टी', te: 'ఇసుక నేల' },
  'clay soil': { en: 'Clay Soil', kn: 'ಜೇಡಿ ಮಣ್ಣು', hi: 'चिकनी मिट्टी', te: 'బంకమన్ను నేల' },
  'alluvial soil': { en: 'Alluvial Soil', kn: 'ಮೆಕ್ಕಲು ಮಣ್ಣು', hi: 'जलोढ़ मिट्टी', te: 'ఒండ్రు నేల' },
  'drip irrigation': { en: 'Drip Irrigation', kn: 'ಹನಿ ನೀರಾವರಿ', hi: 'ड्रिप सिंचाई', te: 'బిందు సేద్యం' },
  drip: { en: 'Drip Irrigation', kn: 'ಹನಿ ನೀರಾವರಿ', hi: 'ड्रिप सिंचाई', te: 'బిందు సేద్యం' },
  sprinkler: { en: 'Sprinkler', kn: 'ತುಂತುರು ನೀರಾವರಿ', hi: 'स्प्रिंकलर सिंचाई', te: 'తుంపర సేద్యం' },
  'flood / furrow': { en: 'Flood / Furrow', kn: 'ಹರಿವು / ಸಾಲು ನೀರಾವರಿ', hi: 'खुली सिंचाई', te: 'కాలువ / పారుదల సేద్యం' },
  rainfed: { en: 'Rainfed', kn: 'ಮಳೆಯಾಶ್ರಿತ', hi: 'वर्षा आधारित', te: 'వర్షాధారం' },
};

export function localizeCropName(crop: string | undefined | null, lang: Language): string {
  if (!crop) return '';
  const k = crop.trim().toLowerCase();
  return CROP_NAMES[k]?.[lang] || crop;
}

export function localizeGrowthStage(stage: string | undefined | null, lang: Language): string {
  if (!stage) return '';
  const k = stage.trim().toLowerCase();
  return GROWTH_STAGE_NAMES[k]?.[lang] || stage;
}

export function localizeDiseaseName(disease: string | undefined | null, lang: Language): string {
  if (!disease) return '';
  const k = disease.trim().toLowerCase();
  return DISEASE_NAMES[k]?.[lang] || disease;
}

export function localizeCondition(term: string | undefined | null, lang: Language): string {
  if (!term) return '';
  const k = term.trim().toLowerCase();
  return CONDITION_TERMS[k]?.[lang] || term;
}

export function formatLocalizedNumber(value: number | undefined | null, lang: Language): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return Number(value).toLocaleString(getIntlLocale(lang));
}

export function formatLocalizedCurrency(value: number | undefined | null, lang: Language): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `₹${Math.round(value).toLocaleString(getIntlLocale(lang))}`;
}

export function formatLocalizedDate(isoDate: string | undefined | null, lang: Language): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(getIntlLocale(lang), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Plain-language scientific explanations for farmers (NDVI, NDMI, EVI, Confidence, Water Risk).
 */
export function explainScientificIndex(indexName: 'NDVI' | 'NDMI' | 'EVI', val: number | null | undefined, lang: Language): string {
  if (val === null || val === undefined) {
    if (lang === 'kn') return 'ಮೋಡದ ಕಾರಣದಿಂದಾಗಿ ಈ ದಿನದ ನಿಖರ ಮೌಲ್ಯ ಲಭ್ಯವಿಲ್ಲ.';
    if (lang === 'hi') return 'बादलों के कारण इस दिन का सटीक मान उपलब्ध नहीं है।';
    if (lang === 'te') return 'మేఘాల కారణంగా ఈ రోజు ఖచ్చితమైన విలువ అందుబాటులో లేదు.';
    return 'Unavailable on this overpass due to cloud masking.';
  }
  if (indexName === 'NDVI') {
    const vigor = val >= 0.6 ? 'strong' : val >= 0.35 ? 'moderate' : 'sparse';
    if (lang === 'kn') {
      return vigor === 'strong'
        ? `NDVI (${val.toFixed(2)}): ಎಲೆಗಳ ಹಸಿರು ಮತ್ತು ಬೆಳೆ ದಟ್ಟಣೆ ಉತ್ತಮವಾಗಿದೆ. (ಇದು ರೋಗ ಪತ್ತೆ ಅಲ್ಲ).`
        : vigor === 'moderate'
          ? `NDVI (${val.toFixed(2)}): ಬೆಳೆ ಬೆಳವಣಿಗೆ ಮಧ್ಯಮ ಹಂತದಲ್ಲಿದೆ. ಜಮೀನು ಪರಿಶೀಲಿಸಿ.`
          : `NDVI (${val.toFixed(2)}): ಕಡಿಮೆ ಹಸಿರು ಅಥವಾ ಖಾಲಿ ಮಣ್ಣು ತೋರಿಸುತ್ತಿದೆ.`;
    }
    if (lang === 'hi') {
      return vigor === 'strong'
        ? `NDVI (${val.toFixed(2)}): फसल की हरियाली और घनापन अच्छा है। (यह रोग निदान नहीं है)।`
        : vigor === 'moderate'
          ? `NDVI (${val.toFixed(2)}): फसल विकास मध्यम स्तर पर है। खेत की जांच करें।`
          : `NDVI (${val.toFixed(2)}): कम हरियाली या खुली मिट्टी दिख रही है।`;
    }
    if (lang === 'te') {
      return vigor === 'strong'
        ? `NDVI (${val.toFixed(2)}): పంట పచ్చదనం మరియు సాంద్రత బాగుంది. (ఇది వ్యాధి నిర్ధారణ కాదు).`
        : vigor === 'moderate'
          ? `NDVI (${val.toFixed(2)}): పంట పెరుగుదల మధ్యస్థంగా ఉంది. పొలాన్ని తనిఖీ చేయండి.`
          : `NDVI (${val.toFixed(2)}): తక్కువ పచ్చదనం లేదా ఖాళీ నేలను చూపుతోంది.`;
    }
    return `NDVI (${val.toFixed(2)}): Measures leaf greenness (${vigor} canopy vigor). Cannot diagnose disease alone.`;
  }
  if (indexName === 'NDMI') {
    if (lang === 'kn') return `NDMI (${val.toFixed(2)}): ಎಲೆ ಮತ್ತು ಮಣ್ಣಿನ ತೇವಾಂಶ ಸೂಚ್ಯಂಕ (ಧನಾತ್ಮಕ ಮೌಲ್ಯ ಉತ್ತಮ ತೇವಾಂಶ ತೋರಿಸುತ್ತದೆ).`;
    if (lang === 'hi') return `NDMI (${val.toFixed(2)}): पत्तियों व मिट्टी में नमी का सूचकांक (अधिक मान बेहतर नमी दर्शाता है)।`;
    if (lang === 'te') return `NDMI (${val.toFixed(2)}): ఆకులు మరియు నేల తేమ సూచిక (అధిక విలువ మంచి తేమను సూచిస్తుంది).`;
    return `NDMI (${val.toFixed(2)}): Canopy moisture index computed from NIR and SWIR bands.`;
  }
  if (lang === 'kn') return `EVI (${val.toFixed(2)}): ದಟ್ಟವಾದ ಬೆಳೆ ಮೇಲ್ವಿಚಾರಣೆಗಾಗಿ ವರ್ಧಿತ ಹಸಿರು ಸೂಚ್ಯಂಕ.`;
  if (lang === 'hi') return `EVI (${val.toFixed(2)}): घनी फसल की निगरानी के लिए उन्नत हरियाली सूचकांक।`;
  if (lang === 'te') return `EVI (${val.toFixed(2)}): దట్టమైన పంట పర్యవేక్షణ కోసం మెరుగైన పచ్చదనం సూచిక.`;
  return `EVI (${val.toFixed(2)}): Enhanced vegetation vigor index reducing soil/atmosphere noise.`;
}
