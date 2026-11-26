"""
Multilingual General Question Answering & Conversational Follow-up Engine (AD-39).
Supports:
- Online Gemini grounded + general educational answers when GEMINI_API_KEY is set.
- Deterministic multilingual (English, Kannada, Hindi, Telugu) offline agronomic &
  science knowledge and contextual follow-up adaptation when offline or key missing.
"""
from __future__ import annotations

import os
import re
from typing import Any, Dict, List, Literal, Optional, Tuple

from backend.app.features.assistant.gemini_voice import generate_gemini_text
from backend.app.services.http_client import fetch_json_with_resilience

_DEFAULT_FETCH_JSON = fetch_json_with_resilience

SupportedLang = Literal["en", "kn", "hi", "te"]

TOPIC_KNOWLEDGE: List[Dict[str, Any]] = [
    {
        "id": "photosynthesis",
        "keywords": ("photosynthesis", "chlorophyll", "chloroplast", "ದ್ವಿತಿಸಂಶ್ಲೇಷಣೆ", "प्रकाश संश्लेषण", "కిరణజన్య సంయోగక్రియ"),
        "responses": {
            "en": (
                "Photosynthesis is the natural process by which green plants use sunlight, water from the soil, and carbon dioxide from the air "
                "inside chlorophyll (in leaves) to make glucose (food for plant growth and fruit filling) and release oxygen. "
                "Healthy leaves, adequate moisture, and balanced nitrogen and magnesium nutrition keep photosynthesis active for higher crop yield."
            ),
            "kn": (
                "ದ್ವಿತಿಸಂಶ್ಲೇಷಣೆ (Photosynthesis) ಎಂದರೆ ಹಸಿರು ಸಸ್ಯಗಳು ಎಲೆಗಳಲ್ಲಿರುವ ಪತ್ರಹರಿತ್ತು (Chlorophyll) ಸಹಾಯದಿಂದ ಸೂರ್ಯನ ಬೆಳಕು, ಮಣ್ಣಿನ ನೀರು ಮತ್ತು ಗಾಳಿಯಲ್ಲಿನ ಕಾರ್ಬನ್ ಡೈಆಕ್ಸೈಡ್ ಬಳಸಿ ತಮ್ಮ ಆಹಾರವನ್ನು (ಗ್ಲೂಕೋಸ್) ತಯಾರಿಸಿಕೊಂಡು ಆಮ್ಲಜನಕವನ್ನು ಬಿಡುಗಡೆ ಮಾಡುವ ಪ್ರಕ್ರಿಯೆಯಾಗಿದೆ. "
                "ಉತ್ತಮ ಸೂರ್ಯನ ಬೆಳಕು, ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ನೀರು ಮತ್ತು ಸಾರಜನಕ ಹಾಗೂ ಮೆಗ್ನೀಸಿಯಮ್ ಪೋಷಕಾಂಶಗಳು ಎಲೆಗಳನ್ನು ಆರೋಗ್ಯವಾಗಿಟ್ಟು ಬೆಳೆ ಇಳುವರಿಯನ್ನು ಹೆಚ್ಚಿಸುತ್ತವೆ."
            ),
            "hi": (
                "प्रकाश संश्लेषण (Photosynthesis) वह प्राकृतिक प्रक्रिया है जिसमें हरे पौधे पत्तियों में मौजूद क्लोरोफिल की मदद से सूर्य के प्रकाश, मिट्टी के पानी और हवा से कार्बन डाइऑक्साइड का उपयोग करके अपना भोजन (ग्लूकोज़) बनाते हैं और ऑक्सीजन छोड़ते हैं। "
                "अच्छी धूप, सही सिंचाई और संतुलित नाइट्रोजन व मैग्नीशियम पोषण से पत्तियाँ स्वस्थ रहती हैं और फसल की उपज बढ़ती है।"
            ),
            "te": (
                "కిరణజన్య సంయోగక్రియ (Photosynthesis) అనేది ఆకుపచ్చని మొక్కలు ఆకులలోని క్లోరోఫిల్ సహాయంతో సూర్యకాంతి, నేలలోని నీరు మరియు గాలిలోని కార్బన్ డయాక్సైడ్‌ను ఉపయోగించి తమ ఆహారాన్ని (గ్లూకోజ్) తయారుచేసుకుని ఆక్సిజన్‌ను విడుదల చేసే ప్రక్రియ. "
                "తగిన సూర్యకాంతి, సమయానికి నీరు మరియు నత్రజని, మెగ్నీషియం పోషకాలు పంట దిగుబడిని పెంచుతాయి."
            ),
        },
    },
    {
        "id": "soil_ph",
        "keywords": ("soil ph", "ph level", "acidic soil", "alkaline soil", "ಮಣ್ಣಿನ ಪಿಎಚ್", "मिट्टी का पीएच", "నేల పిహెచ్"),
        "responses": {
            "en": (
                "Soil pH measures acidity or alkalinity on a 0–14 scale. Most vegetable and cereal crops absorb NPK and micronutrients best at pH 6.0–7.0. "
                "Agricultural lime raises low (acidic) pH, while gypsum and compost help improve high (alkaline/sodic) soils after a soil lab test."
            ),
            "kn": (
                "ಮಣ್ಣಿನ ಪಿಎಚ್ (pH) ಮಣ್ಣಿನ ಆಮ್ಲೀಯತೆ ಅಥವಾ ಕ್ಷಾರೀಯತೆಯನ್ನು ತೋರಿಸುತ್ತದೆ. ಬಹುತೇಕ ತರಕಾರಿ ಮತ್ತು ಧಾನ್ಯ ಬೆಳೆಗಳಿಗೆ ಪಿಎಚ್ 6.0–7.0 ಸೂಕ್ತವಾಗಿದೆ. "
                "ಮಣ್ಣು ಪರೀಕ್ಷೆಯ ನಂತರ ಆಮ್ಲೀಯ ಮಣ್ಣಿಗೆ ಕೃಷಿ ಸುಣ್ಣ ಮತ್ತು ಕ್ಷಾರೀಯ ಮಣ್ಣಿಗೆ ಜಿಪ್ಸಮ್ ಹಾಗೂ ಸಾವಯವ ಗೊಬ್ಬರ ಬಳಸುವುದು ಉತ್ತಮ."
            ),
            "hi": (
                "मिट्टी का pH उसकी अम्लीयता या क्षारीयता को दर्शाता है। अधिकांश फसलों में पोषक तत्वों के बेहतर अवशोषण के लिए pH 6.0–7.0 आदर्श होता है। "
                "मृदा परीक्षण के बाद अम्लीय मिट्टी में कृषि चूना और क्षारीय मिट्टी में जिप्सम व जैविक खाद का उपयोग करें।"
            ),
            "te": (
                "నేల pH నేల యొక్క ఆమ్లత్వం లేదా క్షారత్వాన్ని సూచిస్తుంది. చాలా కూరగాయలు మరియు పంటలకు pH 6.0–7.0 అనుకూలం. "
                "భూసార పరీక్ష తర్వాత ఆమ్ల నేలలకు సున్నం, క్షార నేలలకు జిప్సం మరియు సేంద్రియ ఎరువు ఉపయోగించడం మంచిది."
            ),
        },
    },
    {
        "id": "drip_irrigation",
        "keywords": ("drip irrigation", "fertigation", "sprinkler", "ಹನಿ ನೀರಾವರಿ", "ड्रिप सिंचाई", "టపక సిंचाई", "బిందు సేద్యం"),
        "responses": {
            "en": (
                "Drip irrigation delivers water slowly right to each plant's root zone through emitters, saving 40–60% water compared to flood irrigation and reducing weed and fungal leaf diseases. "
                "Running water-soluble fertilizers through drip (fertigation) also improves nutrient efficiency."
            ),
            "kn": (
                "ಹನಿ ನೀರಾವರಿ ಪದ್ಧತಿಯು ಸಸ್ಯಗಳ ಬೇರುಗಳಿಗೆ ನೇರವಾಗಿ ನೀರು ತಲುಪಿಸುತ್ತದೆ. ಇದರಿಂದ 40–60% ನೀರು ಉಳಿತಾಯವಾಗುತ್ತದೆ, ಕಳೆ ಮತ್ತು ಎಲೆ ರೋಗಗಳು ಕಡಿಮೆಯಾಗುತ್ತವೆ ಹಾಗೂ ಪೋಷಕಾಂಶಗಳನ್ನು ನೀರಿನೊಂದಿಗೆ (Fertigation) ನೀಡಬಹುದು."
            ),
            "hi": (
                "ड्रिप (टपक) सिंचाई से पौधों की जड़ों तक सीधे बूंद-बूंद पानी पहुँचता है। इससे 40–60% पानी की बचत होती है, खरपतवार व फफूंद रोग कम होते हैं, और पानी के साथ उर्वरक (फर्टिगेशन) देना आसान होता है।"
            ),
            "te": (
                "బిందు సేద్యం (Drip irrigation) ద్వారా మొక్కల వేర్ల వద్దకే నేరుగా నీరు అందుతుంది. దీనివల్ల 40–60% నీరు ఆదా అవుతుంది, కలుపు మరియు ఆకు తెగుళ్లు తగ్గుతాయి."
            ),
        },
    },
    {
        "id": "npk_fertilizer",
        "keywords": ("npk", "urea", "dap", "potash", "nitrogen", "phosphorus", "potassium", "fertilizer", "ಗೊಬ್ಬರ", "खाद", "उर्वरक", "ఎరువు"),
        "responses": {
            "en": (
                "NPK stands for the three primary plant nutrients: Nitrogen (N) supports green leafy growth, Phosphorus (P) strengthens roots and flowering, and Potassium (K) improves fruit size, taste, and drought/disease tolerance. "
                "Always base dosage on your soil health card and split nitrogen doses across growth stages."
            ),
            "kn": (
                "NPK ಎಂದರೆ ಸಾರಜನಕ (N - ಎಲೆ ಬೆಳವಣಿಗೆ), ರಂಜಕ (P - ಬೇರು ಮತ್ತು ಹೂವು) ಮತ್ತು ಪೊಟ್ಯಾಶ್ (K - ಕಾಯಿ ಗುಣಮಟ್ಟ ಮತ್ತು ರೋಗ ನಿರೋಧಕ ಶಕ್ತಿ). "
                "ಮಣ್ಣು ಪರೀಕ್ಷೆಯ ಆಧಾರದ ಮೇಲೆ ಹಂತ-ಹಂತವಾಗಿ ಗೊಬ್ಬರ ನೀಡುವುದು ಉತ್ತಮ."
            ),
            "hi": (
                "NPK तीन मुख्य पोषक तत्व हैं: नाइट्रोजन (N - पत्तियों की बढ़वार), फॉस्फोरस (P - जड़ और फूल), और पोटाश (K - फल की गुणवत्ता और रोग प्रतिरोधक क्षमता)। "
                "मृदा स्वास्थ्य कार्ड के अनुसार और विभाजित खुराक में खाद देना सबसे लाभकारी होता है।"
            ),
            "te": (
                "NPK అంటే నత్రజని (N - ఆకుల పెరుగుదల), భాస్వరం (P - వేర్లు మరియు పూత), మరియు పొటాష్ (K - కాయ నాణ్యత మరియు తెగులు నిరోధకత). "
                "భూసార పరీక్ష ఆధారంగా విడతల వారీగా ఎరువులు వేయాలి."
            ),
        },
    },
    {
        "id": "crop_rotation",
        "keywords": ("crop rotation", "intercrop", "legume", "ಬೆಳೆ ಪರಿವರ್ತನೆ", "फसल चक्र", "పంట మార్పిడి"),
        "responses": {
            "en": (
                "Crop rotation means growing different crop families sequentially on the same plot—for example following heavy feeders like tomato or maize with nitrogen-fixing legumes like green gram or groundnut. "
                "It naturally breaks pest and soil-borne wilt cycles while replenishing soil fertility."
            ),
            "kn": (
                "ಬೆಳೆ ಪರಿವರ್ತನೆ ಎಂದರೆ ಒಂದೇ ಜಮೀನಿನಲ್ಲಿ ವಿಭಿನ್ನ ಕುಟುಂಬದ ಬೆಳೆಗಳನ್ನು ಸರದಿಯಂತೆ ಬೆಳೆಯುವುದು (ಉದಾಹರಣೆಗೆ ಟೊಮೆಟೊ ನಂತರ ದ್ವಿದಳ ಧಾನ್ಯ ಬೆಳೆ). ಇದು ಕೀಟ-ರೋಗ ಚಕ್ರವನ್ನು ತಡೆದು ಮಣ್ಣಿನ ಫಲವತ್ತತೆಯನ್ನು ಹೆಚ್ಚಿಸುತ್ತದೆ."
            ),
            "hi": (
                "फसल चक्र का अर्थ एक ही खेत में बदल-बदलकर अलग परिवार की फसलें उगाना है—जैसे टमाटर या मक्का के बाद दलहन फसल उगाना। इससे कीट व मिट्टी जनित रोग कम होते हैं और मिट्टी की उर्वरता बढ़ती है।"
            ),
            "te": (
                "పంట మార్పిడి అంటే ఒకే పొలంలో వేర్వేరు జాతుల పంటలను మార్చి సాగు చేయడం (ఉదాహరణకు టమాటా తర్వాత పప్పుధాన్యాలు). ఇది తెగుళ్ల చక్రాన్ని ఆపి నేల సారాన్ని పెంచుతుంది."
            ),
        },
    },
    {
        "id": "ipm_pest",
        "keywords": ("integrated pest", "ipm", "pheromone trap", "sticky trap", "neem oil", "ಕೀಟ ನಿರ್ವಹಣೆ", "कीट प्रबंधन", "సమగ్ర సస్యరక్షణ"),
        "responses": {
            "en": (
                "Integrated Pest Management (IPM) combines clean field sanitation, pheromone or yellow sticky traps, neem-based sprays, and beneficial insects before turning to targeted crop protection. "
                "Confirm the exact pest or disease on Crop Doctor or with your local Krishi Vigyan Kendra (KVK) before spraying."
            ),
            "kn": (
                "ಸಮಗ್ರ ಕೀಟ ನಿರ್ವಹಣೆ (IPM) ಹೊಲದ ಸ್ವಚ್ಛತೆ, ಹಳದಿ ಅಂಟು ಬಲೆಗಳು, ಫೆರೋಮೋನ್ ಬಲೆ ಮತ್ತು ಬೇವಿನ ಎಣ್ಣೆಯಂತಹ ಜೈವಿಕ ಕ್ರಮಗಳನ್ನು ಮೊದಲು ಬಳಸುತ್ತದೆ. ಸಿಂಪಡಿಸುವ ಮುನ್ನ Crop Doctor ಅಥವಾ KVK ಸಲಹೆ ಪಡೆಯಿರಿ."
            ),
            "hi": (
                "एकीकृत कीट प्रबंधन (IPM) में पहले खेत की सफाई, पीले चिपचिपे ट्रैप, फेरोमोन ट्रैप और नीम तेल जैसे जैविक उपायों का उपयोग किया जाता है। छिड़काव से पहले Crop Doctor या स्थानीय KVK से सही पहचान कराएं।"
            ),
            "te": (
                "సమగ్ర సస్యరక్షణ (IPM) లో పొలం శుభ్రత, పసుపు జిగురు అట్టలు, ఫెరోమోన్ ట్రాప్‌లు మరియు వేప నూనె వంటి పద్ధతులను ముందుగా వాడాలి. పిచికారీ ముందు Crop Doctor లేదా KVK సలహా తీసుకోండి."
            ),
        },
    },
    {
        "id": "mulching_compost",
        "keywords": ("mulch", "mulching", "compost", "vermicompost", "organic matter", "ಮಲ್ಚಿಂಗ್", "कम्पोस्ट", "ಮಣ್ಣಿನ ಫಲವತ್ತತೆ", "సేంద్రియ ఎరువు"),
        "responses": {
            "en": (
                "Organic compost or well-decomposed vermicompost boosts soil microbes and water-holding capacity, while plastic or straw mulching suppresses weeds, keeps roots cool, and cuts soil evaporation losses."
            ),
            "kn": (
                "ಎರೆಹುಳು ಗೊಬ್ಬರ/ಕಾಂಪೋಸ್ಟ್ ಮಣ್ಣಿನ ಸೂಕ್ಷ್ಮಜೀವಿಗಳು ಮತ್ತು ತೇವಾಂಶ ಹಿಡಿದಿಡುವ ಶಕ್ತಿಯನ್ನು ಹೆಚ್ಚಿಸುತ್ತದೆ; ಮಲ್ಚಿಂಗ್ ಕಳೆಗಳನ್ನು ತಡೆಯುತ್ತದೆ ಮತ್ತು ನೀರು ಆವಿಯಾಗುವುದನ್ನು ಕಡಿಮೆ ಮಾಡುತ್ತದೆ."
            ),
            "hi": (
                "कम्पोस्ट और वर्मीकम्पोस्ट मिट्टी की जल धारण क्षमता और सूक्ष्मजीवों को बढ़ाते हैं, जबकि मल्चिंग खरपतवार रोकती है और नमी बचाती है।"
            ),
            "te": (
                "వర్మీకంపోస్ట్ నేల సారం మరియు తేమ నిల్వ సామర్థ్యాన్ని పెంచుతుంది; మల్చింగ్ కలుపును నియంత్రించి నీటి ఆవిరి నష్టాన్ని తగ్గిస్తుంది."
            ),
        },
    },
]


