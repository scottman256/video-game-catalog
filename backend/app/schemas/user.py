from pydantic import BaseModel, ConfigDict

from app.models.user import User


class ImpersonatorOut(BaseModel):
    id: int
    username: str


class UserOut(BaseModel):
    """The account whose data the session acts on, plus the admin behind it when impersonating."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    is_admin: bool = False
    impersonated_by: ImpersonatorOut | None = None

    @classmethod
    def for_session(cls, acting_as: User, signed_in: User) -> "UserOut":
        impersonator = None if acting_as.id == signed_in.id else ImpersonatorOut(id=signed_in.id, username=signed_in.username)
        return cls(
            id=acting_as.id,
            username=acting_as.username,
            email=acting_as.email,
            is_admin=acting_as.is_admin,
            impersonated_by=impersonator,
        )
