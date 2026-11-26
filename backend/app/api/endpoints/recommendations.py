# backend/app/api/endpoints/recommendations.py
from typing import Dict, Optional
from fastapi import APIRouter, HTTPException, Query
from backend.app.schemas.recommendation import RecommendationResponse
from backend.app.services.farm_service import farm_service
from backend.app.services.weather_service import weather_service
from backend.app.engines.decision_engine import decision_engine

router = APIRouter()

_CATEGORY_TRANSLATIONS: Dict[str, Dict[str, Dict[str, str]]] = {
    "kn": {
        "irrigation": {
            "title": "ನೀರಾವರಿ ವೇಳಾಪಟ್ಟಿ ಸಲಹೆ",
            "action": "ಮಣ್ಣಿನ ತೇವಾಂಶ ಮತ್ತು ಹವಾಮಾನದ ಆಧಾರದ ಮೇಲೆ ನೀರಾವರಿಯನ್ನು ನಿಯಂತ್ರಿಸಿ.",
        },
        "nutrition": {
            "title": "ಮಣ್ಣಿನ ಪೋಷಕಾಂಶ ಮತ್ತು ಗೊಬ್ಬರ ಸಲಹೆ",
            "action": "ಬೆಳೆಯ ಬೆಳವಣಿಗೆ ಹಂತಕ್ಕೆ ಅನುಗುಣವಾಗಿ ಸಮತೋಲಿತ NPK ಮತ್ತು ಸೂಕ್ಷ್ಮ ಪೋಷಕಾಂಶಗಳನ್ನು ನೀಡಿ.",
        },
        "crop_protection": {
            "title": "ಕೀಟ ಮತ್ತು ರೋಗ ನಿಯಂತ್ರಣ ಸಲಹೆ",
            "action": "ಎಲೆ ರೋಗ ಲಕ್ಷಣಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಶಿಫಾರಸು ಮಾಡಿದ ಸಮಗ್ರ ಸಸ್ಯ ರಕ್ಷಣೆಯನ್ನು ಪಾಲಿಸಿ.",
        },
        "market": {
            "title": "ಮಾರುಕಟ್ಟೆ ಮತ್ತು ಬೆಲೆ ತಂತ್ರ",
            "action": "ಸಮೀಪದ APMC ಮಂಡಿ ಬೆಲೆ ಮತ್ತು ಸಾಗಣೆ ವೆಚ್ಚವನ್ನು ಹೋಲಿಸಿ ಮಾರಾಟ ಸಮಯವನ್ನು ನಿರ್ಧರಿಸಿ.",
        },
        "risk": {
            "title": "ಹವಾಮಾನ ಮತ್ತು ಬೆಳೆ ಅಪಾಯ ಎಚ್ಚರಿಕೆ",
            "action": "ತೇವಾಂಶ, ಮಳೆ ಅಥವಾ ಉಷ್ಣಾಂಶ ಏರಿಳಿತದಿಂದ ರಕ್ಷಿಸಲು ಮುನ್ನೆಚ್ಚರಿಕೆ ಕ್ರಮಗಳನ್ನು ಕೈಗೊಳ್ಳಿ.",
        },
        "biotech": {
            "title": "ಜೈವಿಕ ತಂತ್ರಜ್ಞಾನ ಮತ್ತು ತಳಿ ಸಲಹೆ",
            "action": "ಅಧಿಕ ಇಳುವರಿ ಮತ್ತು ರೋಗ ನಿರೋಧಕ ತಳಿಗಳಿಗಾಗಿ BioIntel ಶಿಫಾರಸುಗಳನ್ನು ಅನುಸರಿಸಿ.",
        },
        "labour": {
            "title": "ಕೃಷಿ ಕಾರ್ಮಿಕರ ನಿಯೋಜನೆ ಸಲಹೆ",
            "action": "ಬಿತ್ತನೆ ಅಥವಾ ಕೊಯ್ಲು ಸಮಯಕ್ಕೆ ಮುಂಚಿತವಾಗಿ Labour Connect ಮೂಲಕ ಕಾರ್ಮಿಕರನ್ನು ಕಾಯ್ದಿರಿಸಿ.",
        },
        "logistics": {
            "title": "ಸಾಗಣೆ ಮತ್ತು ಶೇಖರಣೆ ಸಲಹೆ",
            "action": "ಕೊಯ್ಲಿನ ನಂತರ ಸುರಕ್ಷಿತ ಶೇಖರಣೆ ಮತ್ತು ಹಂಚಿಕೆ ಸಾಗಣೆಗಾಗಿ Transport Connect ಬಳಸಿ.",
        },
    },
    "hi": {
        "irrigation": {
            "title": "सिंचाई समय निर्धारण सलाह",
            "action": "मिट्टी की नमी और मौसम पूर्वानुमान के अनुसार सिंचाई नियंत्रित करें।",
        },
        "nutrition": {
            "title": "पोषक तत्व एवं उर्वरक सलाह",
            "action": "फसल की अवस्था के अनुसार संतुलित NPK और सूक्ष्म पोषक तत्व दें।",
        },
        "crop_protection": {
            "title": "कीट एवं रोग सुरक्षा सलाह",
            "action": "पत्तियों की नियमित जांच करें और समेकित रोग प्रबंधन अपनाएं।",
        },
        "market": {
            "title": "बाजार एवं मूल्य रणनीति",
            "action": "नजदीकी APMC मंडी भाव और परिवहन लागत की तुलना कर बिक्री का समय चुनें।",
        },
        "risk": {
            "title": "मौसम एवं फसल जोखिम चेतावनी",
            "action": "नमी, वर्षा या तापमान में बदलाव से बचाव हेतु एहतियाती कदम उठाएं।",
        },
        "biotech": {
            "title": "जैव-प्रौद्योगिकी एवं किस्म सलाह",
            "action": "उच्च उपज व रोग-रोधी किस्मों के लिए BioIntel अनुशंसा का उपयोग करें।",
        },
        "labour": {
            "title": "कृषि श्रमिक बुकिंग सलाह",
            "action": "रोपाई या कटाई अवधि से पहले Labour Connect से समय पर श्रमिक बुक करें।",
        },
        "logistics": {
            "title": "परिवहन एवं भंडारण सलाह",
            "action": "कटाई के बाद सुरक्षित भंडारण और साझा परिवहन हेतु Transport Connect उपयोग करें।",
        },
    },
    "te": {
        "irrigation": {
            "title": "నీటిపారుదల షెడ్యూల్ సలహా",
            "action": "నేల తేమ మరియు వాతావరణ అంచనా ఆధారంగా నీటిపారుదలను నియంత్రించండి.",
        },
        "nutrition": {
            "title": "నేల పోషకాలు మరియు ఎరువుల సలహా",
            "action": "పంట దశకు అనుగుణంగా సమతుల్య NPK మరియు సూక్ష్మ పోషకాలను అందించండి.",
        },
        "crop_protection": {
            "title": "తెగుళ్లు మరియు వ్యాధి నివారణ సలహా",
            "action": "ఆకులను క్రమం తప్పకుండా పరిశీలించి సమగ్ర సస్యరక్షణ చర్యలు చేపట్టండి.",
        },
        "market": {
            "title": "మార్కెట్ మరియు ధర వ్యూహం",
            "action": "సమీప APMC మార్కెట్ ధరలు మరియు రవాణా ఖర్చులను పోల్చి అమ్మకం సమయాన్ని నిర్ణయించండి.",
        },
        "risk": {
            "title": "వాతావరణ మరియు పంట ప్రమాద హెచ్చరిక",
            "action": "వర్షం, తేమ లేదా ఉష్ణోగ్రత మార్పుల నుండి రక్షణకు ముందస్తు జాగ్రత్తలు తీసుకోండి.",
        },
        "biotech": {
            "title": "బయోటెక్ మరియు వంగడ సలహా",
            "action": "అధిక దిగుబడి మరియు వ్యాధి నిరోధక రకాల కోసం BioIntel సిఫార్సులను పరిశీలించండి.",
        },
        "labour": {
            "title": "వ్యవసాయ కూలీల బుకింగ్ సలహా",
            "action": "నాట్లు లేదా కోత సమయానికి ముందే Labour Connect ద్వారా కూలీలను బుక్ చేయండి.",
        },
        "logistics": {
            "title": "రవాణా మరియు నిల్వ సలహా",
            "action": "పంట కోత తర్వాత సురక్షిత నిల్వ మరియు భాగస్వామ్య రవాణా కోసం Transport Connect వాడండి.",
        },
    },
}


@router.get("/recommendations", response_model=RecommendationResponse, summary="Get evidence-grounded action recommendations")
async def get_recommendations(
    farm_id: str = Query(..., description="ID of farm"),
    lang: Optional[str] = Query("en", description="Optional UI language code (en, kn, hi, te)")
):
    farm = farm_service.get_farm(farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail=f"Farm '{farm_id}' not found")
    
    weather = await weather_service.get_weather(farm.latitude, farm.longitude)
    result = decision_engine.evaluate_farm(farm, weather)

    norm_lang = (lang or "en").strip().lower()[:2]
    if norm_lang not in {"en", "kn", "hi", "te"}:
        norm_lang = "en"

    result.lang = norm_lang
    if norm_lang != "en":
        lang_map = _CATEGORY_TRANSLATIONS.get(norm_lang, {})
        for rec in result.recommendations:
            loc = lang_map.get(rec.category)
            if loc:
                rec.localized_title = loc["title"]
                rec.localized_action = loc["action"]
                rec.localized_reason = rec.reason
    return result
