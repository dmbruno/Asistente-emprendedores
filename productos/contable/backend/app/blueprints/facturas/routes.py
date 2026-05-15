"""CRUD de facturas para el dashboard."""

from __future__ import annotations

import csv
import io
import uuid

from flask import Response, abort, current_app, jsonify, request

from app.utils.auth import requires_auth

from . import bp

CAMPOS_CSV = [
    "fecha", "tipo", "tipo_comprobante", "punto_venta", "numero",
    "cuit_contraparte", "razon_social_contraparte",
    "subtotal", "iva", "total", "moneda",
    "estado", "confianza_global", "notas", "created_at",
]

HEADERS_CSV = {
    "fecha": "Fecha",
    "tipo": "Tipo",
    "tipo_comprobante": "Comprobante",
    "punto_venta": "Punto Venta",
    "numero": "Número",
    "cuit_contraparte": "CUIT Contraparte",
    "razon_social_contraparte": "Razón Social Contraparte",
    "subtotal": "Subtotal",
    "iva": "IVA",
    "total": "Total",
    "moneda": "Moneda",
    "estado": "Estado",
    "confianza_global": "Confianza (%)",
    "notas": "Notas",
    "created_at": "Registrado",
}


LIMITE_FACTURAS_MES: dict[str, int | None] = {
    "trial": 5,
    "solo": 80,
    "negocio": None,  # ilimitado
}

PLANES_PREMIUM = {"solo", "negocio"}


def _admin():
    from app.extensions import get_supabase_admin
    try:
        return get_supabase_admin()
    except RuntimeError as e:
        abort(503, description=str(e))


def _get_plan(admin, cliente_id: str) -> str:
    row = (
        admin.table("clientes")
        .select("plan")
        .eq("id", cliente_id)
        .execute()
    ).data
    return (row[0].get("plan") or "trial") if row else "trial"


def _check_limite_facturas_mes(admin, cliente_id: str, plan: str) -> None:
    """Aborta con 402 si el cliente superó el límite mensual de su plan."""
    limite = LIMITE_FACTURAS_MES.get(plan)
    if limite is None:
        return  # ilimitado

    from datetime import date
    hoy = date.today()
    inicio_mes = f"{hoy.year}-{hoy.month:02d}-01"
    fin_mes = (
        f"{hoy.year + 1}-01-01" if hoy.month == 12
        else f"{hoy.year}-{hoy.month + 1:02d}-01"
    )

    count = (
        admin.table("facturas")
        .select("id", count="exact")
        .eq("cliente_id", cliente_id)
        .neq("estado", "rechazada")
        .gte("created_at", inicio_mes)
        .lt("created_at", fin_mes)
        .execute()
    ).count or 0

    if count >= limite:
        abort(402, description=(
            f"Alcanzaste el límite de {limite} facturas/mes del plan {plan.capitalize()}. "
            "Actualizá tu plan en el dashboard para continuar."
        ))


@bp.get("")
@requires_auth
def list_facturas():
    cliente_id = request.user["sub"]  # type: ignore[attr-defined]
    admin = _admin()

    result = (
        admin.table("facturas")
        .select(
            "id, tipo, tipo_comprobante, numero, fecha, "
            "cuit_contraparte, razon_social_contraparte, "
            "subtotal, iva, total, moneda, estado, confianza_global, created_at"
        )
        .eq("cliente_id", cliente_id)
        .order("created_at", desc=True)
        .execute()
    )
    items = result.data or []
    return jsonify({"items": items, "total": len(items)})


def _get_cliente(admin, cliente_id: str) -> dict:
    row = (
        admin.table("clientes")
        .select("plan, condicion_fiscal, categoria_monotributo")
        .eq("id", cliente_id)
        .execute()
    ).data
    return row[0] if row else {}


@bp.get("/resumen")
@requires_auth
def resumen():
    cliente_id = request.user["sub"]  # type: ignore[attr-defined]
    mes = request.args.get("mes", type=int)
    anio = request.args.get("anio", type=int)
    admin = _admin()

    query = (
        admin.table("facturas")
        .select("tipo, total, subtotal, iva, iva_21, iva_10_5, iva_27, estado")
        .eq("cliente_id", cliente_id)
        .neq("estado", "rechazada")
    )
    if mes and anio:
        desde = f"{anio}-{mes:02d}-01"
        hasta = f"{anio+1}-01-01" if mes == 12 else f"{anio}-{mes+1:02d}-01"
        query = query.gte("fecha", desde).lt("fecha", hasta)

    facturas = query.execute().data or []

    # Solo las confirmadas/corregidas cuentan para totales fiscales
    confirmadas = [f for f in facturas if f["estado"] in ("confirmada", "corregida")]
    pendientes = sum(1 for f in facturas if f["estado"] == "pendiente_revision")

    compras = sum(f["total"] or 0 for f in confirmadas if f["tipo"] == "compra")
    ventas  = sum(f["total"] or 0 for f in confirmadas if f["tipo"] == "venta")

    cliente = _get_cliente(admin, cliente_id)
    condicion_fiscal = (cliente.get("condicion_fiscal") or "monotributo").lower()

    response: dict = {
        "totales": {"compras": compras, "ventas": ventas, "neto": ventas - compras},
        "cantidad": {
            "compras": sum(1 for f in confirmadas if f["tipo"] == "compra"),
            "ventas": sum(1 for f in confirmadas if f["tipo"] == "venta"),
            "pendientes": pendientes,
        },
        "condicion_fiscal": condicion_fiscal,
    }

    if condicion_fiscal == "responsable_inscripto":
        debito = sum(
            (f.get("iva_21") or 0) + (f.get("iva_10_5") or 0) + (f.get("iva_27") or 0)
            for f in confirmadas if f["tipo"] == "venta"
        )
        credito = sum(
            (f.get("iva_21") or 0) + (f.get("iva_10_5") or 0) + (f.get("iva_27") or 0)
            for f in confirmadas if f["tipo"] == "compra"
        )
        response["posicion_iva"] = {
            "debito_fiscal": debito,
            "credito_fiscal": credito,
            "saldo": debito - credito,
        }

    return jsonify(response)


