"""Interpretación de respuestas en la FSM de WhatsApp."""

from app.services.conversacion import interpretar_respuesta


def test_interpreta_si():
    assert interpretar_respuesta("si") == "si"
    assert interpretar_respuesta("Sí") == "si"
    assert interpretar_respuesta("OK") == "si"
    assert interpretar_respuesta("👍") == "si"


def test_interpreta_no():
    assert interpretar_respuesta("no") == "no"
    assert interpretar_respuesta("Mal") == "no"
    assert interpretar_respuesta("👎") == "no"


def test_texto_libre_es_correccion():
    assert interpretar_respuesta("el total es 42000") == "correccion"


def test_vacio_es_desconocido():
    assert interpretar_respuesta("") == "desconocido"
    assert interpretar_respuesta("   ") == "desconocido"
