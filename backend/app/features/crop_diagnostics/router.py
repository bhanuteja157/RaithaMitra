# backend/app/features/crop_diagnostics/router.py
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel

from backend.app.db.database import get_db_connection
from backend.app.features.auth.router import get_current_user
from backend.app.features.auth.security import validate_image_upload, verify_farm_ownership_row
from backend.app.features.crop_diagnostics.disease_knowledge import get_disease_knowledge
from backend.app.features.crop_diagnostics.model_registry import check_model_availability
from backend.app.features.crop_diagnostics.service import (
    analyze_multiple_images,
    analyze_single_image,
    get_surveillance_summary,
    get_user_diagnostic_history,
    submit_surveillance_report,
)

router = APIRouter(prefix="/crop-diagnostics", tags=["AI Crop Doctor (AD-22)"])

_DIAG_LOCALIZED_LABELS = {
    "en": {
        "healthy_note": "Leaf sample looks healthy. Continue routine weekly scouting.",
        "disease_note": "Follow ICAR/KVK integrated disease management guidance and consult your local officer before chemical application.",
        "inconclusive_note": "Diagnosis uncertain. Re-capture in bright daylight with the diseased leaf centered cleanly.",
    },
    "kn": {
        "healthy_note": "ಎಲೆ ಮಾದರಿ ಆರೋಗ್ಯಕರವಾಗಿ ಕಾಣುತ್ತಿದೆ. ವಾರಕ್ಕೊಮ್ಮೆ ನಿಯಮಿತ ಪರಿಶೀಲನೆ ಮುಂದುವರಿಸಿ.",
        "disease_note": "ICAR/KVK ಸಮಗ್ರ ರೋಗ ನಿರ್ವಹಣಾ ಮಾರ್ಗಸೂಚಿಗಳನ್ನು ಅನುಸರಿಸಿ ಮತ್ತು ಸಿಂಪಡಿಸುವ ಮುನ್ನ ಕೃಷಿ ಅಧಿಕಾರಿಯನ್ನು ಸಂಪರ್ಕಿಸಿ.",
        "inconclusive_note": "ರೋಗನಿರ್ಣಯ ಅನಿಶ್ಚಿತವಾಗಿದೆ. ಹಗಲು ಬೆಳಕಿನಲ್ಲಿ ಎಲೆಯನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ಕೇಂದ್ರೀಕರಿಸಿ ಮತ್ತೆ ಫೋಟೋ ತೆಗೆಯಿರಿ.",
    },
    "hi": {
        "healthy_note": "पत्ती का नमूना स्वस्थ दिखता है। साप्ताहिक नियमित निगरानी जारी रखें।",
        "disease_note": "ICAR/KVK समेकित रोग प्रबंधन का पालन करें और किसी भी छिड़काव से पहले स्थानीय कृषि अधिकारी से सलाह लें।",
        "inconclusive_note": "निदान अनिश्चित है। दिन की रोशनी में प्रभावित पत्ती को स्पष्ट फोकस कर दोबारा फोटो लें।",
    },
    "te": {
        "healthy_note": "ఆకు నమూనా ఆరోగ్యంగా కనిపిస్తోంది. వారానికి ఒకసారి పొలంలో పరిశీలన కొనసాగించండి.",
        "disease_note": "ICAR/KVK సమగ్ర వ్యాధి నిర్వహణ సూచనలు పాటించండి మరియు పిచికారీ చేసే ముందు స్థానిక వ్యవసాయ అధికారిని సంప్రదించండి.",
        "inconclusive_note": "నిర్ధారణ స్పష్టంగా లేదు. పగటి వెలుతురులో ప్రభావిత ఆకును స్పష్టంగా ఫోకస్ చేసి మళ్ళీ ఫోటో తీయండి.",
    },
}


def _attach_localized_summary(payload: dict, lang: str) -> dict:
    norm_lang = (lang or "en").strip().lower()[:2]
    if norm_lang not in _DIAG_LOCALIZED_LABELS:
        norm_lang = "en"
    copy = dict(payload)
    labels = _DIAG_LOCALIZED_LABELS[norm_lang]
    if copy.get("is_healthy") is True:
        advisory_note = labels["healthy_note"]
    elif copy.get("predicted_disease"):
        advisory_note = labels["disease_note"]
    else:
        advisory_note = labels["inconclusive_note"]
    copy["lang"] = norm_lang
    copy["localized_summary"] = {
        "lang": norm_lang,
        "advisory_note": advisory_note,
    }
    return copy


class SurveillanceReportRequest(BaseModel):
    crop: str
    suspected_disease: str
    region: str
    confidence: Optional[float] = None
    user_confirmed: bool


@router.get("/status")
def get_status():
    return check_model_availability()


@router.get("/supported-crops")
def get_supported_crops():
    avail = check_model_availability()
    return {
        "model_name": avail.get("model_name"),
        "model_version": avail.get("model_version"),
        "supported_crops": avail.get("supported_crops", []),
        "supported_classes": avail.get("supported_classes", []),
    }


