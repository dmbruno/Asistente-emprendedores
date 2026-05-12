"""Verificación de JWT de Supabase para endpoints privados."""

from __future__ import annotations

import base64
import logging
from functools import wraps
from typing import Any

import jwt
from flask import abort, current_app, request

logger = logging.getLogger(__name__)


def _verify_jwt(token: str) -> dict[str, Any]:
    settings = current_app.config["SETTINGS"]
    if not settings.supabase_jwt_secret:
        abort(503, description="SUPABASE_JWT_SECRET no configurado")

    # Diagnóstico: decodificar sin verificar para ver header/aud
    try:
        header = jwt.get_unverified_header(token)
        unverified = jwt.decode(token, options={"verify_signature": False})
        logger.info("JWT header: %s | aud=%s | iss=%s", header, unverified.get("aud"), unverified.get("iss"))
    except Exception as e:
        logger.error("JWT decode (sin verificar) falló: %s", e)

    secret_raw = settings.supabase_jwt_secret
    logger.info("JWT secret len=%d, starts=%s", len(secret_raw), secret_raw[:8])

    secrets_to_try: list[tuple[str, str | bytes]] = [("raw", secret_raw)]
    try:
        secrets_to_try.append(("b64decoded", base64.b64decode(secret_raw)))
    except Exception:
        pass

    for label, secret in secrets_to_try:
        try:
            return jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except jwt.ExpiredSignatureError:
            abort(401, description="token expirado")
        except jwt.InvalidTokenError as exc:
            logger.warning("JWT falló [%s]: %s: %s", label, type(exc).__name__, exc)

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
