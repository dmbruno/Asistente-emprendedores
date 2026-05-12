"""Endpoints privados (JWT) para gestionar la conexión WhatsApp del cliente."""

from __future__ import annotations

import logging

import requests as http_requests
from flask import abort, current_app, jsonify

from app.utils.auth import requires_auth
from flask import request as flask_request

from . import bp

log = logging.getLogger(__name__)


def _baileys_headers() -> dict:
    settings = current_app.config["SETTINGS"]
    return {"X-Baileys-Token": settings.baileys_shared_secret, "Content-Type": "application/json"}


def _baileys_url(path: str) -> str:
    settings = current_app.config["SETTINGS"]
    return f"{settings.baileys_internal_url}{path}"


@bp.get("/status")
@requires_auth
def status():
    """Estado de la sesión WhatsApp del cliente."""
    cliente_id = flask_request.user["sub"]  # type: ignore[attr-defined]
    try:
        r = http_requests.get(
            _baileys_url(f"/instances/{cliente_id}/status"),
            headers=_baileys_headers(),
            timeout=5,
        )
        return jsonify(r.json())
    except Exception as exc:
        log.warning("Baileys no disponible: %s", exc)
        return jsonify({"status": "desconectado", "qr": None, "baileys_offline": True})


@bp.post("/connect")
@requires_auth
def connect():
    """Inicia la instancia y devuelve el QR si no está conectada."""
    cliente_id = flask_request.user["sub"]  # type: ignore[attr-defined]
    try:
        r = http_requests.post(
            _baileys_url(f"/instances/{cliente_id}/qr"),
            headers=_baileys_headers(),
            timeout=10,
        )
        return jsonify(r.json())
    except Exception as exc:
        log.warning("Baileys no disponible: %s", exc)
        abort(503, description="El servicio de WhatsApp no está disponible en este momento.")


@bp.delete("/disconnect")
@requires_auth
def disconnect():
    """Desvincula la sesión WhatsApp del cliente."""
    cliente_id = flask_request.user["sub"]  # type: ignore[attr-defined]
    try:
        http_requests.delete(
            _baileys_url(f"/instances/{cliente_id}"),
            headers=_baileys_headers(),
            timeout=5,
        )
    except Exception:
        pass
    return jsonify({"disconnected": True})
