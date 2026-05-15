"""Endpoints del cliente logueado: GET/PATCH /me + consulta CUIT."""

from __future__ import annotations

import logging

import requests as http_requests
from flask import abort, jsonify, request

from app.utils.auth import requires_auth
from app.utils.cuit import format_with_dashes, is_valid, normalize

from . import bp

logger = logging.getLogger(__name__)


def _admin():
    from app.extensions import get_supabase_admin
    try:
        return get_supabase_admin()
    except RuntimeError as e:
        abort(503, description=str(e))


@bp.get("/me")
@requires_auth
def me():
    cliente_id = request.user["sub"]  # type: ignore[attr-defined]
    admin = _admin()

    result = admin.table("clientes").select("*").eq("id", cliente_id).execute()
    if not result.data:
        return jsonify({
            "id": cliente_id,
            "email": request.user.get("email"),  # type: ignore[attr-defined]
            "condicion_fiscal": "monotributo",
            "categoria_monotributo": None,
            "plan": "trial",
        })
    return jsonify(result.data[0])


@bp.patch("/me")
@requires_auth
def update_me():
    cliente_id = request.user["sub"]  # type: ignore[attr-defined]
    body = request.get_json(silent=True) or {}
    admin = _admin()

    campos_editables = {
        "razon_social", "cuit", "whatsapp",
        "condicion_fiscal", "categoria_monotributo",
        "afip_punto_venta",
    }
    update_data = {k: v for k, v in body.items() if k in campos_editables}
    if not update_data:
        abort(400, description="Sin campos editables")

    # Si cambia la condición fiscal a no-monotributo, limpiar la categoría
    if update_data.get("condicion_fiscal") in ("responsable_inscripto", "exento"):
        update_data["categoria_monotributo"] = None

    result = admin.table("clientes").select("id").eq("id", cliente_id).execute()
    if result.data:
        admin.table("clientes").update(update_data).eq("id", cliente_id).execute()
    else:
        # Crear fila si no existe (primer guardado desde la UI)
        email = request.user.get("email", "")  # type: ignore[attr-defined]
        admin.table("clientes").insert({
            "id": cliente_id,
            "email": email,
            "razon_social": update_data.get("razon_social", ""),
            "cuit": update_data.get("cuit", "00-00000000-0"),
            "whatsapp": update_data.get("whatsapp", ""),
            **{k: v for k, v in update_data.items()
               if k not in ("razon_social", "cuit", "whatsapp")},
        }).execute()

    return jsonify({"updated": True})


@bp.get("/consultar-cuit")
@requires_auth
def consultar_cuit():
    """Valida checksum CUIT y consulta padrón AFIP público."""
    cuit_raw = request.args.get("cuit", "").strip()

    if not cuit_raw:
        abort(400, description="Falta parámetro 'cuit'")

    if not is_valid(cuit_raw):
        return jsonify({
            "valido": False,
            "error": "El dígito verificador del CUIT es incorrecto.",
        }), 422

    cuit_clean = normalize(cuit_raw)
    cuit_fmt = format_with_dashes(cuit_raw)

    # Intento consulta al padrón público de AFIP
    padron = _consultar_afip(cuit_clean)

    return jsonify({
        "valido": True,
        "cuit": cuit_fmt,
        **padron,
    })


def _consultar_afip(cuit: str) -> dict:
    """
    Consulta el servicio público de AFIP (sin certificado).
    Devuelve datos básicos si está disponible, o stub si falla.
    El endpoint oficial requiere cert; este fallback usa el lookup público.
    """
    # Endpoint público de AFIP para consulta de padrón (sin cert, datos básicos)
    url = f"https://soa.afip.gob.ar/sr-padron/v2/persona/{cuit}"
    headers = {"Accept": "application/json"}

    try:
        resp = http_requests.get(url, headers=headers, timeout=6)
        if resp.status_code == 200:
            data = resp.json().get("data", {})
            return _mapear_padron_afip(cuit, data)
        # 401/403 → requiere cert; devolvemos stub con checksum válido
        logger.info("AFIP padrón HTTP %s para CUIT %s", resp.status_code, cuit)
    except Exception as exc:
        logger.warning("Error consultando AFIP para %s: %s", cuit, exc)

    return {
        "razon_social": None,
        "condicion_iva": None,
        "estado": None,
        "fuente": "checksum",
        "mensaje": "CUIT válido. Datos de AFIP no disponibles sin certificado digital.",
    }


def _mapear_padron_afip(cuit: str, data: dict) -> dict:
    """Mapea la respuesta JSON de AFIP al formato interno."""
    if not data:
        return {"razon_social": None, "condicion_iva": None, "estado": None, "fuente": "stub"}

    # Construir razón social desde campos del padrón
    razon = data.get("razonSocial")
    if not razon:
        apellido = data.get("apellido", "")
        nombre = data.get("nombre", "")
        razon = f"{apellido} {nombre}".strip() or None

    # Determinar condición IVA desde impuestos registrados
    condicion_iva = None
    impuestos = data.get("impuesto", [])
    for imp in impuestos:
        if imp.get("idImpuesto") == 32:  # IVA
            condicion_iva = imp.get("descripcionCategoria")
            break

    return {
        "razon_social": razon,
        "condicion_iva": condicion_iva,
        "estado": data.get("estado"),
        "tipo_persona": data.get("tipoPersona"),
        "fuente": "afip",
    }
