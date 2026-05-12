"""Verificación de JWT de Supabase para endpoints privados."""

from __future__ import annotations

import base64
from functools import wraps
from typing import Any

import jwt
from flask import abort, current_app, request


def _verify_jwt(token: str) -> dict[str, Any]:
    settings = current_app.config["SETTINGS"]
    if not settings.supabase_jwt_secret:
        abort(503, description="SUPABASE_JWT_SECRET no configurado")

    secret_raw = settings.supabase_jwt_secret
    # El dashboard de Supabase muestra el JWT secret en base64.
    # Probamos primero el valor tal cual (string plano) y luego decodificado,
    # para soportar ambas formas sin depender de cómo se cargó la variable.
    secrets_to_try: list[str | bytes] = [secret_raw]
    try:
        secrets_to_try.append(base64.b64decode(secret_raw))
    except Exception:
        pass

    last_exc: Exception | None = None
    for secret in secrets_to_try:
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
            last_exc = exc

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
