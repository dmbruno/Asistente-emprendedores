"""Roundtrip de Fernet: encrypt → decrypt devuelve el original."""

from app.utils import crypto


def test_encrypt_decrypt_roundtrip(settings_test):
    plaintext = "sk-ant-api03-abcdef123456"
    token = crypto.encrypt(plaintext)
    assert token != plaintext
    assert crypto.decrypt(token) == plaintext


def test_hint_devuelve_ultimos_4(settings_test):
    assert crypto.hint("sk-ant-api03-abcdef123456") == "3456"
    assert crypto.hint("") == ""