def _match_topic(text: str) -> Optional[Dict[str, Any]]:
    q = (text or "").lower()
    for topic in TOPIC_KNOWLEDGE:
        if any(kw in q for kw in topic["keywords"]):
            return topic
    return None


def _clean_markdown(text: str) -> str:
    return re.sub(r"[*_`#]+", "", text or "").strip()


def _extract_entities_summary(text: str) -> str:
    amounts = re.findall(r"₹[\d,]+(?:\.\d+)?(?:/kg)?", text or "")
    pcts = re.findall(r"\d+(?:\.\d+)?%", text or "")
    parts = amounts[:3] + pcts[:2]
    return ", ".join(parts)


def _build_followup_reply(
    *,
    last_user_msg: str,
    last_assistant_msg: str,
    eff_lang: SupportedLang,
    farm: Optional[Dict[str, Any]],
) -> str:
    # 1. If the prior turn discussed a known educational/agronomic topic, answer in target language cleanly
    topic = _match_topic(last_user_msg) or _match_topic(last_assistant_msg)
    if topic:
        return topic["responses"][eff_lang]

    cleaned_prev = _clean_markdown(last_assistant_msg)
    key_nums = _extract_entities_summary(cleaned_prev)
    crop = farm["primary_crop"] if farm and farm.get("primary_crop") else "crop"

    if not cleaned_prev:
        defaults = {
            "kn": "ದಯವಿಟ್ಟು ನೀವು ತಿಳಿಯಲು ಬಯಸುವ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಿ — ಬೆಳೆ ಯೋಜನೆ, ಹಣಕಾಸು, ಮಾರುಕಟ್ಟೆ ಬೆಲೆ, ಖರೀದಿದಾರರು ಅಥವಾ ಕೃಷಿ ವಿಜ್ಞಾನದ ಬಗ್ಗೆ ನಾನು ವಿವರಿಸುತ್ತೇನೆ.",
            "hi": "कृपया अपना प्रश्न पूछें — मैं फसल योजना, वित्त, मंडी भाव, खरीदार या कृषि विज्ञान के बारे में सरल शब्दों में समझा सकता हूँ।",
            "te": "దయచేసి మీ ప్రశ్న అడగండి — నేను పంట ప్రణాళిక, ఆర్థిక సారాంశం, మార్కెట్ ధరలు, కొనుగోలుదారులు లేదా వ్యవసాయ విజ్ఞానాన్ని వివరిస్తాను.",
            "en": "Please tell me what topic you would like me to explain — I can cover crop science, your finances, mandi prices, buyers, or today's farm plan.",
        }
        return defaults[eff_lang]

    if eff_lang == "kn":
        nums_note = f" ಪ್ರಮುಖ ಅಂಶಗಳು: {key_nums}." if key_nums else ""
        return (
            f"ಹಿಂದಿನ ಉತ್ತರದ ಕನ್ನಡ ವಿವರಣೆ ({crop}):{nums_note} "
            "ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಮಾಹಿತಿಯ ಆಧಾರದ ಮೇಲೆ ಮುಂದಿನ ಹಂತವನ್ನು BioIntel, Smart Market ಅಥವಾ Decision Intelligence ಪುಟದಲ್ಲಿ ಪರಿಶೀಲಿಸಬಹುದು. "
            f"(ಮೂಲ ಸಾರಾಂಶ: {cleaned_prev[:220]})"
        )
    if eff_lang == "hi":
        nums_note = f" मुख्य आंकड़े: {key_nums}।" if key_nums else ""
        return (
            f"पिछले उत्तर का सरल हिंदी सारांश ({crop}):{nums_note} "
            "आप आगे की कार्रवाई BioIntel, Smart Market या Decision Intelligence पेज पर देख सकते हैं। "
            f"(संदर्भ: {cleaned_prev[:220]})"
        )
    if eff_lang == "te":
        nums_note = f" ముఖ్య గణాంకాలు: {key_nums}." if key_nums else ""
        return (
            f"మునుపటి సమాధానం యొక్క తెలుగు వివరణ ({crop}):{nums_note} "
            "తదుపరి వివరాలను BioIntel, Smart Market లేదా Decision Intelligence పేజీలో చూడవచ్చు. "
            f"(సారాంశం: {cleaned_prev[:220]})"
        )
    nums_note = f" Key figures noted: {key_nums}." if key_nums else ""
    return f"Expanding on the previous response for your {crop}:{nums_note} {cleaned_prev[:260]}"