@bp.get("/resumen/anual")
@requires_auth
def resumen_anual():
    """Totales por mes del año + ventas acumuladas para control de tope monotributo / posición IVA RI."""
    cliente_id = request.user["sub"]  # type: ignore[attr-defined]
    anio = request.args.get("anio", type=int) or __import__("datetime").date.today().year
    admin = _admin()

    facturas = (
        admin.table("facturas")
        .select("tipo, total, fecha, estado, iva_21, iva_10_5, iva_27")
        .eq("cliente_id", cliente_id)
        .neq("estado", "rechazada")
        .gte("fecha", f"{anio}-01-01")
        .lt("fecha", f"{anio+1}-01-01")
        .execute()
    ).data or []

    # Solo confirmadas/corregidas cuentan para totales y acumulados
    confirmadas = [f for f in facturas if f.get("estado") in ("confirmada", "corregida")]

    meses = {m: {"mes": m, "compras": 0.0, "ventas": 0.0, "debito_iva": 0.0, "credito_iva": 0.0} for m in range(1, 13)}
    for f in confirmadas:
        if not f.get("fecha"):
            continue
        m = int(f["fecha"].split("-")[1])
        total = f["total"] or 0
        iva_row = (f.get("iva_21") or 0) + (f.get("iva_10_5") or 0) + (f.get("iva_27") or 0)
        if f["tipo"] == "compra":
            meses[m]["compras"] += total
            meses[m]["credito_iva"] += iva_row
        else:
            meses[m]["ventas"] += total
            meses[m]["debito_iva"] += iva_row

    ventas_acumuladas  = sum(f["total"] or 0 for f in confirmadas if f["tipo"] == "venta")
    compras_acumuladas = sum(f["total"] or 0 for f in confirmadas if f["tipo"] == "compra")

    cliente = _get_cliente(admin, cliente_id)
    condicion_fiscal = (cliente.get("condicion_fiscal") or "monotributo").lower()

    return jsonify({
        "anio": anio,
        "condicion_fiscal": condicion_fiscal,
        "por_mes": list(meses.values()),
        "acumulado": {
            "ventas": ventas_acumuladas,
            "compras": compras_acumuladas,
        },
    })


@bp.get("/export/csv")
@requires_auth
def export_csv():
    cliente_id = request.user["sub"]  # type: ignore[attr-defined]
    admin = _admin()
    plan = _get_plan(admin, cliente_id)
    if plan not in PLANES_PREMIUM:
        abort(402, description="El export CSV está disponible desde el plan Solo.")
    tipo = request.args.get("tipo")  # "compra" | "venta" | None

    query = (
        admin.table("facturas")
        .select(", ".join(CAMPOS_CSV))
        .eq("cliente_id", cliente_id)
        .in_("estado", ["confirmada", "corregida"])
        .order("fecha", desc=True)
    )
    if tipo in ("compra", "venta"):
        query = query.eq("tipo", tipo)

    facturas = query.execute().data or []

    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=list(HEADERS_CSV.values()),
        extrasaction="ignore",
    )
    writer.writeheader()
    for f in facturas:
        writer.writerow({HEADERS_CSV[k]: f.get(k, "") for k in CAMPOS_CSV})

    nombre = f"facturas_{tipo or 'todas'}.csv"
    return Response(
        output.getvalue(),
        mimetype="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={nombre}"},
    )


@bp.get("/<factura_id>")
@requires_auth
def get_factura(factura_id: str):
    cliente_id = request.user["sub"]  # type: ignore[attr-defined]
    admin = _admin()

    result = (
        admin.table("facturas")
        .select("*, items_factura(*)")
        .eq("id", factura_id)
        .eq("cliente_id", cliente_id)
        .execute()
    )
    if not result.data:
        abort(404, description="Factura no encontrada")
    return jsonify(result.data[0])


