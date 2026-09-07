from pydantic import BaseModel


class UserSettingsOut(BaseModel):
    dark_mode: bool


class UserSettingsUpdateRequest(BaseModel):
    dark_mode: bool
