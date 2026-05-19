"""Suscripciones con Mercado Pago (Preapproval API)."""

from __future__ import annotations

import hashlib
import hmac
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from supabase import create_client, Client

from app.config import settings
from app.utils.auth import CurrentUser

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/suscripcion", tags=["suscripcion"])

FREE_LIMIT = 3  # cotizaciones reales por mes en plan free

PLANES = {
    "pro": {"monto": 49999, "label": "Cotizador de Viajes Pro — PropioIA"},
}


def _supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def _mp_sdk():
    import mercadopago
    if not settings.mp_configured:
        raise HTTPException(status_code=503, detail="Mercado Pago no está configurado.")
    return mercadopago.SDK(settings.mp_access_token)


# ── Schemas ───────────────────────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    plan: str = "pro"


class EstadoResponse(BaseModel):
    plan: str
    cotizaciones_mes: int
    limite_mes: Optional[int]
    mp_preapproval_id: Optional[str]
    mp_plan_solicitado: Optional[str]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_user_row(user_id: str) -> dict:
    row = (
        _supabase()
        .table("travel_user_configs")
        .select("plan, mp_preapproval_id, mp_plan_solicitado, cotizaciones_mes, cotizaciones_mes_reset")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return row.data or {}


def _ensure_row(user_id: str) -> dict:
    """Crea el row si no existe y lo devuelve."""
    row = _get_user_row(user_id)
    if not row:
        _supabase().table("travel_user_configs").upsert(
            {"user_id": user_id, "plan": "free", "cotizaciones_mes": 0},
            on_conflict="user_id",
        ).execute()
        return {"plan": "free", "cotizaciones_mes": 0, "cotizaciones_mes_reset": None}
    return row


def _reset_if_new_month(user_id: str, row: dict) -> dict:
    """Si el reset fue de otro mes, pone el contador en 0."""
    today = datetime.now(timezone.utc).date()
    reset_date = row.get("cotizaciones_mes_reset")
    if reset_date:
        if isinstance(reset_date, str):
            reset_date = datetime.fromisoformat(reset_date).date()
        if reset_date.month != today.month or reset_date.year != today.year:
            _supabase().table("travel_user_configs").update(
                {"cotizaciones_mes": 0, "cotizaciones_mes_reset": today.isoformat()}
            ).eq("user_id", user_id).execute()
            row = {**row, "cotizaciones_mes": 0}
    return row


# ── GET /api/v1/suscripcion/estado ───────────────────────────────────────────

@router.get("/estado", response_model=EstadoResponse)
async def estado(user: CurrentUser):
    user_id = user["sub"]
    row = _ensure_row(user_id)
    row = _reset_if_new_month(user_id, row)
    plan = row.get("plan", "free")
    return EstadoResponse(
        plan=plan,
        cotizaciones_mes=row.get("cotizaciones_mes", 0),
        limite_mes=FREE_LIMIT if plan == "free" else None,
        mp_preapproval_id=row.get("mp_preapproval_id"),
        mp_plan_solicitado=row.get("mp_plan_solicitado"),
    )


# ── POST /api/v1/suscripcion/checkout ────────────────────────────────────────

@router.post("/checkout")
async def checkout(user: CurrentUser, body: CheckoutRequest):
    plan_key = body.plan.lower()
    if plan_key not in PLANES:
        raise HTTPException(status_code=400, detail=f"Plan inválido. Opciones: {', '.join(PLANES)}")

    user_id = user["sub"]
    row = _get_user_row(user_id)
    if row.get("plan") == plan_key:
        raise HTTPException(status_code=409, detail=f"Ya tenés el plan {plan_key.capitalize()} activo.")

    plan_cfg = PLANES[plan_key]
    ahora = datetime.now(timezone.utc)
    fin = ahora + timedelta(days=365 * 5)

    sdk = _mp_sdk()
    payer_email = user.get("email", "")

    preapproval_data: dict[str, Any] = {
        "reason": plan_cfg["label"],
        "external_reference": f"{user_id}|{plan_key}",
        "payer_email": payer_email,
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
        raise HTTPException(status_code=502, detail="Error al crear la suscripción en Mercado Pago.")

    resp = result["response"]
    preapproval_id = resp.get("id")
    init_point = resp.get("init_point")

    _supabase().table("travel_user_configs").upsert(
        {
            "user_id": user_id,
            "mp_preapproval_id": preapproval_id,
            "mp_plan_solicitado": plan_key,
        },
        on_conflict="user_id",
    ).execute()

    log.info("Preapproval creado: %s para user %s plan %s", preapproval_id, user_id, plan_key)
    return {"checkout_url": init_point, "preapproval_id": preapproval_id}


# ── POST /api/v1/suscripcion/webhook ─────────────────────────────────────────

@router.post("/webhook")
async def webhook(request: Request):
    body_raw = await request.body()
    body = {}
    try:
        import json
        body = json.loads(body_raw)
    except Exception:
        pass

    if settings.mp_webhook_secret:
        signature_header = request.headers.get("x-signature", "")
        request_id = request.headers.get("x-request-id", "")
        ts = ""
        v1 = ""
        for part in signature_header.split(","):
            part = part.strip()
            if part.startswith("ts="):
                ts = part[3:]
            elif part.startswith("v1="):
                v1 = part[3:]
        data_id = (body.get("data") or {}).get("id", "")
        manifest = f"id:{data_id};request-id:{request_id};ts:{ts};"
        expected = hmac.new(
            settings.mp_webhook_secret.encode(),
            manifest.encode(),
            hashlib.sha256,
        ).hexdigest()
        if v1 and not hmac.compare_digest(expected, v1):
            log.warning("Webhook MP: firma inválida")
            return {"ok": False}

    topic = body.get("type") or request.query_params.get("topic", "")
    resource_id = (body.get("data") or {}).get("id") or request.query_params.get("id", "")

    log.info("Webhook MP: type=%s id=%s", topic, resource_id)

    if topic not in ("preapproval", "subscription_preapproval") or not resource_id:
        return {"ok": True}

    sdk = _mp_sdk()
    result = sdk.preapproval().get(resource_id)

    if result["status"] != 200:
        log.error("No se pudo obtener preapproval %s: %s", resource_id, result)
        return {"ok": False}

    preapproval = result["response"]
    mp_status = preapproval.get("status")
    external_ref = preapproval.get("external_reference", "")

    if "|" not in external_ref:
        return {"ok": True}

    user_id, plan_key = external_ref.split("|", 1)

    if mp_status == "authorized":
        _supabase().table("travel_user_configs").update({"plan": plan_key}).eq("user_id", user_id).execute()
        log.info("Plan %s activado para user %s", plan_key, user_id)
    elif mp_status in ("cancelled", "paused"):
        _supabase().table("travel_user_configs").update({"plan": "free"}).eq("user_id", user_id).execute()
        log.info("Plan revertido a free para user %s (status MP: %s)", user_id, mp_status)

    return {"ok": True}


# ── DELETE /api/v1/suscripcion ────────────────────────────────────────────────

@router.delete("")
async def cancelar(user: CurrentUser):
    user_id = user["sub"]
    row = _get_user_row(user_id)
    preapproval_id = row.get("mp_preapproval_id")

    if preapproval_id:
        sdk = _mp_sdk()
        result = sdk.preapproval().update(preapproval_id, {"status": "cancelled"})
        if result["status"] not in (200, 201):
            log.error("Error cancelando preapproval %s: %s", preapproval_id, result)
            raise HTTPException(status_code=502, detail="Error al cancelar en Mercado Pago.")

    _supabase().table("travel_user_configs").update({
        "plan": "free",
        "mp_preapproval_id": None,
        "mp_plan_solicitado": None,
    }).eq("user_id", user_id).execute()

    log.info("Suscripción cancelada para user %s (preapproval: %s)", user_id, preapproval_id)
    return {"ok": True, "plan": "free"}
