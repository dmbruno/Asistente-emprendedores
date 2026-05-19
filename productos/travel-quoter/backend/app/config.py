"""
config.py — Configuración de plataforma (no incluye keys BYOK del usuario).
Las keys LLM y Duffel del usuario se leen desde Supabase en cada request.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator
from typing import Literal
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Supabase ───────────────────────────────────────────────────────────────
    supabase_url: str = Field(..., description="URL del proyecto Supabase")
    supabase_service_role_key: str = Field(..., description="Service role key (solo backend)")
    supabase_jwt_secret: str = Field(..., description="JWT secret para verificar tokens")

    # ── Fernet (encrypt/decrypt de API keys en DB) ─────────────────────────────
    fernet_master_key: str = Field(..., description="Clave maestra Fernet (base64 32 bytes)")

    # ── Gmail API OAuth2 (envío de cotizaciones) ───────────────────────────────
    gmail_sender: str = Field(..., description="Email Gmail remitente (ej: vos@gmail.com)")
    gmail_client_id: str = Field(..., description="OAuth2 Client ID de Google Cloud")
    gmail_client_secret: str = Field(..., description="OAuth2 Client Secret de Google Cloud")
    gmail_refresh_token: str = Field(..., description="OAuth2 Refresh Token obtenido via Playground")

    # ── FastAPI ────────────────────────────────────────────────────────────────
    backend_host: str = Field(default="0.0.0.0")
    backend_port: int = Field(default=8000)
    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:5173"
    )

    # ── Agent defaults ─────────────────────────────────────────────────────────
    default_model: str = Field(default="claude-opus-4-5")
    default_max_tokens: int = Field(default=8192)
    thinking_budget_tokens: int = Field(default=5000)

    # ── Storage temporal para PDFs ─────────────────────────────────────────────
    quotes_storage_path: str = Field(default="/tmp/quotes")
    templates_path: str = Field(default="templates")

    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(default="INFO")

    # ── SerpAPI (plataforma — clave del dueño de la app, no BYOK) ─────────────
    serpapi_api_key: str = Field(default="", description="SerpAPI key para Google Flights/Hotels/Web")

    @field_validator("quotes_storage_path")
    @classmethod
    def create_quotes_dir(cls, v: str) -> str:
        os.makedirs(v, exist_ok=True)
        return v

    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
