import re

from pydantic import BaseModel, EmailStr, field_validator, model_validator

_LETTER_PATTERN = re.compile(r"[A-Za-z]")
_DIGIT_PATTERN = re.compile(r"\d")
_SPECIAL_CHAR_PATTERN = re.compile(r"[^A-Za-z0-9]")


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    confirm_password: str

    @field_validator("password")
    @classmethod
    def password_must_be_strong(cls, value: str) -> str:
        is_strong = (
            len(value) >= 8
            and _LETTER_PATTERN.search(value)
            and _DIGIT_PATTERN.search(value)
            and _SPECIAL_CHAR_PATTERN.search(value)
        )
        if not is_strong:
            raise ValueError("Password needs 8+ characters with a letter, a number, and a special character")
        return value

    @model_validator(mode="after")
    def passwords_must_match(self) -> "RegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class LoginRequest(BaseModel):
    identifier: str
    password: str
