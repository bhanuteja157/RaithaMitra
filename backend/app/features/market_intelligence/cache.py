"""
AD-29: Persistent SQLite Market Observation Cache & Deduplication Layer.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.app.db.database import get_db_connection


def persist_market_observations(
    observations: List[Dict[str, Any]],
    *,
    user_id: Optional[str] = None,
) -> Dict[str, int]:
    if not observations:
        return {"inserted": 0, "skipped": 0}
    now_iso = datetime.now(timezone.utc).isoformat()
    inserted = 0
    skipped = 0
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        for obs in observations:
            obs_id = f"mkt_{uuid.uuid4().hex[:10]}"
            cursor.execute(
                """
                INSERT OR IGNORE INTO market_price_observations (
                    id, commodity, variety, grade, state, district, market,
                    observation_date, min_price_per_quintal, max_price_per_quintal,
                    modal_price_per_quintal, modal_price_per_kg, original_unit,
                    source_type, source_name, provenance_label, retrieved_at, user_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    obs_id,
                    obs["commodity"],
                    obs.get("variety") or "FAQ",
                    obs.get("grade") or "FAQ",
                    obs["state"],
                    obs["district"],
                    obs["market"],
                    obs["observation_date"],
                    obs["min_price_per_quintal"],
                    obs["max_price_per_quintal"],
                    obs["modal_price_per_quintal"],
                    obs["modal_price_per_kg"],
                    obs.get("original_unit") or "INR/Quintal",
                    obs["source_type"],
                    obs["source_name"],
                    obs["provenance_label"],
                    now_iso,
                    user_id,
                ),
            )
            if cursor.rowcount > 0:
                inserted += 1
            else:
                skipped += 1
        conn.commit()
        return {"inserted": inserted, "skipped": skipped}
    finally:
        conn.close()


def query_market_observations(
    *,
    commodity: Optional[str] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    market: Optional[str] = None,
    source_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        clauses = ["1=1"]
        params: List[Any] = []
        if commodity:
            clauses.append("LOWER(commodity) = ?")
            params.append(commodity.strip().lower())
        if state:
            clauses.append("LOWER(state) = ?")
            params.append(state.strip().lower())
        if district:
            clauses.append("LOWER(district) LIKE ?")
            params.append(f"%{district.strip().lower()}%")
        if market:
            clauses.append("LOWER(market) LIKE ?")
            params.append(f"%{market.strip().lower()}%")
        if source_type:
            clauses.append("source_type = ?")
            params.append(source_type)
        if start_date:
            clauses.append("observation_date >= ?")
            params.append(start_date)
        if end_date:
            clauses.append("observation_date <= ?")
            params.append(end_date)

        sql = f"""
            SELECT * FROM market_price_observations
            WHERE {' AND '.join(clauses)}
            ORDER BY observation_date DESC, retrieved_at DESC
            LIMIT ?
        """
        params.append(max(1, min(500, limit)))
        return [dict(r) for r in conn.execute(sql, params).fetchall()]
    finally:
        conn.close()
