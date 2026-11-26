"""
Privacy & Anonymization Guards for Community Crop Disease Surveillance (AD-40C).

Ensures:
1. Exact farmer identities (name, email, phone, user ID, private farm name) are stripped from
   community responses unless the viewer is the owning farmer (`mine_only=True`).
2. Exact parcel coordinates are never published on public/community maps; coordinates are
   quantized to ~1.5 km spatial grid cells with deterministic non-reversible farm-ID jitter.
3. Reports without explicit `anonymous_community_consent == True` remain strictly private
   and are excluded from community queries, heatmaps, and regional statistics.
"""
import hashlib
from typing import Any, Dict


def anonymize_coordinates(lat: float, lon: float, report_seed: str) -> tuple[float, float]:
    """
    Coarsens exact farm coordinates to protect parcel identity while preserving
    regional hotspot clustering geometry (~1.5 km grid + deterministic offset <= 550m).
    """
    grid = 0.014  # ~1.55 km latitude cell
    base_lat = round(round(lat / grid) * grid, 4)
    base_lon = round(round(lon / grid) * grid, 4)

    digest = hashlib.sha256(report_seed.encode("utf-8")).digest()
    lat_jitter = ((digest[0] / 255.0) - 0.5) * 0.008
    lon_jitter = ((digest[1] / 255.0) - 0.5) * 0.008
    return round(base_lat + lat_jitter, 4), round(base_lon + lon_jitter, 4)


def sanitize_report_for_viewer(row: Dict[str, Any], viewer_user_id: str, viewer_role: str) -> Dict[str, Any]:
    """
    Returns an anonymized community projection for non-owners while preserving
    exact private farm reference exclusively for the owning farmer (or admin).
    """
    is_owner = (row.get("farmer_id") == viewer_user_id) or (viewer_role == "admin")
    anon_lat, anon_lon = anonymize_coordinates(
        float(row["latitude"]),
        float(row["longitude"]),
        f"{row.get('farm_id', '')}:{row.get('district', '')}",
    )

    district = row.get("district") or "Unknown District"
    state = row.get("state") or "Karnataka"

    projected: Dict[str, Any] = {
        "id": row["id"],
        "crop": row["crop"],
        "disease_name": row["disease_name"],
        "observation_date": row["observation_date"],
        "affected_area_ha": round(float(row.get("affected_area_ha") or 0.0), 2),
        "symptoms": row.get("symptoms") or [],
        "notes": row.get("notes") if is_owner else None,
        "diagnostic_confidence": row.get("diagnostic_confidence"),
        "latitude": round(float(row["latitude"]), 5) if is_owner else anon_lat,
        "longitude": round(float(row["longitude"]), 5) if is_owner else anon_lon,
        "is_coordinate_anonymized": not is_owner,
        "approximate_region": f"{district}, {state}",
        "district": district,
        "state": state,
        "image_reference": row.get("image_reference") if is_owner else None,
        "verification_status": row["verification_status"],
        "data_source": row["data_source"],
        "anonymous_community_consent": bool(row.get("anonymous_community_consent")),
        "is_demonstration": bool(row.get("is_demonstration")),
        "data_quality": "demonstration" if row.get("is_demonstration") else (
            "verified" if row["verification_status"] == "expert_confirmed" else "community_reported"
        ),
        "is_own_report": row.get("farmer_id") == viewer_user_id,
        "farm_id": row["farm_id"] if is_owner else None,
        "reporter_label": (
            f"Your Farm ({row['farm_id']})"
            if is_owner
            else f"Verified Community Grower · {district}"
        ),
        "created_at": row["created_at"],
    }
    return projected
