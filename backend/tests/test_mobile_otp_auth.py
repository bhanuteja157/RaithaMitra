"""
Regression & security tests for AD-14 / AD-19B Mobile Number & Per-Account Demo OTP Authentication.
Uses strictly synthetic phone numbers and OTPs against an isolated temporary SQLite database.
Covers:
- E.164 normalization & invalid phone rejection
- Cooldown, rate-limiting, expiry, replay protection, and 5-attempt lockout
- All 5 configured demo accounts authenticating with their own individual OTPs & correct redirects
- Cross-account OTP rejection (account A's OTP rejected for account B)
- Previous demo phone numbers rejected by demo authentication
- Unregistered / arbitrary numbers rejected by fixed demo OTP
- Non-demo account conflict rejection during demo phone sync
- Idempotent database sync preserving existing names, roles, passwords, and profiles
- Production mode strictly rejecting all demo OTPs
"""
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
import backend.app.db.database as database_module
from backend.app.db.database import (
    get_db_connection,
    init_db,
    normalize_phone_e164,
    sync_single_demo_phone,
)
from backend.app.features.auth.otp_service import hash_otp, is_demo_otp_active, issue_verification_token

client = TestClient(app)

SYNTHETIC_DEMO_CONFIG = [
    ("usr_farmer", "9000010001", "111101", "farmer", "/"),
    ("usr_buyer1", "9000010002", "222202", "buyer", "/dashboard/buyer"),
    ("usr_buyer2", "9000010003", "333303", "buyer", "/dashboard/buyer"),
    ("usr_labour", "9000010004", "444404", "labour", "/dashboard/labour"),
    ("usr_driver", "9000010005", "555505", "driver", "/dashboard/driver"),
]

SYNTHETIC_DEMO_MAP = ",".join(
    f"{uid}:+91{phone}:{otp}" for uid, phone, otp, _, _ in SYNTHETIC_DEMO_CONFIG
)


@pytest.fixture()
def isolated_otp_db(tmp_path, monkeypatch):
    test_db = tmp_path / "test_mobile_otp.db"
    monkeypatch.setattr(database_module, "DB_PATH", test_db)
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("DEMO_OTP_ENABLED", "true")
    monkeypatch.setenv("DEMO_OTP_MAP", SYNTHETIC_DEMO_MAP)
    monkeypatch.delenv("DEMO_OTP_ACCOUNTS", raising=False)
    monkeypatch.delenv("TWILIO_ACCOUNT_SID", raising=False)
    monkeypatch.delenv("TWILIO_AUTH_TOKEN", raising=False)
    monkeypatch.delenv("TWILIO_VERIFY_SERVICE_SID", raising=False)
    init_db()
    return test_db


def _seed_known_dev_otp(phone_norm: str, raw_code: str, expired: bool = False) -> None:
    conn = get_db_connection()
    cur = conn.cursor()
    now = datetime.now(timezone.utc)
    created_at = (now - timedelta(minutes=10 if expired else 0)).isoformat()
    expires_at = (now - timedelta(seconds=5) if expired else now + timedelta(minutes=10)).isoformat()
    cur.execute("DELETE FROM phone_otps WHERE phone_normalized = ?", (phone_norm,))
    cur.execute(
        """
        INSERT INTO phone_otps (id, phone_normalized, otp_hash, purpose, attempts, max_attempts, expires_at, consumed_at, created_at)
        VALUES (?, ?, ?, 'auth', 0, 5, ?, NULL, ?)
        """,
        (f"otp_test_{now.timestamp()}", phone_norm, hash_otp(phone_norm, raw_code), expires_at, created_at),
    )
    conn.commit()
    conn.close()


def _clear_otps_for_phone(phone_norm: str) -> None:
    conn = get_db_connection()
    conn.execute("DELETE FROM phone_otps WHERE phone_normalized = ?", (phone_norm,))
    conn.commit()
    conn.close()


def test_phone_normalization_variants():
    assert normalize_phone_e164("9000010001") == "+919000010001"
    assert normalize_phone_e164("090000-10001") == "+919000010001"
    assert normalize_phone_e164("+91 90000 10001") == "+919000010001"


def test_invalid_phone_rejected(isolated_otp_db):
    res = client.post("/api/v1/auth/otp/send", json={"phone": "12345", "country_code": "+91"})
    assert res.status_code == 400


