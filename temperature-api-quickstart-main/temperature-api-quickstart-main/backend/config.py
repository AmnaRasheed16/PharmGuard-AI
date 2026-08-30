import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # FortyGuard API
    fortyguard_api_key: str | None = None
    fortyguard_base_url: str = "https://api.fortyguard.com"

    # Database
    database_url: str = "sqlite:///./pharma_guard.db"

    # Gemini AI (optional)
    gemini_api_key: str | None = None

    # Risk score weights (must sum to 1.0)
    weight_temperature: float = 0.30
    weight_heat: float = 0.20
    weight_compliance: float = 0.20
    weight_route: float = 0.10
    weight_worker: float = 0.10
    weight_carbon: float = 0.10

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
