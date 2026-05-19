"""Encriptación Fernet para guardar API keys de clientes en reposo."""

from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings


class CryptoError(Exception):
    pass


def _fernet() -> Fernet:
    key = settings.fernet_master_key
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt(plaintext: str) -> str:
    """Encripta un string. Devuelve token Fernet en base64 utf-8."""
    if not isinstance(plaintext, str):
        raise TypeError("plaintext debe ser str")
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt(token: str) -> str:
    """Desencripta un token Fernet. Lanza CryptoError si la llave/token no es válido."""
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken as e:
        raise CryptoError("Token inválido o FERNET_MASTER_KEY incorrecta") from e


def hint(plaintext: str) -> str:
    """Últimos 4 caracteres del plaintext, para mostrar en UI."""
    return plaintext[-4:] if plaintext else ""