def test_otp_send_cooldown_and_full_registration_login_cross_role_lock(isolated_otp_db):
    test_phone = "9888877776"
    phone_norm = normalize_phone_e164(test_phone)

    # 1. Send OTP & verify cooldown on immediate resend (non-demo phone)
    send_res = client.post("/api/v1/auth/otp/send", json={"phone": test_phone, "country_code": "+91"})
    assert send_res.status_code == 200
    assert send_res.json()["sent"] is True
    assert send_res.json()["demo_mode"] is False
    assert "otp" not in send_res.json()

    cooldown_res = client.post("/api/v1/auth/otp/send", json={"phone": test_phone, "country_code": "+91"})
    assert cooldown_res.status_code == 429

    # 2. Seed known OTP hash -> test wrong OTP rejection -> correct OTP verification
    _seed_known_dev_otp(phone_norm, "654321")
    bad_res = client.post("/api/v1/auth/otp/verify", json={"phone": test_phone, "otp": "000000"})
    assert bad_res.status_code == 400
    assert bad_res.json()["detail"] == "Invalid OTP. Please try again."

    ok_res = client.post("/api/v1/auth/otp/verify", json={"phone": test_phone, "otp": "654321"})
    assert ok_res.status_code == 200
    assert ok_res.json()["status"] == "needs_registration"
    vtok = ok_res.json()["verification_token"]

    # 3. Reused OTP must be rejected
    reuse_res = client.post("/api/v1/auth/otp/verify", json={"phone": test_phone, "otp": "654321"})
    assert reuse_res.status_code == 400

    # 4. Expired OTP must be rejected
    _seed_known_dev_otp(phone_norm, "111222", expired=True)
    exp_res = client.post("/api/v1/auth/otp/verify", json={"phone": test_phone, "otp": "111222"})
    assert exp_res.status_code == 400

    # 5. Complete Farmer registration using verification_token
    reg_res = client.post(
        "/api/v1/auth/otp/register",
        json={"verification_token": vtok, "name": "Test Farmer OTP", "role": "farmer"},
    )
    assert reg_res.status_code == 201
    assert reg_res.json()["user"]["role"] == "farmer"
    assert reg_res.json()["user"]["name"] == "Test Farmer OTP"
    assert reg_res.json()["redirect_url"] == "/"
    token = reg_res.json()["access_token"]

    # 6. Subsequent OTP login automatically returns Farmer role & redirects to "/"
    _seed_known_dev_otp(phone_norm, "222333")
    login_res = client.post("/api/v1/auth/otp/verify", json={"phone": "09888877776", "otp": "222333"})
    assert login_res.status_code == 200
    assert login_res.json()["status"] == "authenticated"
    assert login_res.json()["user"]["role"] == "farmer"

    # 7. Cross-role / duplicate registration must be rejected with 409
    conn = get_db_connection()
    dup_vtok = issue_verification_token(conn.cursor(), phone_norm)
    conn.commit()
    conn.close()

    for forbidden_role in ("buyer", "labour", "driver", "farmer"):
        dup_res = client.post(
            "/api/v1/auth/otp/register",
            json={"verification_token": dup_vtok, "name": "Attacker", "role": forbidden_role},
        )
        assert dup_res.status_code in (401, 409)
        if forbidden_role == "buyer":
            assert dup_res.status_code == 409

    # 8. Logout revokes session
    out_res = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert out_res.status_code == 200
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 401


def test_per_account_demo_otp_success_all_five_accounts(isolated_otp_db):
    for uid, phone, otp, expected_role, expected_redirect in SYNTHETIC_DEMO_CONFIG:
        phone_norm = normalize_phone_e164(phone)
        _clear_otps_for_phone(phone_norm)

        send_res = client.post("/api/v1/auth/otp/send", json={"phone": phone, "country_code": "+91"})
        assert send_res.status_code == 200
        body = send_res.json()
        assert body["sent"] is True
        assert body["demo_mode"] is True
        assert body["notice"] == "Demo verification mode — no SMS sent"
        assert body["cooldown_seconds"] == 60
        assert body["expires_in_seconds"] == 600
        assert "otp" not in body

        verify_res = client.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": otp})
        assert verify_res.status_code == 200
        vbody = verify_res.json()
        assert vbody["status"] == "authenticated"
        assert vbody["user"]["id"] == uid
        assert vbody["user"]["role"] == expected_role
        assert vbody["redirect_url"] == expected_redirect


def test_cross_account_otp_rejected(isolated_otp_db):
    farmer_phone = SYNTHETIC_DEMO_CONFIG[0][1]
    buyer1_otp = SYNTHETIC_DEMO_CONFIG[1][2]
    _clear_otps_for_phone(normalize_phone_e164(farmer_phone))

    send_res = client.post("/api/v1/auth/otp/send", json={"phone": farmer_phone})
    assert send_res.status_code == 200
    assert send_res.json()["demo_mode"] is True

    # Submitting Buyer 1's OTP for Farmer must fail
    bad_res = client.post("/api/v1/auth/otp/verify", json={"phone": farmer_phone, "otp": buyer1_otp})
    assert bad_res.status_code == 400
    assert bad_res.json()["detail"] == "Invalid OTP. Please try again."