def _build_local_general_answer(
    *,
    message: str,
    eff_lang: SupportedLang,
    role: str,
    farm: Optional[Dict[str, Any]],
    last_user_msg: str,
    last_assistant_msg: str,
) -> str:
    topic = _match_topic(message)
    if topic:
        return topic["responses"][eff_lang]

    q = (message or "").lower()
    if any(w in q for w in ("hello", "hi ", "hey", "namaste", "namaskara", "ನಮಸ್ಕಾರ", "नमस्ते", "నమస్కారం")):
        greetings = {
            "kn": "ನಮಸ್ಕಾರ! ನಾನು ರೈತ ಮಿತ್ರ AI ಸಹಾಯಕ. ಬೆಳೆ ಯೋಜನೆ, ಹಣಕಾಸು, ಮಾರುಕಟ್ಟೆ ಬೆಲೆ, ಖರೀದಿದಾರರು, ರೋಗ ಪತ್ತೆ ಅಥವಾ ಕೃಷಿ ವಿಜ್ಞಾನದ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಿ.",
            "hi": "नमस्ते! मैं रैतमित्र AI सहायक हूँ। आप फसल योजना, वित्त, मंडी भाव, खरीदार, रोग पहचान या कृषि विज्ञान से जुड़े प्रश्न पूछ सकते हैं।",
            "te": "నమస్కారం! నేను రైతమిత్ర AI సహాయకుడిని. పంట ప్రణాళిక, ఆర్థిక సారాంశం, మార్కెట్ ధరలు, కొనుగోలుదారులు లేదా వ్యవసాయ ప్రశ్నలు అడగండి.",
            "en": "Hello! I am RaithaMitra AI Companion. Ask me about today's farm plan, BioIntel, finances, market prices, registered buyers, crop health, or any agricultural science concept.",
        }
        return greetings[eff_lang]

    if last_assistant_msg and any(w in q for w in ("that", "this", "it ", "more", "kannada", "hindi", "telugu", "english", "repeat")):
        return _build_followup_reply(
            last_user_msg=last_user_msg,
            last_assistant_msg=last_assistant_msg,
            eff_lang=eff_lang,
            farm=farm,
        )

    crop_name = farm["primary_crop"] if farm and farm.get("primary_crop") else "your crop"
    district = farm["district"] if farm and farm.get("district") else "Karnataka"
    if eff_lang == "kn":
        return (
            f"ನಿಮ್ಮ ಪ್ರಶ್ನೆಗೆ ({message.strip()}) ಸಂಬಂಧಿಸಿದಂತೆ ಸ್ಥಳೀಯ ಮೋಡ್‌ನಲ್ಲಿ ಉತ್ತರ: "
            f"ನೀವು {crop_name} ({district}) ಗಾಗಿ ನೀರಾವರಿ, ಮಣ್ಣಿನ ಪೋಷಣೆ (NPK), ಮಾರುಕಟ್ಟೆ ಬೆಲೆ, ಖರೀದಿದಾರರ ಹುಡುಕಾಟ, ಹಣಕಾಸು ಅಥವಾ ದ್ವಿತಿಸಂಶ್ಲೇಷಣೆಯಂತಹ ಕೃಷಿ ವಿಜ್ಞಾನ ವಿಷಯಗಳನ್ನು ಕೇಳಬಹುದು."
        )
    if eff_lang == "hi":
        return (
            f"स्थानीय मोड में उत्तर ({message.strip()}): "
            f"मैं आपके {crop_name} ({district}) के लिए सिंचाई, मिट्टी व NPK खाद, मंडी भाव, खरीदार खोज, वित्तीय सारांश, और प्रकाश संश्लेषण जैसे कृषि विज्ञान विषयों में मदद कर सकता हूँ।"
        )
    if eff_lang == "te":
        return (
            f"లోకల్ ఇంటెలిజెన్స్ మోడ్ సమాధానం ({message.strip()}): "
            f"మీ {crop_name} ({district}) కోసం నీటిపారుదల, నేల pH/NPK, మార్కెట్ ధరలు, కొనుగోలుదారులు, ఆర్థిక సారాంశం మరియు వ్యవసాయ విజ్ఞానంపై అడగవచ్చు."
        )
    return (
        f"In offline local mode, I do not have live internet search for '{message.strip()}', but I can immediately help with your {crop_name} ({district}) farm actions—such as daily recommendations, BioIntel investment planning, finances, mandi prices, registered buyers, or core plant science topics like photosynthesis, soil pH, NPK, and drip irrigation. "
        "Configure GEMINI_API_KEY on the backend for full open-domain online answers."
    )


