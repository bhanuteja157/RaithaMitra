# backend/app/api/endpoints/schemes.py
from fastapi import APIRouter, Query
from typing import Dict, List, Optional
from backend.app.schemas.schemes import GovernmentScheme
from backend.app.data.schemes import INDIAN_GOVERNMENT_SCHEMES

router = APIRouter()

_LOCALIZED_SCHEME_COPY: Dict[str, Dict[str, Dict[str, str]]] = {
    "kn": {
        "pm_kisan": {
            "objective": "ಭೂಹಿಡುವಳಿ ರೈತ ಕುಟುಂಬಗಳಿಗೆ ಕೃಷಿ ವೆಚ್ಚ ಮತ್ತು ಆರ್ಥಿಕ ಅಗತ್ಯಗಳಿಗೆ ನೇರ ಆದಾಯ ಬೆಂಬಲ.",
            "financial_benefit": "ವರ್ಷಕ್ಕೆ ₹6,000 (₹2,000 ರಂತೆ 3 ಸಮಾನ ಕಂತುಗಳಲ್ಲಿ ನೇರ DBT ಬ್ಯಾಂಕ್ ವರ್ಗಾವಣೆ).",
        },
        "pmfby": {
            "objective": "ನೈಸರ್ಗಿಕ ವಿಕೋಪ, ಕೀಟ ಮತ್ತು ರೋಗಗಳಿಂದ ಬೆಳೆ ನಷ್ಟಕ್ಕೆ ರೈತರಿಗೆ ಸಮಗ್ರ ವಿಮಾ ರಕ್ಷಣೆ.",
            "financial_benefit": "ಖರೀಫ್ 2%, ರಬಿ 1.5%, ವಾಣಿಜ್ಯ ಬೆಳೆಗಳಿಗೆ 5% ಪ್ರೀಮಿಯಂ ಮಿತಿ; ಉಳಿದ ಮೊತ್ತವನ್ನು ಸರ್ಕಾರ ಭರಿಸುತ್ತದೆ.",
        },
        "soil_health_card": {
            "objective": "ಪ್ರತಿ ರೈತರಿಗೆ ಜಮೀನಿನ ಪೋಷಕಾಂಶ ಸ್ಥಿತಿ ಮತ್ತು ರಸಗೊಬ್ಬರ ಶಿಫಾರಸುಗಳ ಕಾರ್ಡ್ ನೀಡುವುದು.",
            "financial_benefit": "ಪ್ರತಿ 2 ವರ್ಷಕ್ಕೊಮ್ಮೆ ಉಚಿತ ಮಣ್ಣು ಪರೀಕ್ಷೆ ಮತ್ತು ಪೋಷಕಾಂಶ ವರದಿ.",
        },
        "pmksy_per_drop_more_crop": {
            "objective": "ಹನಿ ಮತ್ತು ತುಂತುರು ಸೂಕ್ಷ್ಮ ನೀರಾವರಿ ಮೂಲಕ ನೀರಿನ ಬಳಕೆ ದಕ್ಷತೆಯನ್ನು ಹೆಚ್ಚಿಸುವುದು.",
            "financial_benefit": "ಸಣ್ಣ/ಅತಿ ಸಣ್ಣ ರೈತರಿಗೆ 55% ಮತ್ತು ಇತರೆ ರೈತರಿಗೆ 45% ಸಹಾಯಧನ.",
        },
        "kcc": {
            "objective": "ಬೀಜ, ಗೊಬ್ಬರ, ಕೀಟನಾಶಕ ಮತ್ತು ಕೊಯ್ಲು ವೆಚ್ಚಗಳಿಗೆ ಕಡಿಮೆ ಬಡ್ಡಿದರದಲ್ಲಿ ತಕ್ಷಣದ ಕೃಷಿ ಸಾಲ.",
            "financial_benefit": "₹3 ಲಕ್ಷದವರೆಗೆ ಸಾಲಕ್ಕೆ ಬಡ್ಡಿ ರಿಯಾಯಿತಿ; ಸಕಾಲಿಕ ಮರುಪಾವತಿಗೆ ವಾರ್ಷಿಕ 4% ಪರಿಣಾಮಕಾರಿ ಬಡ್ಡಿ.",
        },
    },
    "hi": {
        "pm_kisan": {
            "objective": "भूमिधारक किसान परिवारों को कृषि निवेश और घरेलू जरूरतों के लिए आय सहायता।",
            "financial_benefit": "प्रति वर्ष ₹6,000 (₹2,000 की 3 समान किस्तों में सीधे बैंक खाते में DBT)।",
        },
        "pmfby": {
            "objective": "प्राकृतिक आपदाओं, कीटों और रोगों से फसल नुकसान पर किसानों को बीमा सुरक्षा।",
            "financial_benefit": "खरीफ 2%, रबी 1.5%, वाणिज्यिक फसलों पर अधिकतम 5% प्रीमियम; शेष सरकार वहन करती है।",
        },
        "soil_health_card": {
            "objective": "मिट्टी की पोषक स्थिति और संतुलित उर्वरक सिफारिशों के लिए मृदा स्वास्थ्य कार्ड।",
            "financial_benefit": "हर 2 वर्ष में निःशुल्क मिट्टी परीक्षण एवं उर्वरक परामर्श रिपोर्ट।",
        },
        "pmksy_per_drop_more_crop": {
            "objective": "ड्रिप और स्प्रिंकलर सूक्ष्म सिंचाई के माध्यम से जल उपयोग दक्षता बढ़ाना।",
            "financial_benefit": "लघु एवं सीमांत किसानों को 55% तथा अन्य किसानों को 45% सब्सिडी।",
        },
        "kcc": {
            "objective": "खेती और फसलोत्तर खर्चों के लिए समय पर और सस्ता संस्थागत कृषि ऋण।",
            "financial_benefit": "₹3 लाख तक के ऋण पर ब्याज छूट; समय पर भुगतान पर प्रभावी ब्याज मात्र 4% वार्षिक।",
        },
    },
    "te": {
        "pm_kisan": {
            "objective": "భూమి కలిగిన రైతు కుటుంబాలకు సాగు ఖర్చులు మరియు ఆర్థిక అవసరాలకు నేరుగా ఆదాయ సహాయం.",
            "financial_benefit": "సంవత్సరానికి ₹6,000 (₹2,000 చొప్పున 3 విడతల్లో నేరుగా బ్యాంకు ఖాతాకు DBT).",
        },
        "pmfby": {
            "objective": "ప్రకృతి వైపరీత్యాలు, తెగుళ్లు మరియు వ్యాధుల వల్ల పంట నష్టానికి రైతులకు బీమా రక్షణ.",
            "financial_benefit": "ఖరీఫ్ 2%, రబీ 1.5%, వాణిజ్య పంటలకు 5% గరిష్ట ప్రీమియం; మిగిలిన సబ్సిడీని ప్రభుత్వం భరిస్తుంది.",
        },
        "soil_health_card": {
            "objective": "భూమిలోని పోషక స్థితి మరియు సమతుల్య ఎరువుల సిఫార్సులతో నేల ఆరోగ్య కార్డు.",
            "financial_benefit": "ప్రతి 2 సంవత్సరాలకు ఉచిత మట్టి పరీక్ష మరియు పోషక నివేదిక.",
        },
        "pmksy_per_drop_more_crop": {
            "objective": "డ్రిప్ మరియు స్ప్రింక్లర్ సూక్ష్మ సేద్యంతో నీటి వినియోగ సామర్థ్యాన్ని పెంచడం.",
            "financial_benefit": "చిన్న/సన్నకారు రైతులకు 55% మరియు ఇతర రైతులకు 45% సబ్సిడీ.",
        },
        "kcc": {
            "objective": "విత్తనాలు, ఎరువులు మరియు కోత ఖర్చులకు తక్కువ వడ్డీతో తక్షణ పంట రుణం.",
            "financial_benefit": "₹3 లక్షల వరకు రుణంపై వడ్డీ రాయితీ; సకాలంలో చెల్లింపుపై 4% వార్షిక వడ్డీ.",
        },
    },
}


