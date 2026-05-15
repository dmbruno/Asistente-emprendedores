"""Encriptación Fernet para guardar API keys de clientes en reposo."""

from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken

from app.config import get_settings


class CryptoError(Exception):
    pass


def _fernet() -> Fernet:
    key = get_settings().master_key
    if not key:
        raise CryptoError(
            "MASTER_KEY no configurada. Generar con "
            "python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
        )
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
        raise CryptoError("Token inválido o MASTER_KEY incorrecta") from e


def hint(plaintext: str) -> str:
    """Últimos 4 caracteres del plaintext, para mostrar en UI."""
    if not plaintext:
        return ""
    return plaintext[-4:]
