from pydantic import BaseModel, ConfigDict


class SystemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    release_year: int
