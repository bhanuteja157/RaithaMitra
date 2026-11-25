"""Comprehensive tests for AD-31 Offline-First PWA & Synchronization."""
from __future__ import annotations

import json
import os
import uuid

import pytest
from fastapi.testclient import TestClient

from backend.app.db.database import get_db_connection, init_db
from backend.app.main import app


@pytest.fixture(autouse=True)
def _ensure_db():
    init_db()


def _farmer_headers() -> dict:
    return {"Authorization": "Bearer rm_demo_token_farmer"}


def _buyer_headers() -> dict:
    return {"Authorization": "Bearer rm_demo_token_buyer"}


def test_pwa_manifest_icons_and_service_worker_files_valid():
    manifest_path = os.path.join("frontend", "public", "manifest.webmanifest")
    sw_path = os.path.join("frontend", "public", "sw.js")
    offline_path = os.path.join("frontend", "public", "offline.html")
    assert os.path.exists(manifest_path)
    assert os.path.exists(sw_path)
    assert os.path.exists(offline_path)

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    assert manifest["name"].startswith("RaithaMitra")
    assert manifest["display"] == "standalone"
    assert len(manifest["icons"]) >= 3
    for icon in manifest["icons"]:
        icon_file = os.path.join("frontend", "public", icon["src"].lstrip("/"))
        assert os.path.exists(icon_file)


def test_offline_expense_sync_idempotency_and_payload_conflict():
    client = TestClient(app)
    idem = f"offline_exp_{uuid.uuid4().hex[:10]}"
    payload = {
        "amount_inr": 500,
        "category": "fertilizers",
        "description": "Scenario C Offline Urea Expense",
        "tx_date": "2026-11-26",
    }

    # First sync
    r1 = client.post(
        "/api/v1/sync/submit",
        json={
            "operation_type": "create_manual_expense",
            "idempotency_key": idem,
            "farm_id": "farm_001",
            "payload": payload,
        },
        headers=_farmer_headers(),
    )
    assert r1.status_code == 200
    b1 = r1.json()
    assert b1["status"] == "synchronized"
    assert b1["duplicate_prevented"] is False
    tx_id = b1["result_resource_id"]

    # Retry identical idempotency key -> prevented duplicate
    r2 = client.post(
        "/api/v1/sync/submit",
        json={
            "operation_type": "create_manual_expense",
            "idempotency_key": idem,
            "farm_id": "farm_001",
            "payload": payload,
        },
        headers=_farmer_headers(),
    )
    assert r2.status_code == 200
    assert r2.json()["duplicate_prevented"] is True

    # Verify exactly 1 row in financial_transactions
    conn = get_db_connection()
    count = conn.execute(
        "SELECT COUNT(*) FROM financial_transactions WHERE id = ?",
        (tx_id,),
    ).fetchone()[0]
    conn.close()
    assert count == 1

    # Reusing same key with different payload -> 409 Conflict
    r3 = client.post(
        "/api/v1/sync/submit",
        json={
            "operation_type": "create_manual_expense",
            "idempotency_key": idem,
            "farm_id": "farm_001",
            "payload": {**payload, "amount_inr": 999},
        },
        headers=_farmer_headers(),
    )
    assert r3.status_code == 409


def test_consequential_draft_confirmation_and_equipment_conflict_detection():
    client = TestClient(app)

    # Register an equipment listing and book 2026-12-20 08:00-10:00
    reg = client.post(
        "/api/v1/equipment/listings",
        json={"equipment_name": "Sync Conflict Tractor", "category": "Tractor", "rental_rate_inr": 800},
        headers=_farmer_headers(),
    )
    eq_id = reg.json()["id"]
    bk = client.post(
        "/api/v1/equipment/bookings",
        json={
            "equipment_id": eq_id,
            "farm_id": "farm_001",
            "operation_type": "Land Preparation",
            "booking_date": "2026-12-20",
            "start_datetime": "2026-12-20T08:00:00",
            "end_datetime": "2026-12-20T10:00:00",
            "duration_hours": 2,
        },
        headers=_farmer_headers(),
    )
    client.patch(
        f"/api/v1/equipment/bookings/{bk.json()['id']}/status",
        json={"status": "accepted"},
        headers=_farmer_headers(),
    )

    # Scenario E: Offline draft for conflicting window detects conflict
    conf = client.post(
        "/api/v1/sync/submit",
        json={
            "operation_type": "equipment_booking_draft",
            "idempotency_key": f"eq_conf_{uuid.uuid4().hex[:8]}",
            "farm_id": "farm_001",
            "payload": {
                "equipment_id": eq_id,
                "start_datetime": "2026-12-20T09:00:00",
                "end_datetime": "2026-12-20T11:00:00",
            },
        },
        headers=_farmer_headers(),
    )
    assert conf.status_code == 200
    assert conf.json()["status"] == "conflict_detected"

    # Non-conflicting consequential draft requires explicit confirmation (never auto-executes)
    ok_draft = client.post(
        "/api/v1/sync/submit",
        json={
            "operation_type": "equipment_booking_draft",
            "idempotency_key": f"eq_ok_{uuid.uuid4().hex[:8]}",
            "farm_id": "farm_001",
            "payload": {
                "equipment_id": eq_id,
                "start_datetime": "2026-12-21T08:00:00",
                "end_datetime": "2026-12-21T10:00:00",
            },
        },
        headers=_farmer_headers(),
    )
    assert ok_draft.status_code == 200
    assert ok_draft.json()["status"] == "confirmation_required"


def test_bounded_snapshot_and_cross_account_isolation():
    client = TestClient(app)

    snap = client.get("/api/v1/sync/snapshot?farm_id=farm_001", headers=_farmer_headers())
    assert snap.status_code == 200
    assert snap.json()["user_id"] == "usr_farmer"
    assert len(snap.json()["farms"]) >= 1

    # Buyer blocked from farmer sync submit/snapshot
    unauth = client.get("/api/v1/sync/snapshot?farm_id=farm_001", headers=_buyer_headers())
    assert unauth.status_code == 403
