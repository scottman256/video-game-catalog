import pytest
from pydantic import ValidationError

from app.schemas.auth import RegisterRequest

VALID = {"username": "scott", "email": "scott@example.com", "password": "Sup3r$3cret", "confirm_password": "Sup3r$3cret"}


@pytest.mark.parametrize(
    "password",
    ["short1!", "nouppercasebutnospecial1", "NoDigitsHere!", "NoSpecialChar1"],
)
def test_rejects_weak_passwords(password):
    payload = {**VALID, "password": password, "confirm_password": password}

    with pytest.raises(ValidationError):
        RegisterRequest(**payload)


def test_accepts_a_strong_password():
    request = RegisterRequest(**VALID)

    assert request.password == VALID["password"]


def test_rejects_mismatched_confirmation():
    payload = {**VALID, "confirm_password": "Different$3cret"}

    with pytest.raises(ValidationError):
        RegisterRequest(**payload)