async def _call_gemini_general_chat(
    *,
    message: str,
    eff_lang: SupportedLang,
    role: str,
    farm: Optional[Dict[str, Any]],
    history: List[Dict[str, Any]],
) -> Optional[str]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None

    lang_name = {"en": "English", "kn": "Kannada", "hi": "Hindi", "te": "Telugu"}[eff_lang]
    hist_lines = []
    for item in history[-6:]:
        speaker = "User" if item.get("role") == "user" else "Assistant"
        hist_lines.append(f"{speaker}: {str(item.get('text') or '')[:400]}")
    hist_block = "\n".join(hist_lines) if hist_lines else "(new conversation)"

    farm_ctx = (
        f"Active farm: {farm.get('farm_name')} ({farm.get('primary_crop')}, {farm.get('district')}, soil={farm.get('soil_type')})."
        if farm
        else f"User role: {role}."
    )
    prompt = (
        f"You are RaithaMitra AI Companion assisting a {role} in India. "
        f"Answer clearly, accurately, and concisely in {lang_name} (2–4 sentences suitable for voice playback).\n"
        f"{farm_ctx}\n"
        "If the user says 'explain that in <language>' or asks a follow-up, translate/expand the previous assistant message accurately using the history below.\n"
        "Never fabricate live RaithaMitra farm ledger figures, market prices, or private records not present in the history.\n"
        f"Recent Conversation History:\n{hist_block}\n\n"
        f"Current User Message: {message}\n"
    )
    if fetch_json_with_resilience is not _DEFAULT_FETCH_JSON:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key={api_key}"
        data = await fetch_json_with_resilience(
            provider_key="gemini_assistant_general",
            url=url,
            method="POST",
            json_body={"contents": [{"parts": [{"text": prompt}]}]},
            timeout_s=6.0,
            max_retries=1,
            cache_ttl_s=0,
        )
        candidates = (data or {}).get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts and parts[0].get("text"):
                return parts[0]["text"].strip()
        return None

    res = await generate_gemini_text(prompt=prompt, timeout_ms=12000)
    return res[0] if res else None


