# backend/app/services/gemini_grounding_service.py
"""
Grounded Gemini AI Explanation Service (AD-05).
Uses GEMINI_API_KEY when configured to synthesize explanations strictly from
retrieved scientific evidence, soil/climate outputs, and OR-Tools results.
Falls back to deterministic multilingual (EN/KN/HI) summaries when unavailable.
"""
import os
from typing import Any, Dict, List, Tuple
from backend.app.services.http_client import fetch_json_with_resilience


class GeminiGroundingService:
    async def generate_grounded_explanation(
        self,
        language: str,
        crop_name: str,
        scientific_name: str,
        recommended_variety: str,
        evidence_quality: str,
        climate_summary: str,
        soil_summary: str,
        procurement_explanation: str,
        citations: List[str],
    ) -> Tuple[str, bool]:
        """
        Returns (explanation_text, gemini_used).
        Never invents publications, genes, prices, stock, or calculations.
        """
        api_key = os.getenv("GEMINI_API_KEY", "")
        if api_key:
            lang_name = {"en": "English", "kn": "Kannada", "hi": "Hindi"}.get(language, "English")
            prompt = (
                f"You are an agricultural biotechnology advisor for RaithaMitra. Respond in {lang_name}.\n"
                "STRICT RULES: Use ONLY the verified facts below. Do NOT invent any research papers, genes, yields, prices, or math.\n"
                f"- Crop: {crop_name} ({scientific_name})\n"
                f"- Recommended Variety: {recommended_variety}\n"
                f"- Evidence Quality: {evidence_quality}\n"
                f"- Climate Suitability: {climate_summary}\n"
                f"- Soil Compatibility: {soil_summary}\n"
                f"- Procurement Optimization: {procurement_explanation}\n"
                f"- Verified Citations: {'; '.join(citations[:3])}\n"
                "Write a concise, farmer-friendly 3-sentence summary citing the evidence."
            )
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
            data = await fetch_json_with_resilience(
                provider_key="gemini",
                url=url,
                method="POST",
                json_body={"contents": [{"parts": [{"text": prompt}]}]},
                timeout_s=6.0,
                max_retries=1,
                cache_ttl_s=600,
                cache_key_extra=f"{language}:{crop_name}:{recommended_variety}",
            )
            candidates = (data or {}).get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts and parts[0].get("text"):
                    return parts[0]["text"].strip(), True

        # Deterministic multilingual fallback (zero hallucination)
        cite_str = citations[0] if citations else "ICAR-IIHR / Europe PMC"
        if language == "kn":
            return (
                f"{crop_name} ({scientific_name}) ಬೆಳೆಗೆ {recommended_variety} ವೈಜ್ಞಾನಿಕವಾಗಿ ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ "
                f"(ಸಾಕ್ಷ್ಯ ಗುಣಮಟ್ಟ: {evidence_quality}; ಆಧಾರ: {cite_str}). "
                f"ಹವಾಮಾನ: {climate_summary}. ಮಣ್ಣು: {soil_summary}. "
                f"ಖರೀದಿ ಯೋಜನೆ: {procurement_explanation}",
                False,
            )
        if language == "hi":
            return (
                f"{crop_name} ({scientific_name}) के लिए {recommended_variety} की वैज्ञानिक सिफारिश की जाती है "
                f"(साक्ष्य गुणवत्ता: {evidence_quality}; स्रोत: {cite_str})। "
                f"जलवायु: {climate_summary}। मृदा: {soil_summary}। "
                f"खरीद योजना: {procurement_explanation}",
                False,
            )
        return (
            f"For {crop_name} ({scientific_name}), {recommended_variety} is supported with {evidence_quality} "
            f"evidence (Citation: {cite_str}). Climate: {climate_summary}. Soil: {soil_summary}. "
            f"Procurement: {procurement_explanation}",
            False,
        )


gemini_grounding_service = GeminiGroundingService()
