"""
Core Application Service for AD-40C Community Crop Disease Surveillance.

Coordinates:
- Authenticated farm ownership & consent checks
- SQLite report storage & duplicate prevention
- Strict live vs. isolated demonstration mode querying
- Weather integration (live Open-Meteo / safe missing-weather handling)
- Risk assessment, DBSCAN outbreak clustering, geospatial heatmap, & alert lifecycle
"""
import json
import sqlite3
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from backend.app.db.database import get_db_connection
from backend.app.features.agri_assistant.context import resolve_authorized_farm
from backend.app.features.disease_surveillance.alert_engine import (
    generate_or_update_alerts_for_farm,
)
from backend.app.features.disease_surveillance.demo_seed import ensure_demo_surveillance_seed
from backend.app.features.disease_surveillance.disease_knowledge import (
    SUPPORTED_CROPS,
    list_guidance_catalog,
    resolve_disease_profile,
)
from backend.app.features.disease_surveillance.geospatial import (
    build_heatmap_cells,
    haversine_km,
)
from backend.app.features.disease_surveillance.outbreak_detector import detect_outbreak_clusters
from backend.app.features.disease_surveillance.privacy import sanitize_report_for_viewer
from backend.app.features.disease_surveillance.risk_engine import assess_farm_disease_risk
from backend.app.features.disease_surveillance.schemas import (
    DiagnosticPromotionRequest,
    DiseaseReportCreate,
)
from backend.app.services.weather_service import weather_service


