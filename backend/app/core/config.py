"""Application configuration loaded from environment variables."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """AERIS platform configuration.

    All values are read from environment variables or a ``.env`` file
    located in the backend root directory.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ── Database ──────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/aeris"

    # ── CORS ──────────────────────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse the comma-separated CORS_ORIGINS string into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    # ── Firebase ──────────────────────────────────────────────────────
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_SERVICE_ACCOUNT_KEY_PATH: str = ""

    # ── VAPID / Web Push ──────────────────────────────────────────────
    VAPID_PRIVATE_KEY: str = ""
    VAPID_PUBLIC_KEY: str = ""
    VAPID_CLAIM_EMAIL: str = ""

    # ── External APIs ─────────────────────────────────────────────────
    OPEN_METEO_BASE_URL: str = "https://air-quality-api.open-meteo.com/v1/air-quality"
    OPENAQ_BASE_URL: str = "https://api.openaq.org/v3"
    OPENAQ_API_KEY: str = ""
    NOMINATIM_BASE_URL: str = "https://nominatim.openstreetmap.org"

    # ── Scheduler ─────────────────────────────────────────────────────
    DATA_COLLECTION_INTERVAL_MINUTES: int = 60

    # ── Security ──────────────────────────────────────────────────────
    SECRET_KEY: str = "change-me-in-production"


settings = Settings()