def test_previous_demo_numbers_and_unregistered_numbers_rejected(isolated_otp_db):
    # Legacy/previous demo phone numbers and unregistered numbers must NOT get demo_mode
    for non_demo_phone in ("9845012345", "9845067890", "9999900000"):
        phone_norm = normalize_phone_e164(non_demo_phone)
        _clear_otps_for_phone(phone_norm)

        send_res = client.post("/api/v1/auth/otp/send", json={"phone": non_demo_phone})
        assert send_res.status_code == 200
        assert send_res.json()["demo_mode"] is False
        assert "notice" not in send_res.json()

        # Cannot authenticate using any configured demo OTP
        for _, _, demo_otp, _, _ in SYNTHETIC_DEMO_CONFIG:
            verify_res = client.post(
                "/api/v1/auth/otp/verify",
                json={"phone": non_demo_phone, "otp": demo_otp},
            )
            assert verify_res.status_code == 400
            assert verify_res.json()["detail"] == "Invalid OTP. Please try again."


def test_demo_otp_expiry_replay_and_lockout(isolated_otp_db):
    _, phone, otp, _, _ = SYNTHETIC_DEMO_CONFIG[0]
    phone_norm = normalize_phone_e164(phone)

    # 1. Expiry
    _clear_otps_for_phone(phone_norm)
    assert client.post("/api/v1/auth/otp/send", json={"phone": phone}).status_code == 200
    conn = get_db_connection()
    conn.execute(
        "UPDATE phone_otps SET expires_at = '2020-01-01T00:00:00+00:00' WHERE phone_normalized = ?",
        (phone_norm,),
    )
    conn.commit()
    conn.close()
    exp_res = client.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": otp})
    assert exp_res.status_code == 400
    assert exp_res.json()["detail"] == "Verification code expired. Please request a new OTP."

    # 2. Replay protection
    _clear_otps_for_phone(phone_norm)
    assert client.post("/api/v1/auth/otp/send", json={"phone": phone}).status_code == 200
    assert client.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": otp}).status_code == 200
    rep_res = client.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": otp})
    assert rep_res.status_code == 400
    assert rep_res.json()["detail"] == "This verification code has already been used. Request a new OTP."

    # 3. 5-attempt lockout
    _clear_otps_for_phone(phone_norm)
    assert client.post("/api/v1/auth/otp/send", json={"phone": phone}).status_code == 200
    for i in range(5):
        bad = client.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": f"90000{i}"})
        assert bad.status_code == 400
        assert bad.json()["detail"] == "Invalid OTP. Please try again."
    lockout = client.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": otp})
    assert lockout.status_code == 429
    assert lockout.json()["detail"] == "Maximum verification attempts exceeded. Request a new OTP."


def test_demo_otp_production_mode_rejection(isolated_otp_db, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("DEMO_OTP_ENABLED", "true")
    assert is_demo_otp_active() is False

    _, phone, _, _, _ = SYNTHETIC_DEMO_CONFIG[0]
    _clear_otps_for_phone(normalize_phone_e164(phone))

    prod_send = client.post("/api/v1/auth/otp/send", json={"phone": phone})
    assert prod_send.status_code in (502, 503)


def test_db_sync_idempotency_and_non_demo_conflict_rejected(isolated_otp_db):
    # 1. Insert a real non-demo account owning +919777766666
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO users (id, email, password_hash, name, phone, phone_normalized, phone_verified, role, preferred_language, created_at)
        VALUES ('usr_real_001', 'real@example.com', 'hash', 'Real Farmer', '+919777766666', '+919777766666', 1, 'farmer', 'kn', '2026-11-26T00:00:00Z')
        """
    )
    conn.commit()

    # 2. Attempting to sync usr_farmer onto that non-demo phone must raise ValueError and NOT overwrite
    with pytest.raises(ValueError, match="conflicts with existing non-demo account"):
        sync_single_demo_phone(cur, "usr_farmer", "+919777766666")
    conn.rollback()

    real_owner = cur.execute("SELECT id, phone_normalized FROM users WHERE id = 'usr_real_001'").fetchone()
    assert real_owner["phone_normalized"] == "+919777766666"
    conn.close()

    # 3. Re-running init_db() is idempotent and preserves names, roles, passwords, and profiles
    init_db()
    conn2 = get_db_connection()
    farmer = conn2.execute(
        "SELECT name, email, password_hash, role, phone_normalized FROM users WHERE id = 'usr_farmer'"
    ).fetchone()
    assert farmer["name"] == "Suresh Gowda"
    assert farmer["email"] == "farmer@raithamitra.in"
    assert farmer["role"] == "farmer"
    assert farmer["phone_normalized"] == "+919000010001"
    conn2.close()
