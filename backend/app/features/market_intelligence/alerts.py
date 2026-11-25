"""
AD-29: User-Scoped In-App Market Price Targets & Alerts.
Evaluates configured price thresholds against persisted observations.
Does NOT claim push notifications, SMS alerts, or background polling.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

from backend.app.db.database import get_db_connection
from backend.app.features.market_intelligence.normalization import normalize_commodity_name
from backend.app.features.market_intelligence.schemas import MarketAlertPreferenceCreate


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_alert_preference(user_id: str, payload: MarketAlertPreferenceCreate) -> Dict[str, Any]:
    now_iso = _now_iso()
    pref_id = f"malp_{uuid.uuid4().hex[:10]}"
    comm = normalize_commodity_name(payload.commodity)
    conn = get_db_connection()
    try:
        conn.execute(
            """
            INSERT INTO market_alert_preferences (
                id, user_id, commodity, preferred_market, target_price_per_kg,
                max_transport_cost_inr, min_net_return_inr, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            """,
            (
                pref_id,
                user_id,
                comm,
                payload.preferred_market,
                payload.target_price_per_kg,
                payload.max_transport_cost_inr,
                payload.min_net_return_inr,
                now_iso,
                now_iso,
            ),
        )
        conn.commit()
        return dict(conn.execute("SELECT * FROM market_alert_preferences WHERE id = ?", (pref_id,)).fetchone())
    finally:
        conn.close()


def evaluate_and_list_alerts(user_id: str) -> Dict[str, Any]:
    now_iso = _now_iso()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        prefs = [
            dict(r)
            for r in cursor.execute(
                "SELECT * FROM market_alert_preferences WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC",
                (user_id,),
            ).fetchall()
        ]
        for p in prefs:
            if p.get("target_price_per_kg") is None:
                continue
            q = """
                SELECT * FROM market_price_observations
                WHERE LOWER(commodity) = ? AND modal_price_per_kg >= ?
            """
            params: List[Any] = [p["commodity"].lower(), float(p["target_price_per_kg"])]
            if p.get("preferred_market"):
                q += " AND LOWER(market) LIKE ?"
                params.append(f"%{p['preferred_market'].lower()}%")
            q += " ORDER BY observation_date DESC LIMIT 1"
            hit = cursor.execute(q, params).fetchone()
            if hit:
                hit_d = dict(hit)
                existing = cursor.execute(
                    """
                    SELECT id FROM market_alerts
                    WHERE user_id = ? AND preference_id = ? AND market = ? AND observed_price_per_kg = ?
                    """,
                    (user_id, p["id"], hit_d["market"], hit_d["modal_price_per_kg"]),
                ).fetchone()
                if not existing:
                    cursor.execute(
                        """
                        INSERT INTO market_alerts (
                            id, user_id, preference_id, alert_type, commodity, market,
                            observed_price_per_kg, message, is_read, created_at
                        ) VALUES (?, ?, ?, 'target_price_reached', ?, ?, ?, ?, 0, ?)
                        """,
                        (
                            f"malt_{uuid.uuid4().hex[:10]}",
                            user_id,
                            p["id"],
                            hit_d["commodity"],
                            hit_d["market"],
                            hit_d["modal_price_per_kg"],
                            f"Target ₹{p['target_price_per_kg']}/kg reached for {hit_d['commodity']} at {hit_d['market']} (₹{hit_d['modal_price_per_kg']}/kg on {hit_d['observation_date']}).",
                            now_iso,
                        ),
                    )
        conn.commit()
        alerts = [
            dict(r)
            for r in cursor.execute(
                "SELECT * FROM market_alerts WHERE user_id = ? ORDER BY created_at DESC LIMIT 30",
                (user_id,),
            ).fetchall()
        ]
        return {
            "preferences": prefs,
            "alerts": alerts,
            "delivery_mode": "In-app evaluation only (push/SMS not claimed).",
        }
    finally:
        conn.close()
