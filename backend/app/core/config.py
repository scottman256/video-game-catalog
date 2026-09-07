from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./video_game_catalog.db"
    jwt_secret_key: str = "dev-only-insecure-secret-key-please-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 7
    upload_dir: str = "app/uploads"
    cors_origins: list[str] = ["http://localhost:4200"]
    public_base_url: str = "http://localhost:8000"
    environment: str = "development"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
