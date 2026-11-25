"""
Regression & security tests for AD-14 Mobile Number & OTP Authentication.
Covers E.164 normalization, cooldown/rate-limit, invalid/expired/reused OTP rejection,
one-phone-one-account-one-role enforcement, cross-role rejection, and phone linking.
"""
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.db.database import get_db_connection, init_db, normalize_phone_e164
from backend.app.features.auth.otp_service import hash_otp

client = TestClient(app)


def _seed_known_dev_otp(phone_norm: str, raw_code: str, expired: bool = False) -> None:
    conn = get_db_connection()
    cur = conn.cursor()
    now = datetime.now(timezone.utc)
    created_at = (now - timedelta(minutes=10 if expired else 0)).isoformat()
    expires_at = (now - timedelta(seconds=5) if expired else now + timedelta(minutes=5)).isoformat()
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


def _cleanup_phone(phone_norm: str) -> None:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM users WHERE phone_normalized = ?", (phone_norm,))
    cur.execute("DELETE FROM phone_otps WHERE phone_normalized = ?", (phone_norm,))
    cur.execute("DELETE FROM otp_verification_tokens WHERE phone_normalized = ?", (phone_norm,))
    conn.commit()
    conn.close()


def test_phone_normalization_variants():
    assert normalize_phone_e164("9845012345") == "+919845012345"
    assert normalize_phone_e164("098450-12345") == "+919845012345"
    assert normalize_phone_e164("+91 98450 12345") == "+919845012345"


def test_invalid_phone_rejected():
    res = client.post("/api/v1/auth/otp/send", json={"phone": "12345", "country_code": "+91"})
    assert res.status_code == 400


def test_otp_send_cooldown_and_full_registration_login_cross_role_lock():
    init_db()
    test_phone = "9888877776"
    phone_norm = normalize_phone_e164(test_phone)
    _cleanup_phone(phone_norm)

    try:
        # 1. Send OTP & verify cooldown on immediate resend
        send_res = client.post("/api/v1/auth/otp/send", json={"phone": test_phone, "country_code": "+91"})
        assert send_res.status_code == 200
        assert send_res.json()["sent"] is True
        assert "otp" not in send_res.json()

        cooldown_res = client.post("/api/v1/auth/otp/send", json={"phone": test_phone, "country_code": "+91"})
        assert cooldown_res.status_code == 429

        # 2. Seed known OTP hash -> test wrong OTP rejection -> correct OTP verification
        _seed_known_dev_otp(phone_norm, "654321")
        bad_res = client.post("/api/v1/auth/otp/verify", json={"phone": test_phone, "otp": "000000"})
        assert bad_res.status_code == 400

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
        assert login_res.json()["user"]["name"] == "Test Farmer OTP"

        # 7. Cross-role / duplicate registration must be rejected with 409 even with a verification token
        conn = get_db_connection()
        from backend.app.features.auth.otp_service import issue_verification_token
        dup_vtok = issue_verification_token(conn.cursor(), phone_norm)
        conn.commit()
        conn.close()

        for forbidden_role in ("buyer", "labour", "driver", "farmer"):
            dup_res = client.post(
                "/api/v1/auth/otp/register",
                json={"verification_token": dup_vtok, "name": "Attacker", "role": forbidden_role},
            )
            # First loop consumes token & hits 409; subsequent hit 401/409
            assert dup_res.status_code in (401, 409)
            if forbidden_role == "buyer":
                assert dup_res.status_code == 409

        # 8. Logout revokes session
        out_res = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token}"})
        assert out_res.status_code == 200
        me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 401
    finally:
        _cleanup_phone(phone_norm)


def _clear_otps_for_phone(phone_norm: str) -> None:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM phone_otps WHERE phone_normalized = ?", (phone_norm,))
    conn.commit()
    conn.close()