@bp.patch("/<factura_id>")
@requires_auth
def update_factura(factura_id: str):
    cliente_id = request.user["sub"]  # type: ignore[attr-defined]
    body = request.get_json(silent=True) or {}
    admin = _admin()

    campos_editables = {"tipo", "estado", "notas", "categoria"}
    update_data = {k: v for k, v in body.items() if k in campos_editables}
    if not update_data:
        abort(400, description="Sin campos editables")

    admin.table("facturas").update(update_data).eq("id", factura_id).eq("cliente_id", cliente_id).execute()
    return jsonify({"id": factura_id, "updated": True})


@bp.delete("/<factura_id>")
@requires_auth
def delete_factura(factura_id: str):
    cliente_id = request.user["sub"]  # type: ignore[attr-defined]
    admin = _admin()
    admin.table("facturas").delete().eq("id", factura_id).eq("cliente_id", cliente_id).execute()
    return "", 204


@bp.post("/upload")
@requires_auth
def upload_factura():
    settings = current_app.config["SETTINGS"]

    file = request.files.get("image")
    if not file:
        abort(400, description="Falta campo 'image' en el form-data")

    image_bytes = file.read()
    media_type = file.content_type or "image/jpeg"
    cliente_id = request.user["sub"]  # type: ignore[attr-defined]
    admin = _admin()
    cliente_info = _get_cliente(admin, cliente_id)
    plan = (cliente_info.get("plan") or "trial")
    condicion_fiscal = (cliente_info.get("condicion_fiscal") or "monotributo").lower()
    _check_limite_facturas_mes(admin, cliente_id, plan)

    if settings.mock_claude:
        from app.services.extraccion_ia import extraer_factura
        factura = extraer_factura(image_bytes, "mock-key", media_type, condicion_fiscal=condicion_fiscal)
        factura_id = f"mock-{uuid.uuid4().hex[:8]}"
        return jsonify({
            "factura_id": factura_id,
            "estado": "pendiente_revision",
            "datos_extraidos": factura.model_dump(by_alias=True),
        }), 201

    from app.utils.crypto import CryptoError, decrypt
    from app.services.extraccion_ia import ExtraccionError, extraer_factura

    admin = _admin()

    _AI_PROVIDERS = ["google", "anthropic", "openai"]
    api_key: str | None = None
    ia_provider: str | None = None
    for _prov in _AI_PROVIDERS:
        _result = (
            admin.table("api_keys")
            .select("encrypted_key")
            .eq("cliente_id", cliente_id)
            .eq("provider", _prov)
            .execute()
        )
        if _result.data:
            try:
                api_key = decrypt(_result.data[0]["encrypted_key"])
                ia_provider = _prov
                break
            except CryptoError as e:
                abort(500, description=f"Error desencriptando API key: {e}")

    if not api_key:
        abort(422, description="No tenés una API key de IA configurada. Ingresá al dashboard → API Keys para cargarla.")

    try:
        factura = extraer_factura(
            image_bytes, api_key, media_type,
            provider=ia_provider or "anthropic",
            condicion_fiscal=condicion_fiscal,
        )
    except ExtraccionError as e:
        abort(422, description=str(e))

    factura_id = str(uuid.uuid4())
    iva_total = factura.iva_21 + factura.iva_10_5 + factura.iva_27

    factura_row: dict = {
        "id": factura_id,
        "cliente_id": cliente_id,
        "tipo": "compra",
        "imagen_path": f"{cliente_id}/{factura_id}",
        "tipo_comprobante": factura.tipo_comprobante,
        "punto_venta": factura.punto_venta,
        "numero": factura.numero,
        "fecha": factura.fecha,
        "cuit_contraparte": factura.emisor.cuit,
        "razon_social_contraparte": factura.emisor.razon_social,
        "subtotal": factura.subtotal,
        "iva": iva_total,
        "total": factura.total,
        "moneda": factura.moneda,
        "extraccion_json": factura.model_dump(by_alias=True),
        "confianza_global": factura.confianza.global_,
        "estado": "pendiente_revision",
    }
    if condicion_fiscal == "responsable_inscripto":
        factura_row["neto_gravado"] = factura.neto_gravado
        factura_row["iva_21"] = factura.iva_21
        factura_row["iva_10_5"] = factura.iva_10_5
        factura_row["iva_27"] = factura.iva_27

    admin.table("facturas").insert(factura_row).execute()

    return jsonify({
        "factura_id": factura_id,
        "estado": "pendiente_revision",
        "datos_extraidos": factura.model_dump(by_alias=True),
    }), 201


@bp.get("/resumen/excel")
@requires_auth
def resumen_excel():
    cliente_id = request.user["sub"]  # type: ignore[attr-defined]
    admin = _admin()
    plan = _get_plan(admin, cliente_id)
    if plan not in PLANES_PREMIUM:
        abort(402, description="El export Excel está disponible desde el plan Solo.")
    # TODO: generar Excel con services/excel_export.
    return Response(b"", mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