def ensure_surveillance_tables_exist() -> None:
    """Idempotent table creation guard for standalone calls & unit tests."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS disease_reports (
                id TEXT PRIMARY KEY,
                farmer_id TEXT NOT NULL,
                farm_id TEXT NOT NULL,
                crop TEXT NOT NULL,
                disease_name TEXT NOT NULL,
                observation_date TEXT NOT NULL,
                affected_area_ha REAL NOT NULL DEFAULT 0.5,
                symptoms_json TEXT NOT NULL DEFAULT '[]',
                notes TEXT,
                diagnostic_confidence REAL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                district TEXT NOT NULL,
                state TEXT NOT NULL DEFAULT 'Karnataka',
                image_reference TEXT,
                verification_status TEXT NOT NULL DEFAULT 'farmer_reported' CHECK(
                    verification_status IN ('farmer_reported', 'ai_suspected', 'expert_confirmed', 'dismissed')
                ),
                data_source TEXT NOT NULL DEFAULT 'manual_farmer_report' CHECK(
                    data_source IN ('manual_farmer_report', 'crop_diagnostics_ai', 'agronomist_verification', 'demonstration_simulation')
                ),
                anonymous_community_consent INTEGER NOT NULL DEFAULT 0,
                is_demonstration INTEGER NOT NULL DEFAULT 0,
                dedupe_fingerprint TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS disease_alerts (
                id TEXT PRIMARY KEY,
                recipient_user_id TEXT NOT NULL,
                farm_id TEXT NOT NULL,
                disease_name TEXT NOT NULL,
                crop TEXT NOT NULL,
                approximate_region TEXT NOT NULL,
                risk_level TEXT NOT NULL CHECK(
                    risk_level IN ('Low', 'Moderate', 'High', 'Critical', 'Insufficient evidence')
                ),
                observation_recency_days INTEGER NOT NULL DEFAULT 0,
                reason TEXT NOT NULL,
                preventive_actions_json TEXT NOT NULL DEFAULT '[]',
                scientific_references_json TEXT NOT NULL DEFAULT '[]',
                followup_inspection TEXT NOT NULL,
                alert_fingerprint TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'unread' CHECK(
                    status IN ('unread', 'read', 'acknowledged', 'dismissed')
                ),
                is_demonstration INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def _hydrate_report_row(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    try:
        d["symptoms"] = json.loads(d.pop("symptoms_json", "[]") or "[]")
    except Exception:
        d["symptoms"] = []
    return d


def _hydrate_alert_row(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    try:
        d["preventive_actions"] = json.loads(d.pop("preventive_actions_json", "[]") or "[]")
    except Exception:
        d["preventive_actions"] = []
    try:
        d["scientific_references"] = json.loads(d.pop("scientific_references_json", "[]") or "[]")
    except Exception:
        d["scientific_references"] = []
    d["is_demonstration"] = bool(d.get("is_demonstration"))
    d["delivery_channel"] = "in_app_only"
    d["delivery_note"] = "In-app surveillance warning only (SMS/WhatsApp not configured)."
    return d


async def _fetch_weather_dict(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    try:
        w = await weather_service.get_weather(lat, lon)
        if not w or not w.current:
            return None
        return {
            "temperature_c": w.current.temperature_c,
            "relative_humidity_pct": w.current.relative_humidity_pct,
            "precipitation_mm": w.current.precipitation_mm,
            "wind_speed_kmh": w.current.wind_speed_kmh,
            "wind_direction_deg": w.current.wind_direction_deg,
            "provenance_quality": w.provenance.quality if w.provenance else "unknown",
            "is_live": bool(w.provenance.is_live) if w.provenance else False,
        }
    except Exception:
        return None


class DiseaseSurveillanceService:
    def create_report(self, user: Dict[str, Any], payload: DiseaseReportCreate) -> Dict[str, Any]:
        ensure_surveillance_tables_exist()
        if user.get("role") not in ("farmer", "admin"):
            raise HTTPException(
                status_code=403,
                detail="Only verified farmer or admin accounts can submit farm disease reports.",
            )

        farm = resolve_authorized_farm(user, payload.farm_id)
        if not farm:
            raise HTTPException(status_code=404, detail=f"Owned farm '{payload.farm_id}' not found.")

        obs_date = (payload.observation_date or datetime.now(timezone.utc).date().isoformat())[:10]
        try:
            date.fromisoformat(obs_date)
        except ValueError:
            raise HTTPException(status_code=422, detail="observation_date must be YYYY-MM-DD.")

        if payload.data_source == "demonstration_simulation":
            raise HTTPException(
                status_code=400,
                detail="Farmers cannot inject demonstration_simulation data via live reporting.",
            )

        lat = float(payload.latitude if payload.latitude is not None else farm["latitude"])
        lon = float(payload.longitude if payload.longitude is not None else farm["longitude"])
        district = (payload.district or farm.get("district") or "Unknown").strip()
        state = (payload.state or farm.get("state") or "Karnataka").strip()

        fp = f"live|{user['id']}|{farm['id']}|{payload.crop.strip().lower()}|{payload.disease_name.strip().lower()}|{obs_date}"
        now = datetime.now(timezone.utc).isoformat()
        report_id = f"rep_{uuid.uuid4().hex[:10]}"

        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            dup = cursor.execute(
                """
                SELECT id FROM disease_reports
                WHERE dedupe_fingerprint = ? AND is_demonstration = 0 AND verification_status != 'dismissed'
                """,
                (fp,),
            ).fetchone()
            if dup:
                raise HTTPException(
                    status_code=409,
                    detail="Duplicate disease report detected for the same farm, crop, disease, and observation date.",
                )

            cursor.execute(
                """
                INSERT INTO disease_reports (
                    id, farmer_id, farm_id, crop, disease_name, observation_date,
                    affected_area_ha, symptoms_json, notes, diagnostic_confidence,
                    latitude, longitude, district, state, image_reference,
                    verification_status, data_source, anonymous_community_consent,
                    is_demonstration, dedupe_fingerprint, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
                """,
                (
                    report_id,
                    user["id"],
                    farm["id"],
                    payload.crop.strip(),
                    payload.disease_name.strip(),
                    obs_date,
                    float(payload.affected_area_ha),
                    json.dumps(payload.symptoms or []),
                    payload.notes,
                    payload.diagnostic_confidence,
                    lat,
                    lon,
                    district,
                    state,
                    payload.image_reference,
                    payload.verification_status,
                    payload.data_source,
                    1 if payload.anonymous_community_consent else 0,
                    fp,
                    now,
                    now,
                ),
            )
            conn.commit()
            created_row = cursor.execute("SELECT * FROM disease_reports WHERE id = ?", (report_id,)).fetchone()
            hydrated = _hydrate_report_row(created_row)
            return sanitize_report_for_viewer(hydrated, user["id"], user.get("role", "farmer"))
        finally:
            conn.close()

    def promote_from_diagnostic(self, user: Dict[str, Any], payload: DiagnosticPromotionRequest) -> Dict[str, Any]:
        req = DiseaseReportCreate(
            farm_id=payload.farm_id,
            crop=payload.crop,
            disease_name=payload.suspected_disease,
            observation_date=payload.observation_date,
            affected_area_ha=payload.affected_area_ha,
            symptoms=payload.symptoms,
            diagnostic_confidence=payload.diagnostic_confidence,
            image_reference=payload.image_reference,
            verification_status="ai_suspected",
            data_source="crop_diagnostics_ai",
            anonymous_community_consent=payload.anonymous_community_consent,
        )
        return self.create_report(user, req)

    def verify_report(self, user: Dict[str, Any], report_id: str, new_status: str, notes: Optional[str] = None) -> Dict[str, Any]:
        ensure_surveillance_tables_exist()
        conn = get_db_connection()
        try:
            row = conn.execute("SELECT * FROM disease_reports WHERE id = ?", (report_id,)).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Disease report not found.")
            if row["is_demonstration"]:
                raise HTTPException(status_code=400, detail="Demonstration seed records cannot be altered.")

            role = user.get("role", "farmer")
            is_owner = row["farmer_id"] == user["id"]
            if new_status == "expert_confirmed" and role != "admin" and not is_owner:
                raise HTTPException(status_code=403, detail="Unauthorized to confirm another farm's report.")
            if not is_owner and role != "admin":
                raise HTTPException(status_code=403, detail="Unauthorized: You can only update your own farm reports.")

            now = datetime.now(timezone.utc).isoformat()
            conn.execute(
                """
                UPDATE disease_reports
                SET verification_status = ?, notes = COALESCE(?, notes), updated_at = ?
                WHERE id = ?
                """,
                (new_status, notes, now, report_id),
            )
            conn.commit()
            updated = conn.execute("SELECT * FROM disease_reports WHERE id = ?", (report_id,)).fetchone()
            return sanitize_report_for_viewer(_hydrate_report_row(updated), user["id"], role)
        finally:
            conn.close()

    def _query_raw_reports(
        self,
        demo_mode: bool = False,
        crop: Optional[str] = None,
        disease: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        community_only: bool = True,
        owner_user_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        ensure_surveillance_tables_exist()
        if demo_mode:
            ensure_demo_surveillance_seed()

        # STRICT ISOLATION: live queries ONLY read is_demonstration = 0; demo ONLY reads is_demonstration = 1
        demo_val = 1 if demo_mode else 0
        clauses = ["is_demonstration = ?", "verification_status != 'dismissed'"]
        params: List[Any] = [demo_val]

        if owner_user_id:
            clauses.append("farmer_id = ?")
            params.append(owner_user_id)
        elif community_only:
            clauses.append("anonymous_community_consent = 1")

        if crop and crop.lower() != "all":
            clauses.append("LOWER(crop) = LOWER(?)")
            params.append(crop.strip())
        if disease and disease.lower() != "all":
            clauses.append("LOWER(disease_name) LIKE ?")
            params.append(f"%{disease.strip().lower()}%")
        if date_from:
            clauses.append("observation_date >= ?")
            params.append(date_from[:10])
        if date_to:
            clauses.append("observation_date <= ?")
            params.append(date_to[:10])

        sql = f"SELECT * FROM disease_reports WHERE {' AND '.join(clauses)} ORDER BY observation_date DESC, created_at DESC"
        conn = get_db_connection()
        try:
            rows = conn.execute(sql, params).fetchall()
            return [_hydrate_report_row(r) for r in rows]
        finally:
            conn.close()

    def get_reports(
        self,
        user: Dict[str, Any],
        farm_id: Optional[str] = None,
        crop: Optional[str] = None,
        disease: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        radius_km: float = 50.0,
        mine_only: bool = False,
        demo_mode: bool = False,
    ) -> Dict[str, Any]:
        farm = None
        if user.get("role") in ("farmer", "admin"):
            farm = resolve_authorized_farm(user, farm_id)

        raw = self._query_raw_reports(
            demo_mode=demo_mode,
            crop=crop,
            disease=disease,
            date_from=date_from,
            date_to=date_to,
            community_only=not mine_only,
            owner_user_id=user["id"] if mine_only else None,
        )

        # Include user's own private (non-consented) live reports if mine_only=False & requesting own farm view?
        # Requirement 3 & 4: Do not publish private reports without consent to community list!
        results: List[Dict[str, Any]] = []
        for r in raw:
            dist = None
            if farm:
                dist = haversine_km(
                    float(farm["latitude"]),
                    float(farm["longitude"]),
                    float(r["latitude"]),
                    float(r["longitude"]),
                )
                if not mine_only and dist > radius_km:
                    continue
            item = sanitize_report_for_viewer(r, user["id"], user.get("role", "farmer"))
            item["distance_km"] = dist
            results.append(item)

        return {
            "mode": "demonstration" if demo_mode else "live",
            "is_demonstration": demo_mode,
            "data_quality": "demonstration" if demo_mode else "community_and_verified",
            "total_reports": len(results),
            "monitoring_radius_km": radius_km,
            "reports": results,
        }

    def get_map_intelligence(
        self,
        user: Dict[str, Any],
        farm_id: Optional[str] = None,
        crop: Optional[str] = None,
        disease: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        radius_km: float = 40.0,
        demo_mode: bool = False,
    ) -> Dict[str, Any]:
        farm = None
        if user.get("role") in ("farmer", "admin"):
            farm = resolve_authorized_farm(user, farm_id)

        raw_community = self._query_raw_reports(
            demo_mode=demo_mode,
            crop=crop,
            disease=disease,
            date_from=date_from,
            date_to=date_to,
            community_only=True,
        )

        nearby_raw = []
        for r in raw_community:
            if farm:
                dist = haversine_km(
                    float(farm["latitude"]),
                    float(farm["longitude"]),
                    float(r["latitude"]),
                    float(r["longitude"]),
                )
                if dist > radius_km:
                    continue
                r = {**r, "_distance_km": dist}
            nearby_raw.append(r)

        markers = []
        for r in nearby_raw:
            sanitized = sanitize_report_for_viewer(r, user["id"], user.get("role", "farmer"))
            sanitized["distance_km"] = r.get("_distance_km")
            markers.append(sanitized)

        # Cluster & heatmap on anonymized community reports
        outbreak_analysis = detect_outbreak_clusters(markers, eps_km=15.0, min_independent_farms=2)
        # Note: pass farm_id from raw into outbreak_detector before anonymizing so single-farm collapse works!
        outbreak_analysis_accurate = detect_outbreak_clusters(
            nearby_raw, eps_km=15.0, min_independent_farms=2
        )
        heatmap_cells = build_heatmap_cells(markers)

        risk_zones = [
            {
                "zone_id": cl["cluster_id"],
                "latitude": cl["centroid_latitude"],
                "longitude": cl["centroid_longitude"],
                "radius_m": round(max(2000.0, cl["cluster_radius_km"] * 1000.0)),
                "severity": "critical" if cl["classification"] == "confirmed_outbreak" else "elevated",
                "label": f"{cl['crop']} · {cl['disease_name']} ({cl['classification'].replace('_', ' ')})",
                "is_demonstration": cl["is_demonstration"],
            }
            for cl in outbreak_analysis_accurate["clusters"]
        ]

        center = (
            {"latitude": float(farm["latitude"]), "longitude": float(farm["longitude"]), "label": farm["farm_name"]}
            if farm
            else {"latitude": 12.5234, "longitude": 76.8976, "label": "Mandya Regional Center"}
        )

        return {
            "mode": "demonstration" if demo_mode else "live",
            "is_demonstration": demo_mode,
            "center": center,
            "monitoring_radius_km": radius_km,
            "markers": markers,
            "heatmap_cells": heatmap_cells,
            "outbreak_clusters": outbreak_analysis_accurate["clusters"],
            "risk_zones": risk_zones,
            "district_summaries": outbreak_analysis_accurate["district_summaries"],
            "daily_trend_14d": outbreak_analysis_accurate["daily_trend_14d"],
            "privacy_notice": (
                "Community coordinates are coarsened (~1.5 km grid + deterministic offset) and "
                "farmer identities are hidden unless viewing your own report."
            ),
        }

    async def get_farm_risk_and_sync_alerts(
        self,
        user: Dict[str, Any],
        farm_id: Optional[str] = None,
        radius_km: float = 25.0,
        focus_disease: Optional[str] = None,
        crop_override: Optional[str] = None,
        demo_mode: bool = False,
        weather_override: Optional[Dict[str, Any]] = None,
        sync_alerts: bool = True,
    ) -> Dict[str, Any]:
        farm = resolve_authorized_farm(user, farm_id)
        if not farm:
            raise HTTPException(status_code=404, detail="No authorized farm found for risk evaluation.")

        # Risk model evaluates anonymized community reports + owner's own private farm reports
        community_rows = self._query_raw_reports(demo_mode=demo_mode, community_only=True)
        own_rows = self._query_raw_reports(
            demo_mode=demo_mode, community_only=False, owner_user_id=user["id"]
        )
        seen_ids = set()
        merged_rows = []
        for r in own_rows + community_rows:
            if r["id"] not in seen_ids:
                seen_ids.add(r["id"])
                merged_rows.append(r)

        weather_dict = (
            weather_override
            if weather_override is not None
            else await _fetch_weather_dict(float(farm["latitude"]), float(farm["longitude"]))
        )

        target_crop = (crop_override or farm.get("primary_crop") or "Tomato").strip()
        assessment = assess_farm_disease_risk(
            target_lat=float(farm["latitude"]),
            target_lon=float(farm["longitude"]),
            target_crop=target_crop,
            crop_stage=farm.get("crop_stage", "Mid-Season"),
            reports=merged_rows,
            weather=weather_dict,
            monitoring_radius_km=radius_km,
            focus_disease=focus_disease,
        )

        generated_alerts: List[Dict[str, Any]] = []
        if sync_alerts and user.get("role") in ("farmer", "admin"):
            generated_alerts = generate_or_update_alerts_for_farm(
                recipient_user_id=user["id"],
                farm=farm,
                risk_assessment=assessment,
                is_demonstration=demo_mode,
            )

        return {
            "farm": {
                "id": farm["id"],
                "farm_name": farm["farm_name"],
                "district": farm.get("district"),
                "state": farm.get("state"),
                "primary_crop": target_crop,
                "crop_stage": farm.get("crop_stage"),
            },
            "mode": "demonstration" if demo_mode else "live",
            "is_demonstration": demo_mode,
            "risk_assessment": assessment,
            "alerts_synced_count": len(generated_alerts),
        }

    def get_alerts(self, user: Dict[str, Any], demo_mode: bool = False, include_dismissed: bool = False) -> Dict[str, Any]:
        ensure_surveillance_tables_exist()
        demo_val = 1 if demo_mode else 0
        clauses = ["recipient_user_id = ?", "is_demonstration = ?"]
        params: List[Any] = [user["id"], demo_val]
        if not include_dismissed:
            clauses.append("status != 'dismissed'")
        sql = f"SELECT * FROM disease_alerts WHERE {' AND '.join(clauses)} ORDER BY updated_at DESC"
        conn = get_db_connection()
        try:
            rows = conn.execute(sql, params).fetchall()
            alerts = [_hydrate_alert_row(r) for r in rows]
            unread = sum(1 for a in alerts if a["status"] == "unread")
            return {
                "mode": "demonstration" if demo_mode else "live",
                "is_demonstration": demo_mode,
                "unread_count": unread,
                "alerts": alerts,
            }
        finally:
            conn.close()

    def update_alert_status(self, user: Dict[str, Any], alert_id: str, new_status: str) -> Dict[str, Any]:
        ensure_surveillance_tables_exist()
        conn = get_db_connection()
        try:
            row = conn.execute("SELECT * FROM disease_alerts WHERE id = ?", (alert_id,)).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Alert not found.")
            if row["recipient_user_id"] != user["id"] and user.get("role") != "admin":
                raise HTTPException(status_code=403, detail="Unauthorized: alert belongs to another user.")
            now = datetime.now(timezone.utc).isoformat()
            conn.execute(
                "UPDATE disease_alerts SET status = ?, updated_at = ? WHERE id = ?",
                (new_status, now, alert_id),
            )
            conn.commit()
            updated = conn.execute("SELECT * FROM disease_alerts WHERE id = ?", (alert_id,)).fetchone()
            return _hydrate_alert_row(updated)
        finally:
            conn.close()

    def get_outbreak_summary(self, demo_mode: bool = False, crop: Optional[str] = None) -> Dict[str, Any]:
        raw = self._query_raw_reports(demo_mode=demo_mode, crop=crop, community_only=True)
        outbreaks = detect_outbreak_clusters(raw)
        return {
            "mode": "demonstration" if demo_mode else "live",
            "is_demonstration": demo_mode,
            "total_community_reports": len(raw),
            **outbreaks,
        }

    def get_guidance(self, crop: Optional[str] = None, disease_name: Optional[str] = None) -> Dict[str, Any]:
        if disease_name:
            prof, known = resolve_disease_profile(crop, disease_name)
            return {
                "matched": known,
                "supported_crops": SUPPORTED_CROPS,
                "guidance": [prof],
                "safety_note": (
                    "Recommendations prioritize cultural hygiene, drip management, resistant cultivars, "
                    "and vector monitoring. Consult a local KVK agronomist before chemical spraying."
                ),
            }
        items = list_guidance_catalog(crop)
        return {
            "matched": len(items) > 0,
            "supported_crops": SUPPORTED_CROPS,
            "guidance": items,
            "safety_note": (
                "Recommendations prioritize cultural hygiene, drip management, resistant cultivars, "
                "and vector monitoring. Consult a local KVK agronomist before chemical spraying."
            ),
        }


surveillance_service = DiseaseSurveillanceService()