def test_demo_otp_success_all_roles():
    init_db()
    demo_cases = [
        ("9845012345", "farmer", "/"),
        ("9845067890", "buyer", "/dashboard/buyer"),
        ("9845044556", "labour", "/dashboard/labour"),
        ("9845077889", "driver", "/dashboard/driver"),
    ]
    for phone, role, redirect in demo_cases:
        phone_norm = normalize_phone_e164(phone)
        _clear_otps_for_phone(phone_norm)

        send_res = client.post("/api/v1/auth/otp/send", json={"phone": phone, "country_code": "+91"})
        assert send_res.status_code == 200
        assert send_res.json()["sent"] is True
        assert send_res.json()["demo_mode"] is True
        assert send_res.json()["notice"] == "Demo verification mode — no SMS sent."
        assert send_res.json()["cooldown_seconds"] == 60
        assert send_res.json()["expires_in_seconds"] == 600

        verify_res = client.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": "280707"})
        assert verify_res.status_code == 200
        assert verify_res.json()["status"] == "authenticated"
        assert verify_res.json()["user"]["role"] == role
        assert verify_res.json()["redirect_url"] == redirect


def test_demo_otp_incorrect_code_rejected():
    phone = "9845012345"
    phone_norm = normalize_phone_e164(phone)
    _clear_otps_for_phone(phone_norm)

    send_res = client.post("/api/v1/auth/otp/send", json={"phone": phone})
    assert send_res.status_code == 200

    bad_res = client.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": "123456"})
    assert bad_res.status_code == 400
    assert bad_res.json()["detail"] == "Invalid OTP. Please try again."


def test_demo_otp_expired_code_rejected():
    phone = "9845012345"
    phone_norm = normalize_phone_e164(phone)
    _clear_otps_for_phone(phone_norm)

    send_res = client.post("/api/v1/auth/otp/send", json={"phone": phone})
    assert send_res.status_code == 200

    conn = get_db_connection()
    conn.execute(
        "UPDATE phone_otps SET expires_at = '2020-01-01T00:00:00+00:00' WHERE phone_normalized = ?",
        (phone_norm,),
    )
    conn.commit()
    conn.close()

    res = client.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": "280707"})
    assert res.status_code == 400
    assert res.json()["detail"] == "Verification code expired. Please request a new OTP."


def test_demo_otp_replay_rejected():
    phone = "9845012345"
    phone_norm = normalize_phone_e164(phone)
    _clear_otps_for_phone(phone_norm)

    send_res = client.post("/api/v1/auth/otp/send", json={"phone": phone})
    assert send_res.status_code == 200

    res1 = client.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": "280707"})
    assert res1.status_code == 200

    res2 = client.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": "280707"})
    assert res2.status_code == 400
    assert res2.json()["detail"] == "This verification code has already been used. Request a new OTP."


def test_demo_otp_repeated_attempts_lockout():
    phone = "9845012345"
    phone_norm = normalize_phone_e164(phone)
    _clear_otps_for_phone(phone_norm)

    send_res = client.post("/api/v1/auth/otp/send", json={"phone": phone})
    assert send_res.status_code == 200

    for i in range(5):
        bad = client.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": f"90000{i}"})
        assert bad.status_code == 400
        assert bad.json()["detail"] == "Invalid OTP. Please try again."

    lockout = client.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": "280707"})
    assert lockout.status_code == 429
    assert lockout.json()["detail"] == "Maximum verification attempts exceeded. Request a new OTP."


def test_demo_otp_unauthorized_account_rejection():
    unauth_phone = "9999900000"
    unauth_norm = normalize_phone_e164(unauth_phone)
    _cleanup_phone(unauth_norm)

    try:
        send_res = client.post("/api/v1/auth/otp/send", json={"phone": unauth_phone})
        assert send_res.status_code == 200
        assert send_res.json().get("demo_mode") is False

        verify_res = client.post("/api/v1/auth/otp/verify", json={"phone": unauth_phone, "otp": "280707"})
        assert verify_res.status_code == 400
        assert verify_res.json()["detail"] == "Invalid OTP. Please try again."
    finally:
        _cleanup_phone(unauth_norm)


def test_demo_otp_production_mode_rejection(monkeypatch):
    from backend.app.features.auth.otp_service import is_demo_otp_active

    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("DEMO_OTP_ENABLED", "true")
    assert is_demo_otp_active() is False

    phone = "9845012345"
    phone_norm = normalize_phone_e164(phone)
    _clear_otps_for_phone(phone_norm)

    prod_send = client.post("/api/v1/auth/otp/send", json={"phone": phone})
    # In production without Twilio configured, must reject with 503 and never activate demo OTP
    assert prod_send.status_code in (502, 503)