@router.get("/schemes", response_model=List[GovernmentScheme], summary="Browse Indian agricultural government schemes")
async def list_schemes(
    category: Optional[str] = Query(None, description="Filter by category"),
    state: Optional[str] = Query(None, description="Filter by applicable state"),
    lang: Optional[str] = Query("en", description="Optional UI language code (en, kn, hi, te)")
):
    schemes = INDIAN_GOVERNMENT_SCHEMES
    if category and category.lower() != "all":
        schemes = [s for s in schemes if category.lower() in s.category.lower()]
    if state and state.lower() != "all states":
        schemes = [s for s in schemes if "All States" in s.applicable_states or state.lower() in [st.lower() for st in s.applicable_states]]

    norm_lang = (lang or "en").strip().lower()[:2]
    if norm_lang not in {"en", "kn", "hi", "te"}:
        norm_lang = "en"

    if norm_lang == "en":
        return [s.model_copy(update={"lang": "en"}) for s in schemes]

    lang_table = _LOCALIZED_SCHEME_COPY.get(norm_lang, {})
    localized_list: List[GovernmentScheme] = []
    for scheme in schemes:
        tr = lang_table.get(scheme.id, {})
        localized_list.append(
            scheme.model_copy(
                update={
                    "lang": norm_lang,
                    "objective_localized": tr.get("objective", scheme.objective),
                    "financial_benefit_localized": tr.get("financial_benefit", scheme.financial_benefit),
                }
            )
        )
    return localized_list
