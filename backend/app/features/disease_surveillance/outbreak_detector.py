"""
Outbreak & Regional Hotspot Detection Engine for AD-40C.

Uses Haversine-metric DBSCAN spatial clustering grouped by (crop, disease_name) AFTER
deduplicating multiple reports from the same farm_id within the temporal window so repeated
submissions from one parcel never falsely trigger a regional outbreak.
"""
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from backend.app.features.disease_surveillance.disease_knowledge import resolve_disease_profile
from backend.app.features.disease_surveillance.geospatial import haversine_km
from backend.app.features.disease_surveillance.privacy import anonymize_coordinates


def _parse_date(date_str: str) -> date:
    try:
        return date.fromisoformat(str(date_str)[:10])
    except Exception:
        return datetime.now(timezone.utc).date()


def _dbscan_haversine(points: List[Dict[str, Any]], eps_km: float, min_samples: int) -> List[List[int]]:
    """
    Pure-Python deterministic DBSCAN clustering using Haversine distance.
    Returns list of clusters (each a list of indices into `points`).
    """
    n = len(points)
    if n < min_samples:
        return []

    visited = [False] * n
    assigned = [False] * n
    clusters: List[List[int]] = []

    def region_query(idx: int) -> List[int]:
        p1 = points[idx]
        neighbors = []
        for j in range(n):
            d = haversine_km(
                float(p1["latitude"]),
                float(p1["longitude"]),
                float(points[j]["latitude"]),
                float(points[j]["longitude"]),
            )
            if d <= eps_km:
                neighbors.append(j)
        return neighbors

    for i in range(n):
        if visited[i]:
            continue
        visited[i] = True
        neighbors = region_query(i)
        if len(neighbors) < min_samples:
            continue

        cluster: List[int] = []
        queue = list(neighbors)
        idx_pos = 0
        while idx_pos < len(queue):
            q = queue[idx_pos]
            idx_pos += 1
            if not visited[q]:
                visited[q] = True
                q_neighbors = region_query(q)
                if len(q_neighbors) >= min_samples:
                    for nb in q_neighbors:
                        if nb not in queue:
                            queue.append(nb)
            if not assigned[q]:
                assigned[q] = True
                cluster.append(q)
        if len(cluster) >= min_samples:
            clusters.append(cluster)

    return clusters


