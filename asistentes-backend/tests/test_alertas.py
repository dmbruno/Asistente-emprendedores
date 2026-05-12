"""Cálculo de alertas de tope monotributo."""

from app.services.alertas import (
    TOPES_MONOTRIBUTO_2026,
    UMBRAL_ALERTA,
    debe_alertar,
    porcentaje_uso,
)


def test_porcentaje_uso_categoria_a():
    tope = TOPES_MONOTRIBUTO_2026["A"]
    assert porcentaje_uso(tope * 0.5, "A") == 0.5
    assert porcentaje_uso(tope, "A") == 1.0


def test_debe_alertar_dispara_en_75_porciento():
    tope = TOPES_MONOTRIBUTO_2026["B"]
    assert debe_alertar(tope * 0.74, "B") is False
    assert debe_alertar(tope * UMBRAL_ALERTA, "B") is True
    assert debe_alertar(tope * 1.2, "B") is True


def test_categoria_inexistente_no_alerta():
    assert debe_alertar(1_000_000, "Z") is False
    assert porcentaje_uso(1_000_000, "Z") is None
