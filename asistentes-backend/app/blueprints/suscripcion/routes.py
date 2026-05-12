"""Suscripciones con Mercado Pago (Preapproval API)."""

from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta

from flask import abort, current_app, jsonify, request

from app.utils.auth import requires_auth
from . import bp

log = logging.getLogger(__name__)

PLANES = {
    "solo":    {"monto": 49999, "label": "Plan Solo — Asistentes IA"},
    "negocio": {"monto": 69999, "label": "Plan Negocio — Asistentes IA"},
}


def _mp_sdk():
    import mercadopago
    settings = current_app.config["SETTINGS"]
    if not settings.mp_configured:
        abort(503, description="Mercado Pago no está configurado.")
    return mercadopago.SDK(settings.mp_access_token)


def _admin():
    from app.extensions import get_supabase_admin
    try:
        return get_supabase_admin()
    except RuntimeError as e:
        abort(503, description=str(e))


# ── POST /api/v1/suscripcion/checkout ────────────────────────────────────────

@bp.post("/checkout")
@requires_auth
def checkout():
    """Crea una suscripción en MP y devuelve la URL de pago."""
    cliente_id = request.user["sub"]  # type: ignore[attr-defined]
    body = request.get_json(silent=True) or {}
    plan_key = body.get("plan", "").lower()

    if plan_key not in PLANES:
        abort(400, description=f"Plan inválido. Opciones: {', '.join(PLANES)}")

    settings = current_app.config["SETTINGS"]
    admin = _admin()

    # Obtener email del cliente
    row = (
        admin.table("clientes")
        .select("email, plan")
        .eq("id", cliente_id)
        .execute()
    ).data
    if not row:
        abort(404, description="Cliente no encontrado.")

    cliente = row[0]
    email = cliente.get("email") or ""
    plan_actual = cliente.get("plan", "trial")

    if plan_actual == plan_key:
        abort(409, description=f"Ya tenés el plan {plan_key.capitalize()} activo.")

    plan_cfg = PLANES[plan_key]
    ahora = datetime.now(timezone.utc)
    fin = ahora + timedelta(days=365 * 5)

    sdk = _mp_sdk()

    preapproval_data = {
        "reason": plan_cfg["label"],
        "external_reference": f"{cliente_id}|{plan_key}",
        "payer_email": email,
        "auto_recurring": {
            "frequency": 1,
            "frequency_type": "months",
            "transaction_amount": plan_cfg["monto"],
            "currency_id": "ARS",
            "start_date": ahora.strftime("%Y-%m-%dT%H:%M:%S.000-03:00"),
            "end_date": fin.strftime("%Y-%m-%dT%H:%M:%S.000-03:00"),
        },
        "back_url": settings.mp_back_url,
        "status": "pending",
    }

    if settings.mp_webhook_url:
        preapproval_data["notification_url"] = f"{settings.mp_webhook_url}/api/v1/suscripcion/webhook"

    result = sdk.preapproval().create(preapproval_data)

    if result["status"] not in (200, 201):
        log.error("Error MP al crear preapproval: %s", result)
        abort(502, description="Error al crear la suscripción en Mercado Pago.")

    resp = result["response"]
    preapproval_id = resp.get("id")
    init_point = resp.get("init_point")

    # Guardar el preapproval_id en el cliente para poder cancelar después
    admin.table("clientes").update({
        "mp_preapproval_id": preapproval_id,
        "mp_plan_solicitado": plan_key,
    }).eq("id", cliente_id).execute()

    log.info("Preapproval creado: %s para cliente %s plan %s", preapproval_id, cliente_id, plan_key)
    return jsonify({"checkout_url": init_point, "preapproval_id": preapproval_id})


# ── POST /api/v1/suscripcion/webhook ─────────────────────────────────────────

