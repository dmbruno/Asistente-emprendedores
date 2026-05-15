"""Verificación de JWT de Supabase para endpoints privados."""

from __future__ import annotations

import logging
from functools import wraps
from typing import Any

import jwt
from jwt import PyJWKClient
from flask import abort, current_app, request

logger = logging.getLogger(__name__)

# Cache de clientes JWKS por URL de Supabase
_jwks_clients: dict[str, PyJWKClient] = {}


def _get_jwks_client(supabase_url: str) -> PyJWKClient:
    if supabase_url not in _jwks_clients:
        _jwks_clients[supabase_url] = PyJWKClient(
            f"{supabase_url}/auth/v1/.well-known/jwks.json",
            cache_keys=True,
        )
    return _jwks_clients[supabase_url]


def _verify_jwt(token: str) -> dict[str, Any]:
    settings = current_app.config["SETTINGS"]
    if not settings.supabase_url:
        abort(503, description="SUPABASE_URL no configurado")

    try:
        client = _get_jwks_client(settings.supabase_url)
        signing_key = client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key,
            algorithms=["ES256", "HS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        abort(401, description="token expirado")
    except jwt.InvalidTokenError as exc:
        logger.warning("JWT inválido: %s: %s", type(exc).__name__, exc)
        abort(401, description="token inválido")
    except Exception as exc:
        logger.error("JWT error inesperado: %s: %s", type(exc).__name__, exc)
        abort(401, description="token inválido")


_DEV_USER: dict[str, Any] = {
    "sub": "91ea734c-7db2-4520-8a67-a064eb7a1720",
    "email": "dmbruno61@gmail.com",
    "role": "authenticated",
    "aud": "authenticated",
}


def requires_auth(fn):
    """Decorador: extrae el JWT del header Authorization y lo deja en request.user."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        settings = current_app.config["SETTINGS"]
        if settings.bypass_auth:
            request.user = _DEV_USER  # type: ignore[attr-defined]
            request.user_jwt = "dev-token-local"  # type: ignore[attr-defined]
            return fn(*args, **kwargs)
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            abort(401, description="falta header Authorization: Bearer <jwt>")
        token = header.removeprefix("Bearer ").strip()
        request.user = _verify_jwt(token)  # type: ignore[attr-defined]
        request.user_jwt = token  # type: ignore[attr-defined]
        return fn(*args, **kwargs)

    return wrapper
