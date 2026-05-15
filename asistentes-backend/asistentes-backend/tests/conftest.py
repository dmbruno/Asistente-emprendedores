"""Fixtures comunes de pytest."""

from __future__ import annotations

import os

import pytest
from cryptography.fernet import Fernet

from app import create_app
from app.config import Settings


@pytest.fixture
def settings_test() -> Settings:
    """Settings con valores válidos para tests sin tocar .env."""
    os.environ["MASTER_KEY"] = Fernet.generate_key().decode()
    return Settings(
        flask_env="testing",
        secret_key="test-secret",
        master_key=os.environ["MASTER_KEY"],
        baileys_shared_secret="test-shared",
        supabase_jwt_secret="test-jwt-secret",
    )


@pytest.fixture
def app(settings_test: Settings):
    return create_app(settings=settings_test)


@pytest.fixture
def client(app):
    return app.test_client()
