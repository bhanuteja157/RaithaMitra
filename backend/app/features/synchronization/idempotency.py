"""
AD-31: Atomic Server-Side Idempotency & Payload Hash Verification.
Scoped strictly to (user_id, operation_type, idempotency_key).
"""
from __future__ import annotations

import hashlib
import json
from typing import Any, Dict, Optional

from fastapi import HTTPException


def compute_payload_hash(payload: Dict[str, Any]) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def check_existing_sync_receipt(
    cursor,
    *,
    user_id: str,
    operation_type: str,
    idempotency_key: str,
    payload_hash: str,
) -> Optional[Dict[str, Any]]:
    row = cursor.execute(
        """
        SELECT * FROM sync_operation_receipts
        WHERE user_id = ? AND operation_type = ? AND idempotency_key = ?
        LIMIT 1
        """,
        (user_id, operation_type, idempotency_key),
    ).fetchone()
    if not row:
        return None
    d = dict(row)
    if d["payload_hash"] != payload_hash:
        raise HTTPException(
            status_code=409,
            detail="Conflict: Idempotency key was already used with a different operation payload.",
        )
    return {
        "receipt_id": d["id"],
        "operation_type": d["operation_type"],
        "idempotency_key": d["idempotency_key"],
        "risk_class": d["risk_class"],
        "status": d["status"],
        "result_resource_id": d["result_resource_id"],
        "duplicate_prevented": True,
        "response": json.loads(d["response_json"]),
        "created_at": d["created_at"],
    }
