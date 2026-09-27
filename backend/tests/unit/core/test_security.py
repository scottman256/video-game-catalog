import jwt
import pytest

from app.core.security import (
    create_access_token,
    create_impersonation_token,
    decode_impersonation_token,
    decode_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)


def test_hash_password_produces_a_verifiable_hash():
    password_hash = hash_password("Sup3r$ecret")

    assert password_hash != "Sup3r$ecret"
    assert verify_password("Sup3r$ecret", password_hash) is True


def test_verify_password_rejects_wrong_password():
    password_hash = hash_password("Sup3r$ecret")

    assert verify_password("wrong-password", password_hash) is False


def test_access_token_round_trips_user_id():
    token = create_access_token(user_id=42)

    assert decode_token(token) == 42


def test_decode_token_rejects_expired_token(monkeypatch):
    monkeypatch.setattr("app.core.security.settings.access_token_ttl_minutes", -1)
    token = create_access_token(user_id=42)

    with pytest.raises(jwt.ExpiredSignatureError):
        decode_token(token)


def test_hash_refresh_token_is_deterministic_and_one_way():
    token = "some-raw-refresh-token"
    first_hash = hash_refresh_token(token)
    second_hash = hash_refresh_token(token)

    assert first_hash == second_hash
    assert first_hash != token


def test_impersonation_token_round_trips_admin_and_target():
    token = create_impersonation_token(admin_id=1, target_user_id=7)

    assert decode_impersonation_token(token) == (1, 7)


def test_impersonation_token_cannot_be_used_as_access_token():
    token = create_impersonation_token(admin_id=1, target_user_id=7)

    with pytest.raises(jwt.InvalidTokenError):
        decode_token(token)


def test_access_token_cannot_be_used_as_impersonation_token():
    token = create_access_token(user_id=42)

    with pytest.raises(jwt.InvalidTokenError):
        decode_impersonation_token(token)