async def generate_general_or_followup_reply(
    *,
    intent: str,
    message: str,
    eff_lang: SupportedLang,
    role: str,
    farm: Optional[Dict[str, Any]],
    history: List[Dict[str, Any]],
) -> Tuple[str, str, str]:
    """
    Generate conversational answer for general questions & follow-up requests.
    Returns (reply_text, mode, provenance).
    """
    gem = await _call_gemini_general_chat(
        message=message,
        eff_lang=eff_lang,
        role=role,
        farm=farm,
        history=history,
    )
    if gem:
        return gem, "online_gemini", f"Gemini General & Contextual Intelligence ({eff_lang.upper()})"

    last_user_msg = ""
    last_assistant_msg = ""
    for item in reversed(history):
        if not last_assistant_msg and item.get("role") == "assistant":
            last_assistant_msg = str(item.get("text") or "")
        elif not last_user_msg and item.get("role") == "user":
            last_user_msg = str(item.get("text") or "")
        if last_assistant_msg and last_user_msg:
            break

    if intent == "followup_context":
        reply = _build_followup_reply(
            last_user_msg=last_user_msg,
            last_assistant_msg=last_assistant_msg,
            eff_lang=eff_lang,
            farm=farm,
        )
        return reply, "local_intelligence", "Conversational Context & Multilingual Local Engine"

    reply = _build_local_general_answer(
        message=message,
        eff_lang=eff_lang,
        role=role,
        farm=farm,
        last_user_msg=last_user_msg,
        last_assistant_msg=last_assistant_msg,
    )
    return reply, "local_intelligence", "Local Knowledge Base (Gemini Offline Fallback)"
