"""Verificación de JWT de Supabase para FastAPI (Depends)."""

from __future__ import annotations

import logging
from typing import Annotated, Any

import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

logger = logging.getLogger(__name__)

_bearer = HTTPBearer()

_jwks_client = PyJWKClient(
    f"{settings.supabase_url}/auth/v1/.well-known/jwks.json",
    cache_keys=True,
)


def _verify_jwt(token: str) -> dict[str, Any]:
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key,
            algorithms=["HS256", "ES256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token expirado")
    except jwt.InvalidTokenError as exc:
        logger.warning("JWT inválido: %s: %s", type(exc).__name__, exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token inválido")
    except Exception as exc:
        logger.error("JWT error inesperado: %s: %s", type(exc).__name__, exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token inválido")


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
) -> dict[str, Any]:
    """FastAPI dependency — devuelve el payload del JWT verificado."""
    return _verify_jwt(credentials.credentials)


CurrentUser = Annotated[dict[str, Any], Depends(get_current_user)]