def detect_outbreak_clusters(
    reports: List[Dict[str, Any]],
    eps_km: float = 15.0,
    min_independent_farms: int = 2,
    window_days: int = 30,
    reference_date: Optional[date] = None,
) -> Dict[str, Any]:
    """
    Detects suspected clusters vs confirmed outbreaks across regional observations.

    Rules:
    - Ignores dismissed reports.
    - Enforces temporal window (`window_days`).
    - Collapses repeated reports from the same `farm_id` for the same `(crop, disease_name)`
      before clustering so one farm cannot trigger a regional outbreak alone.
    - `confirmed_outbreak`: >= 3 independent farms AND (>= 1 expert_confirmed report OR >= 4 farms with AI/expert verification).
    - `suspected_cluster`: >= 2 independent farms clustered within `eps_km`.
    """
    today = reference_date or datetime.now(timezone.utc).date()
    cutoff = today - timedelta(days=window_days)

    active = [
        r
        for r in reports
        if r.get("verification_status") != "dismissed" and _parse_date(r["observation_date"]) >= cutoff
    ]

    # Group by (crop, disease_name)
    grouped: Dict[Tuple[str, str], List[Dict[str, Any]]] = {}
    for r in active:
        key = (r["crop"].strip(), r["disease_name"].strip())
        grouped.setdefault(key, []).append(r)

    detected_clusters: List[Dict[str, Any]] = []
    for (crop_name, disease_name), items in grouped.items():
        # Collapse by unique farm_id to prevent single-farm spam inflation
        by_farm: Dict[str, Dict[str, Any]] = {}
        farm_report_counts: Dict[str, int] = {}
        for it in items:
            fid = it.get("farm_id") or it["id"]
            farm_report_counts[fid] = farm_report_counts.get(fid, 0) + 1
            existing = by_farm.get(fid)
            if not existing:
                by_farm[fid] = it
            else:
                # Prefer expert_confirmed > ai_suspected > most recent
                rank = {"expert_confirmed": 3, "ai_suspected": 2, "farmer_reported": 1}
                if rank.get(it["verification_status"], 0) > rank.get(existing["verification_status"], 0):
                    by_farm[fid] = it

        unique_farm_points = list(by_farm.values())
        clusters_idx = _dbscan_haversine(unique_farm_points, eps_km=eps_km, min_samples=min_independent_farms)

        profile, _ = resolve_disease_profile(crop_name, disease_name)

        for c_num, indices in enumerate(clusters_idx, start=1):
            cluster_farms = [unique_farm_points[idx] for idx in indices]
            cluster_farm_ids = {f.get("farm_id") or f["id"] for f in cluster_farms}
            all_cluster_reports = [
                r for r in items if (r.get("farm_id") or r["id"]) in cluster_farm_ids
            ]

            avg_lat = sum(float(p["latitude"]) for p in cluster_farms) / len(cluster_farms)
            avg_lon = sum(float(p["longitude"]) for p in cluster_farms) / len(cluster_farms)
            centroid_lat, centroid_lon = anonymize_coordinates(
                avg_lat, avg_lon, f"cluster:{crop_name}:{disease_name}:{c_num}"
            )

            radius_km = max(
                (
                    haversine_km(avg_lat, avg_lon, float(p["latitude"]), float(p["longitude"]))
                    for p in cluster_farms
                ),
                default=1.5,
            )

            confirmed_reports = sum(
                1 for r in all_cluster_reports if r.get("verification_status") == "expert_confirmed"
            )
            ai_reports = sum(
                1 for r in all_cluster_reports if r.get("verification_status") == "ai_suspected"
            )

            # Temporal acceleration: last 7 days vs previous 7 days
            recent_7 = sum(
                1 for r in all_cluster_reports if (today - _parse_date(r["observation_date"])).days <= 7
            )
            prev_7 = sum(
                1
                for r in all_cluster_reports
                if 7 < (today - _parse_date(r["observation_date"])).days <= 14
            )
            if prev_7 > 0:
                trend_pct = round(((recent_7 - prev_7) / prev_7) * 100.0, 1)
            elif recent_7 > 0:
                trend_pct = 100.0
            else:
                trend_pct = 0.0

            indep_count = len(cluster_farm_ids)
            if indep_count >= 3 and (confirmed_reports >= 1 or (ai_reports >= 2 and indep_count >= 4)):
                classification = "confirmed_outbreak"
            else:
                classification = "suspected_cluster"

            districts = sorted({r.get("district") or "Region" for r in all_cluster_reports})
            detected_clusters.append(
                {
                    "cluster_id": f"cl_{crop_name.lower().replace(' ', '_')}_{c_num}_{len(detected_clusters)+1}",
                    "crop": crop_name,
                    "disease_name": disease_name,
                    "classification": classification,
                    "independent_farms_count": indep_count,
                    "total_reports_count": len(all_cluster_reports),
                    "expert_confirmed_count": confirmed_reports,
                    "ai_suspected_count": ai_reports,
                    "centroid_latitude": centroid_lat,
                    "centroid_longitude": centroid_lon,
                    "cluster_radius_km": round(max(1.5, radius_km), 2),
                    "districts": districts,
                    "approximate_region": ", ".join(districts),
                    "recent_7d_reports": recent_7,
                    "prior_7d_reports": prev_7,
                    "activity_trend_pct": trend_pct,
                    "transmission_mode": profile.get("transmission_mode", "unknown"),
                    "is_demonstration": any(bool(r.get("is_demonstration")) for r in all_cluster_reports),
                }
            )

    detected_clusters.sort(
        key=lambda c: (
            1 if c["classification"] == "confirmed_outbreak" else 0,
            c["independent_farms_count"],
            c["total_reports_count"],
        ),
        reverse=True,
    )

    # 14-day daily trend series
    daily_trend: List[Dict[str, Any]] = []
    for offset in range(13, -1, -1):
        d = today - timedelta(days=offset)
        d_str = d.isoformat()
        count = sum(1 for r in active if str(r["observation_date"])[:10] == d_str)
        daily_trend.append({"date": d_str, "reports": count})

    # District summary table
    by_district: Dict[str, Dict[str, Any]] = {}
    for r in active:
        dist_name = r.get("district") or "Unknown"
        entry = by_district.setdefault(
            dist_name,
            {
                "district": dist_name,
                "report_count": 0,
                "independent_farms": set(),
                "expert_confirmed": 0,
                "ai_suspected": 0,
                "farmer_reported": 0,
                "crops": set(),
                "top_diseases": {},
            },
        )
        entry["report_count"] += 1
        entry["independent_farms"].add(r.get("farm_id") or r["id"])
        vs = r.get("verification_status", "farmer_reported")
        if vs in entry:
            entry[vs] += 1
        entry["crops"].add(r["crop"])
        entry["top_diseases"][r["disease_name"]] = entry["top_diseases"].get(r["disease_name"], 0) + 1

    district_summaries = []
    for entry in by_district.values():
        top_dis = max(entry["top_diseases"].items(), key=lambda kv: kv[1])[0] if entry["top_diseases"] else None
        district_summaries.append(
            {
                "district": entry["district"],
                "report_count": entry["report_count"],
                "independent_farms_count": len(entry["independent_farms"]),
                "expert_confirmed_count": entry["expert_confirmed"],
                "ai_suspected_count": entry["ai_suspected"],
                "farmer_reported_count": entry["farmer_reported"],
                "crops": sorted(entry["crops"]),
                "leading_disease": top_dis,
            }
        )
    district_summaries.sort(key=lambda x: x["report_count"], reverse=True)

    return {
        "clusters": detected_clusters,
        "daily_trend_14d": daily_trend,
        "district_summaries": district_summaries,
        "algorithm": "Haversine-DBSCAN deduplicated per independent farm_id",
        "window_days": window_days,
        "eps_km": eps_km,
    }