@bp.post("/webhook")
def webhook():
    """Recibe notificaciones de MP y actualiza el plan del cliente."""
    # Validar firma HMAC-SHA256 de MP
    settings = current_app.config["SETTINGS"]
    if settings.mp_webhook_secret:
        import hashlib
        import hmac
        signature_header = request.headers.get("x-signature", "")
        request_id = request.headers.get("x-request-id", "")
        body_raw = request.get_data(as_text=True)
        # MP firma: ts=...v1=...
        ts = ""
        v1 = ""
        for part in signature_header.split(","):
            part = part.strip()
            if part.startswith("ts="):
                ts = part[3:]
            elif part.startswith("v1="):
                v1 = part[3:]
        manifest = f"id:{(request.get_json(silent=True) or {}).get('data', {}).get('id', '')};request-id:{request_id};ts:{ts};"
        expected = hmac.new(
            settings.mp_webhook_secret.encode(),
            manifest.encode(),
            hashlib.sha256,
        ).hexdigest()
        if v1 and not hmac.compare_digest(expected, v1):
            log.warning("Webhook MP: firma inválida")
            return jsonify({"ok": False}), 401

    body = request.get_json(silent=True) or {}
    topic = body.get("type") or request.args.get("topic", "")
    resource_id = (body.get("data") or {}).get("id") or request.args.get("id", "")

    log.info("Webhook MP: type=%s id=%s", topic, resource_id)

    if topic not in ("preapproval", "subscription_preapproval"):
        return jsonify({"ok": True})

    if not resource_id:
        return jsonify({"ok": True})

    sdk = _mp_sdk()
    result = sdk.preapproval().get(resource_id)

    if result["status"] != 200:
        log.error("No se pudo obtener preapproval %s: %s", resource_id, result)
        return jsonify({"ok": False}), 200  # 200 para que MP no reintente

    preapproval = result["response"]
    status = preapproval.get("status")
    external_ref = preapproval.get("external_reference", "")

    if "|" not in external_ref:
        return jsonify({"ok": True})

    cliente_id, plan_key = external_ref.split("|", 1)
    admin = _admin()

    if status == "authorized":
        # Pago aprobado → activar plan
        admin.table("clientes").update({"plan": plan_key}).eq("id", cliente_id).execute()
        log.info("Plan %s activado para cliente %s", plan_key, cliente_id)

    elif status in ("cancelled", "paused"):
        # Cancelado o pausado → volver a trial
        admin.table("clientes").update({"plan": "trial"}).eq("id", cliente_id).execute()
        log.info("Plan revertido a trial para cliente %s (status MP: %s)", cliente_id, status)

    return jsonify({"ok": True})


# ── DELETE /api/v1/suscripcion ────────────────────────────────────────────────

@bp.delete("")
@requires_auth
def cancelar():
    """Cancela la suscripción activa del cliente."""
    cliente_id = request.user["sub"]  # type: ignore[attr-defined]
    admin = _admin()

    row = (
        admin.table("clientes")
        .select("mp_preapproval_id, plan")
        .eq("id", cliente_id)
        .execute()
    ).data
    if not row:
        abort(404, description="Cliente no encontrado.")

    preapproval_id = row[0].get("mp_preapproval_id")

    # Si hay un preapproval activo en MP, cancelarlo primero
    if preapproval_id:
        sdk = _mp_sdk()
        result = sdk.preapproval().update(preapproval_id, {"status": "cancelled"})
        if result["status"] not in (200, 201):
            log.error("Error cancelando preapproval %s: %s", preapproval_id, result)
            abort(502, description="Error al cancelar en Mercado Pago.")

    admin.table("clientes").update({
        "plan": "trial",
        "mp_preapproval_id": None,
        "mp_plan_solicitado": None,
    }).eq("id", cliente_id).execute()

    log.info("Suscripción cancelada para cliente %s (preapproval: %s)", cliente_id, preapproval_id)
    return jsonify({"ok": True, "plan": "trial"})


# ── GET /api/v1/suscripcion/estado ───────────────────────────────────────────

@bp.get("/estado")
@requires_auth
def estado():
    """Devuelve el plan actual y el preapproval_id del cliente."""
    cliente_id = request.user["sub"]  # type: ignore[attr-defined]
    admin = _admin()

    row = (
        admin.table("clientes")
        .select("plan, mp_preapproval_id, mp_plan_solicitado")
        .eq("id", cliente_id)
        .execute()
    ).data
    if not row:
        abort(404)

    return jsonify(row[0])
