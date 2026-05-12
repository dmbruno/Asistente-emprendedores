"""Validación de CUIT con dígito verificador."""

import pytest

from app.utils import cuit


@pytest.mark.parametrize(
    "valor",
    [
        "20-12345678-1",  # ejemplo conocido válido (CUIT real ficticio)
        "30-71234567-8",
        "27-12345678-3",
    ],
)
def test_cuits_validos_normalizan_y_formatean(valor):
    digits = cuit.normalize(valor)
    assert len(digits) == 11
    assert cuit.format_with_dashes(valor) == f"{digits[:2]}-{digits[2:10]}-{digits[10]}"


def test_cuit_invalido_por_longitud():
    assert cuit.is_valid("123") is False
    assert cuit.is_valid("") is False


def test_cuit_invalido_por_checksum():
    # CUIT con checksum incorrecto a propósito
    assert cuit.is_valid("20-12345678-9") is False


def test_normalize_quita_no_digitos():
    assert cuit.normalize("20-12345678-1") == "20123456781"
    assert cuit.normalize("CUIT: 20.123-456.78/1") == "20123456781"
