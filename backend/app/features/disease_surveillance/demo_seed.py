"""
Isolated Demonstration Scenario Seeder for AD-40C.

All seeded demonstration observations carry `is_demonstration = 1` and
`data_source = 'demonstration_simulation'`. They are strictly isolated from live
farmer reports and live surveillance telemetry.
"""
import json
from datetime import datetime, timedelta, timezone

from backend.app.db.database import get_db_connection


def ensure_demo_surveillance_seed() -> None:
    """Idempotently seeds realistic demonstration reports (is_demonstration = 1 ONLY)."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        today = datetime.now(timezone.utc).date()
        now_iso = datetime.now(timezone.utc).isoformat()

        # Simulate 5 independent farms around Mandya & Maddur forming an isolated Tomato hotspot
        # plus one Chilli observation, all strictly marked is_demonstration = 1.
        demo_rows = [
            {
                "id": "demo_rep_001",
                "farmer_id": "demo_peer_a",
                "farm_id": "demo_farm_mandya_north",
                "crop": "Tomato",
                "disease_name": "Early Blight (Alternaria solani)",
                "observation_date": (today - timedelta(days=1)).isoformat(),
                "affected_area_ha": 1.2,
                "symptoms_json": json.dumps([
                    "Dark brown concentric target-board spots on lower leaves",
                    "Yellow halo around older foliar lesions",
                ]),
                "notes": "DEMONSTRATION DATA: Simulated KVK field verification in northern Mandya cluster.",
                "diagnostic_confidence": 0.94,
                "latitude": 12.5480,
                "longitude": 76.9120,
                "district": "Mandya",
                "state": "Karnataka",
                "verification_status": "expert_confirmed",
                "data_source": "demonstration_simulation",
                "anonymous_community_consent": 1,
                "is_demonstration": 1,
            },
            {
                "id": "demo_rep_002",
                "farmer_id": "demo_peer_b",
                "farm_id": "demo_farm_srirangapatna",
                "crop": "Tomato",
                "disease_name": "Early Blight (Alternaria solani)",
                "observation_date": (today - timedelta(days=2)).isoformat(),
                "affected_area_ha": 0.8,
                "symptoms_json": json.dumps([
                    "Lower leaf spotting after humid night",
                    "Mild premature leaf yellowing",
                ]),
                "notes": "DEMONSTRATION DATA: Simulated AI leaf scan suspicion from neighbouring plot.",
                "diagnostic_confidence": 0.83,
                "latitude": 12.5020,
                "longitude": 76.8750,
                "district": "Mandya",
                "state": "Karnataka",
                "verification_status": "ai_suspected",
                "data_source": "demonstration_simulation",
                "anonymous_community_consent": 1,
                "is_demonstration": 1,
            },
            {
                "id": "demo_rep_003",
                "farmer_id": "demo_peer_c",
                "farm_id": "demo_farm_maddur_west",
                "crop": "Tomato",
                "disease_name": "Early Blight (Alternaria solani)",
                "observation_date": (today - timedelta(days=4)).isoformat(),
                "affected_area_ha": 1.5,
                "symptoms_json": json.dumps([
                    "Concentric rings on mature canopy leaves",
                ]),
                "notes": "DEMONSTRATION DATA: Simulated community farmer report.",
                "diagnostic_confidence": None,
                "latitude": 12.5620,
                "longitude": 76.9420,
                "district": "Mandya",
                "state": "Karnataka",
                "verification_status": "farmer_reported",
                "data_source": "demonstration_simulation",
                "anonymous_community_consent": 1,
                "is_demonstration": 1,
            },
            {
                "id": "demo_rep_004",
                "farmer_id": "demo_peer_d",
                "farm_id": "demo_farm_malavalli",
                "crop": "Tomato",
                "disease_name": "Tomato Leaf Curl Virus (ToLCV)",
                "observation_date": (today - timedelta(days=3)).isoformat(),
                "affected_area_ha": 0.6,
                "symptoms_json": json.dumps([
                    "Upward leaf curling on young shoots",
                    "Whitefly activity observed on undersides",
                ]),
                "notes": "DEMONSTRATION DATA: Simulated insect-vector observation.",
                "diagnostic_confidence": 0.79,
                "latitude": 12.4650,
                "longitude": 76.9680,
                "district": "Mandya",
                "state": "Karnataka",
                "verification_status": "ai_suspected",
                "data_source": "demonstration_simulation",
                "anonymous_community_consent": 1,
                "is_demonstration": 1,
            },
            {
                "id": "demo_rep_005",
                "farmer_id": "demo_peer_e",
                "farm_id": "demo_farm_pandavapura",
                "crop": "Chilli",
                "disease_name": "Anthracnose / Fruit Rot (Colletotrichum capsici)",
                "observation_date": (today - timedelta(days=5)).isoformat(),
                "affected_area_ha": 0.9,
                "symptoms_json": json.dumps([
                    "Sunken circular brown lesions on ripening chilli pods",
                ]),
                "notes": "DEMONSTRATION DATA: Simulated Chilli rain-splash scenario.",
                "diagnostic_confidence": None,
                "latitude": 12.4950,
                "longitude": 76.7850,
                "district": "Mandya",
                "state": "Karnataka",
                "verification_status": "farmer_reported",
                "data_source": "demonstration_simulation",
                "anonymous_community_consent": 1,
                "is_demonstration": 1,
            },
        ]

        for row in demo_rows:
            fp = f"demo|{row['farm_id']}|{row['crop'].lower()}|{row['disease_name'].lower()}"
            cursor.execute(
                """
                INSERT OR IGNORE INTO disease_reports (
                    id, farmer_id, farm_id, crop, disease_name, observation_date,
                    affected_area_ha, symptoms_json, notes, diagnostic_confidence,
                    latitude, longitude, district, state, image_reference,
                    verification_status, data_source, anonymous_community_consent,
                    is_demonstration, dedupe_fingerprint, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    row["id"],
                    row["farmer_id"],
                    row["farm_id"],
                    row["crop"],
                    row["disease_name"],
                    row["observation_date"],
                    row["affected_area_ha"],
                    row["symptoms_json"],
                    row["notes"],
                    row["diagnostic_confidence"],
                    row["latitude"],
                    row["longitude"],
                    row["district"],
                    row["state"],
                    row["verification_status"],
                    row["data_source"],
                    row["anonymous_community_consent"],
                    row["is_demonstration"],
                    fp,
                    now_iso,
                    now_iso,
                ),
            )
        conn.commit()
    finally:
        conn.close()
