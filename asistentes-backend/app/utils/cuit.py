"""Validación y formateo de CUIT/CUIL argentino."""

from __future__ import annotations

import re

_DIGITS_RE = re.compile(r"\D+")
_MULTIPLIERS = (5, 4, 3, 2, 7, 6, 5, 4, 3, 2)


def normalize(cuit: str) -> str:
    """Quita guiones, espacios y caracteres no numéricos."""
    return _DIGITS_RE.sub("", cuit or "")


def is_valid(cuit: str) -> bool:
    """Valida el dígito verificador del CUIT."""
    digits = normalize(cuit)
    if len(digits) != 11:
        return False
    base = digits[:10]
    check = int(digits[10])
    s = sum(int(d) * m for d, m in zip(base, _MULTIPLIERS))
    remainder = s % 11
    expected = 11 - remainder
    if expected == 11:
        expected = 0
    elif expected == 10:
        return False  # CUIT inválido por convención
    return expected == check


def format_with_dashes(cuit: str) -> str:
    """Formatea como XX-XXXXXXXX-X. Si no es válido, devuelve el original."""
    digits = normalize(cuit)
    if len(digits) != 11:
        return cuit
    return f"{digits[:2]}-{digits[2:10]}-{digits[10]}"
