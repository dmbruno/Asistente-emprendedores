"""Clientes externos (Supabase, Anthropic).

Anthropic: se instancia POR REQUEST con la api_key del cliente (BYOK), no global.
Supabase: hay un cliente con service_role para operaciones de servidor y se
construye uno con el JWT del usuario para queries en su nombre.
"""

from __future__ import annotations

from functools import lru_cache

from anthropic import Anthropic
from supabase import Client, create_client

from app.config import get_settings


@lru_cache(maxsize=1)
def get_supabase_admin() -> Client:
    """Cliente Supabase con service_role. Solo para operaciones del servidor."""
    settings = get_settings()
    if not settings.supabase_configured:
        raise RuntimeError(
            "Supabase no configurado. Definir SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env"
        )
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def get_supabase_user(jwt: str) -> Client:
    """Cliente Supabase con el JWT del usuario. RLS aplica."""
    settings = get_settings()
    if not settings.supabase_configured:
        raise RuntimeError("Supabase no configurado")
    client = create_client(settings.supabase_url, settings.supabase_anon_key)
    client.postgrest.auth(jwt)
    return client


def get_anthropic_client(api_key: str) -> Anthropic:
    """Cliente Anthropic con la api_key del cliente (BYOK)."""
    if not api_key:
        raise ValueError("api_key vacía")
    return Anthropic(api_key=api_key)