@router.get("/knowledge")
def get_knowledge(crop: str = Query(...), disease: str = Query(...), lang: str = Query("en")):
    is_healthy = disease.strip().lower().startswith("healthy")
    data = get_disease_knowledge(crop, disease, is_healthy)
    norm_lang = (lang or "en").strip().lower()[:2]
    if norm_lang not in _DIAG_LOCALIZED_LABELS:
        norm_lang = "en"
    if isinstance(data, dict):
        data = dict(data)
        data["lang"] = norm_lang
        data["localized_summary"] = {
            "lang": norm_lang,
            "advisory_note": _DIAG_LOCALIZED_LABELS[norm_lang]["healthy_note" if is_healthy else "disease_note"],
        }
    return data


@router.post("/analyze")
async def analyze_image(
    crop: str = Form(default="auto"),
    farm_id: Optional[str] = Form(default=None),
    temperature_c: Optional[float] = Form(default=None),
    humidity_pct: Optional[float] = Form(default=None),
    rainfall_mm: Optional[float] = Form(default=None),
    lang: str = Form(default="en"),
    file: UploadFile = File(...),
):
    content = await file.read()
    validate_image_upload(file.filename or "leaf.jpg", file.content_type, content)
    res = analyze_single_image(
        filename=file.filename or "leaf.jpg",
        content_type=file.content_type,
        image_bytes=content,
        crop=crop,
        farm_id=farm_id,
        temperature_c=temperature_c,
        humidity_pct=humidity_pct,
        rainfall_mm=rainfall_mm,
        persist_history=False,
    )
    return _attach_localized_summary(res, lang)


@router.post("/analyze-authenticated")
async def analyze_image_authenticated(
    crop: str = Form(default="auto"),
    farm_id: Optional[str] = Form(default=None),
    temperature_c: Optional[float] = Form(default=None),
    humidity_pct: Optional[float] = Form(default=None),
    rainfall_mm: Optional[float] = Form(default=None),
    lang: str = Form(default="en"),
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    if farm_id:
        conn = get_db_connection()
        try:
            verify_farm_ownership_row(conn.cursor(), farm_id, current_user["id"], current_user["role"])
        finally:
            conn.close()
    content = await file.read()
    validate_image_upload(file.filename or "leaf.jpg", file.content_type, content)
    res = analyze_single_image(
        filename=file.filename or "leaf.jpg",
        content_type=file.content_type,
        image_bytes=content,
        crop=crop,
        farm_id=farm_id,
        user_id=current_user["id"],
        temperature_c=temperature_c,
        humidity_pct=humidity_pct,
        rainfall_mm=rainfall_mm,
        persist_history=True,
    )
    return _attach_localized_summary(res, lang)


@router.post("/analyze-multi")
async def analyze_multi(
    crop: str = Form(default="auto"),
    farm_id: Optional[str] = Form(default=None),
    temperature_c: Optional[float] = Form(default=None),
    humidity_pct: Optional[float] = Form(default=None),
    rainfall_mm: Optional[float] = Form(default=None),
    lang: str = Form(default="en"),
    files: List[UploadFile] = File(...),
    current_user=Depends(get_current_user),
):
    if farm_id:
        conn = get_db_connection()
        try:
            verify_farm_ownership_row(conn.cursor(), farm_id, current_user["id"], current_user["role"])
        finally:
            conn.close()
    if len(files) == 0 or len(files) > 3:
        raise HTTPException(status_code=400, detail="Upload between 1 and 3 leaf images per session.")
    loaded = []
    for f in files:
        raw_bytes = await f.read()
        validate_image_upload(f.filename or "leaf.jpg", f.content_type, raw_bytes)
        loaded.append(
            {
                "filename": f.filename or "leaf.jpg",
                "content_type": f.content_type,
                "bytes": raw_bytes,
            }
        )
    res = analyze_multiple_images(
        files=loaded,
        crop=crop,
        farm_id=farm_id,
        user_id=current_user["id"],
        temperature_c=temperature_c,
        humidity_pct=humidity_pct,
        rainfall_mm=rainfall_mm,
    )
    if isinstance(res, dict) and isinstance(res.get("primary_result"), dict):
        res = dict(res)
        res["lang"] = (lang or "en").strip().lower()[:2]
        res["primary_result"] = _attach_localized_summary(res["primary_result"], lang)
    return res


@router.get("/history")
def get_history(limit: int = Query(default=20, ge=1, le=100), current_user=Depends(get_current_user)):
    return {"items": get_user_diagnostic_history(current_user["id"], limit=limit)}


@router.post("/surveillance/report")
def report_surveillance(req: SurveillanceReportRequest, current_user=Depends(get_current_user)):
    try:
        return submit_surveillance_report(
            user_id=current_user["id"],
            crop=req.crop,
            suspected_disease=req.suspected_disease,
            region=req.region,
            confidence=req.confidence,
            user_confirmed=req.user_confirmed,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/surveillance/summary")
def surveillance_summary():
    return {"reports": get_surveillance_summary()}
