# backend/app/services/evidence_validation_service.py
"""
Scientific Evidence Validation & Inventory Freshness Engine (AD-05).
Assigns data classifications, evaluates evidence quality (Strong/Moderate/Limited/Insufficient),
resolves source conflicts deterministically, and enforces inventory freshness rules.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from backend.app.schemas.biointel_advanced import (
    EvidenceRecord,
    EvidenceQualityType,
)


def evaluate_inventory_freshness(
    price_per_unit: Optional[float],
    available_quantity: Optional[int],
    last_updated_iso: Optional[str],
    max_age_days: int = 30,
) -> Tuple[bool, str, str]:
    """
    Applies Section 15 freshness and completeness rules:
    - Missing pricing -> 'Contact Supplier'
    - Missing inventory -> 'Availability Unknown'
    - Expired inventory (> max_age_days) -> 'Confirmation Required'
    Returns: (is_optimizable, stock_label, price_label)
    """
    price_label = f"₹{price_per_unit:.2f}" if price_per_unit is not None else "Contact Supplier"

    if available_quantity is None:
        return False, "Availability Unknown", price_label

    if available_quantity <= 0:
        return False, "Out of Stock", price_label

    if last_updated_iso:
        try:
            dt = datetime.fromisoformat(last_updated_iso.replace("Z", "+00:00"))
            age_days = (datetime.now(timezone.utc) - dt).days
            if age_days > max_age_days:
                return False, "Confirmation Required (Expired)", price_label
        except ValueError:
            pass

    if price_per_unit is None:
        return False, f"In Stock ({available_quantity:,})", "Contact Supplier"

    return True, f"Confirmed ({available_quantity:,})", price_label


class EvidenceValidationService:
    def validate_and_resolve(
        self,
        crop_name: str,
        scientific_name: str,
        research_papers: List[Dict[str, Any]],
        indian_evidence: List[Any],
        soil_data: Dict[str, Any],
        has_genetic_evidence: bool,
    ) -> Dict[str, Any]:
        records: List[EvidenceRecord] = []
        contradictions: List[str] = []
        now_iso = datetime.now(timezone.utc).isoformat()

        # 1. Indian official evidence (prioritized local validation)
        for idx, ind in enumerate(indian_evidence):
            records.append(EvidenceRecord(
                record_id=f"ind_{idx + 1}",
                title=f"{ind.commercial_variety} ({ind.institution})",
                source_provider=ind.institution,
                source_url_or_id=ind.evidence_url,
                retrieval_timestamp=now_iso,
                publication_or_observation_date=ind.publication_date,
                geographic_applicability=", ".join(ind.recommended_regions),
                crop_or_species_id=scientific_name,
                cultivar_id=ind.commercial_variety,
                data_classification="Official documented information",
                evidence_quality="Strong",
                known_limitations="Cultivar performance depends on certified seed/seedling purity and local agronomy.",
                publication_type="official_release",
            ))

        # 2. Peer-reviewed research papers
        field_trials = 0
        lab_studies = 0
        for idx, p in enumerate(research_papers[:6]):
            pub_type = p.get("publication_type", "lab_experiment")
            if pub_type in ("field_trial", "review_article"):
                field_trials += 1
                qual: EvidenceQualityType = "Strong" if p.get("is_live") else "Moderate"
            else:
                lab_studies += 1
                qual = "Limited"

            records.append(EvidenceRecord(
                record_id=f"lit_{idx + 1}",
                title=p.get("title", "Research Article"),
                source_provider="Europe PMC",
                source_url_or_id=p.get("doi") or p.get("source_url") or "Europe PMC",
                retrieval_timestamp=now_iso,
                publication_or_observation_date=str(p.get("pub_year") or ""),
                geographic_applicability="Multi-region peer-reviewed study",
                crop_or_species_id=scientific_name,
                data_classification="Scientific research evidence" if p.get("is_live") else "Cached data",
                evidence_quality=qual,
                known_limitations=(
                    "Laboratory/preprint experiment — requires field validation before commercial recommendation."
                    if pub_type in ("lab_experiment", "preprint")
                    else "Peer-reviewed field trial; local micro-climate adaptation still applies."
                ),
                publication_type=pub_type,
            ))

        # 3. Conflict resolution: Measured soil vs modeled SoilGrids
        soil_status = soil_data.get("nutrient_status", {})
        lab_ph = (soil_status.get("soil_ph") or {}).get("value")
        sg_ref = soil_data.get("soilgrids_modeled_reference") or {}
        sg_ph = sg_ref.get("modeled_ph")
        if lab_ph is not None and sg_ph is not None and abs(lab_ph - sg_ph) >= 0.8:
            contradictions.append(
                f"Soil pH discrepancy: Measured lab pH ({lab_ph}) differs from SoilGrids 250m estimate ({sg_ph}). "
                "Resolution: Prioritizing verified laboratory measurement over global modeled estimate."
            )

        # 4. Overall evidence quality classification (documented rules, no arbitrary %)
        if len(indian_evidence) > 0 and field_trials > 0:
            overall_quality: EvidenceQualityType = "Strong"
        elif len(indian_evidence) > 0 or field_trials > 0 or has_genetic_evidence:
            overall_quality = "Moderate"
        elif lab_studies > 0:
            overall_quality = "Limited"
        else:
            overall_quality = "Insufficient"

        return {
            "overall_evidence_quality": overall_quality,
            "classification_rule": (
                "Strong = Official Indian cultivar release + peer-reviewed field trial/review; "
                "Moderate = Official release OR field trial OR NCBI genetic support; "
                "Limited = Lab/preprint studies only; Insufficient = No verified evidence."
            ),
            "field_trials_count": field_trials,
            "lab_experiments_count": lab_studies,
            "indian_official_releases_count": len(indian_evidence),
            "unresolved_contradictions": contradictions,
            "validated_records": [r.model_dump() for r in records],
        }


evidence_validation_service = EvidenceValidationService()
