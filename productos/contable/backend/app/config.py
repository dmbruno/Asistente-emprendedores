"""Carga y validación de variables de entorno con Pydantic Settings."""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    flask_env: str = "development"
    secret_key: str = "dev-secret"
    log_level: str = "INFO"

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    supabase_bucket_facturas: str = "facturas-imagenes"

    master_key: str = ""

    baileys_shared_secret: str = ""
    baileys_internal_url: str = "http://localhost:3001"

    afip_cert_path: str = ""
    afip_key_path: str = ""
    afip_cuit: str = ""
    afip_production: bool = False

    sentry_dsn: str = ""

    mp_access_token: str = ""
    mp_public_key: str = ""
    mp_webhook_url: str = ""
    mp_webhook_secret: str = ""
    mp_back_url: str = "http://localhost:3000/dashboard"

    @property
    def mp_configured(self) -> bool:
        return bool(self.mp_access_token)

    # Flags de modo desarrollo (no usar en producción)
    mock_claude: bool = False
    bypass_auth: bool = False

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)

    @property
    def afip_configured(self) -> bool:
        return bool(self.afip_cert_path and self.afip_key_path and self.afip_cuit)

    @property
    def crypto_configured(self) -> bool:
        return bool(self.master_key)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
