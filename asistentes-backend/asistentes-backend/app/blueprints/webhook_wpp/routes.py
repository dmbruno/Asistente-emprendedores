"""Webhooks llamados por el bot Baileys (autenticados con shared secret)."""

from __future__ import annotations

import base64
import logging
import re
import threading
import uuid
from datetime import datetime, timedelta, timezone

from flask import abort, current_app, jsonify, request

from . import bp

log = logging.getLogger(__name__)

COMANDOS_CONFIRMACION = {"si", "sí", "confirmar", "ok", "confirmado", "dale"}
COMANDOS_RECHAZO = {"no", "rechazar", "cancelar", "borrar", "eliminar"}
COMANDOS_SALUDO = {
    "hola", "hola!", "hi", "hello", "buenas", "buenas!", "buenos dias",
    "buenas tardes", "buenas noches", "inicio", "start", "comenzar", "empezar",
}

# "factura a María López $12000 consultoría web"
# "emitir factura a Juan $5.500"
_RE_EMISION = re.compile(
    r'(?:emitir\s+)?factura\s+a\s+(?P<nombre>[^$\n]+?)\s*'
    r'\$\s*(?P<monto>[\d.,]+)'
    r'(?:\s+(?P<concepto>.+))?',
    re.IGNORECASE,
)

def _bienvenida() -> str:
    return (
        "👋 ¡Bienvenido/a a *PropioIA*!\n"
        "Tu asistente contable inteligente 🤖\n\n"
        "Registrá compras y ventas, emitís facturas y seguís tu situación fiscal — "
        "todo desde WhatsApp, sin complicaciones.\n\n"
        "Escribí *ayuda* para ver qué puedo hacer por vos 👇"
    )


def _menu_ayuda(condicion_fiscal: str = "monotributo") -> str:
    if condicion_fiscal == "responsable_inscripto":
        return (
            "🧾 *PropioIA — Menú principal*\n\n"
            "📸 *Foto de factura*\n"
            "   → La proceso y registro automáticamente\n\n"
            "✅ *si* · ❌ *no*\n"
            "   → Confirmar o descartar una factura pendiente\n\n"
            "📄 *emitir factura*\n"
            "   → Emitir Factura A o B con IVA discriminado\n\n"
            "📊 *resumen*\n"
            "   → Totales del mes y posición de IVA\n\n"
            "❓ *ayuda*\n"
            "   → Ver este menú\n\n"
            "_PropioIA — tu contabilidad en WhatsApp_ ✨"
        )
    return (
        "🧾 *PropioIA — Menú principal*\n\n"
        "📸 *Foto de factura*\n"
        "   → La proceso y registro automáticamente\n\n"
        "✅ *si* · ❌ *no*\n"
        "   → Confirmar o descartar una factura pendiente\n\n"
        "📄 *factura a [nombre] $[monto] [concepto]*\n"
        "   → Emitir una Factura C\n"
        "   _Ej: factura a María López $15000 diseño web_\n\n"
        "📊 *resumen*\n"
        "   → Totales del mes y tope de categoría\n\n"
        "❓ *ayuda*\n"
        "   → Ver este menú\n\n"
        "_PropioIA — tu contabilidad en WhatsApp_ ✨"
    )


def _check_shared_secret() -> None:
    settings = current_app.config["SETTINGS"]
    expected = settings.baileys_shared_secret
    if not expected:
        abort(503, description="BAILEYS_SHARED_SECRET no configurado")
    if request.headers.get("X-Baileys-Token") != expected:
        abort(401, description="shared secret inválido")


def _admin():
    from app.extensions import get_supabase_admin
    try:
        return get_supabase_admin()
    except RuntimeError as e:
        abort(503, description=str(e))


@bp.post("/factura")
def factura():
    _check_shared_secret()

    body = request.get_json(silent=True) or {}
    cliente_id: str = body.get("cliente_id", "")
    tipo: str = body.get("tipo", "compra")
    imagen_base64: str = body.get("imagen_base64", "")
    remitente: str = body.get("remitente", "")

    if not cliente_id or not imagen_base64:
        abort(400, description="cliente_id e imagen_base64 son requeridos")

    if tipo not in ("compra", "venta"):
        tipo = "compra"

    from app.utils.crypto import CryptoError, decrypt
    from app.services.extraccion_ia import ExtraccionError, extraer_factura

    admin = _admin()

    # Verificar plan y límite mensual; obtener condicion_fiscal para routing del prompt
    _LIMITE_MES = {"trial": 5, "solo": 80, "negocio": None}
    cliente_row = (
        admin.table("clientes")
        .select("plan, condicion_fiscal, cuit")
        .eq("id", cliente_id)
        .execute()
    ).data
    plan = (cliente_row[0].get("plan") or "trial") if cliente_row else "trial"
    condicion_fiscal = (cliente_row[0].get("condicion_fiscal") or "monotributo") if cliente_row else "monotributo"
    cuit_cliente = (cliente_row[0].get("cuit") or "") if cliente_row else ""
    limite = _LIMITE_MES.get(plan)
    if limite is not None:
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
            _enviar_mensaje(cliente_id, remitente, (
                f"⚠️ *Límite del mes alcanzado*\n\n"
                f"Ya registraste {limite} facturas este mes en tu plan *{plan.capitalize()}*.\n\n"
                f"Para seguir sin límites, actualizá tu plan desde el dashboard 👉 propoia.com.ar/dashboard\n\n"
                f"Escribí *ayuda* si necesitás orientación."
            ))
            return jsonify({"factura_id": None, "resumen_texto": None}), 402

    # Obtener API key del cliente: buscar cualquier provider de IA configurado
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
            except CryptoError:
                abort(500, description="Error desencriptando API key")

    if not api_key:
        _enviar_mensaje(cliente_id, remitente,
                        "No tenés una API key de IA configurada. Ingresá al dashboard → API Keys para cargarla.")
        return jsonify({"factura_id": None, "resumen_texto": None}), 422

    try:
        image_bytes = base64.b64decode(imagen_base64)
    except Exception:
        abort(400, description="imagen_base64 inválida")

    # Detectar tipo de archivo real desde magic bytes
    media_type = _detectar_media_type(image_bytes)

    # PDFs con Gemini no son soportados inline — pedir foto en su lugar
    if media_type == "application/pdf" and ia_provider == "google":
        respuesta = (
            "Recibí un PDF, pero necesito una *foto* del comprobante para procesarlo. "
            "Tomá una foto con la cámara o convertí el PDF a imagen antes de mandarlo."
        )
        return jsonify({"factura_id": None, "resumen_texto": respuesta})

    try:
        factura_data = extraer_factura(
            image_bytes, api_key, media_type,
            provider=ia_provider or "anthropic",
            condicion_fiscal=condicion_fiscal,
        )
    except ExtraccionError as e:
        msg = str(e)
        if "no_es_comprobante" in msg:
            respuesta = "No pude identificar esto como una factura. Enviame una foto más clara del comprobante."
        else:
            respuesta = f"Hubo un problema al procesar la imagen: {msg}"
        return jsonify({"factura_id": None, "resumen_texto": respuesta})

    # Persistir en DB
    factura_id = str(uuid.uuid4())
    iva_total = factura_data.iva_21 + factura_data.iva_10_5 + factura_data.iva_27

    factura_row: dict = {
        "id": factura_id,
        "cliente_id": cliente_id,
        "tipo": tipo,
        "imagen_path": f"{cliente_id}/{factura_id}",
        "tipo_comprobante": factura_data.tipo_comprobante,
        "punto_venta": factura_data.punto_venta,
        "numero": factura_data.numero,
        "fecha": factura_data.fecha,
        "cuit_contraparte": factura_data.emisor.cuit,
        "razon_social_contraparte": factura_data.emisor.razon_social,
        "subtotal": factura_data.subtotal,
        "iva": iva_total,
        "total": factura_data.total,
        "moneda": factura_data.moneda,
        "extraccion_json": factura_data.model_dump(by_alias=True),
        "confianza_global": factura_data.confianza.global_,
        "estado": "pendiente_revision",
        "notas": f"wpp:{remitente}",
    }
    # Para RI guardamos el desglose de IVA por alícuota y el neto gravado
    if condicion_fiscal == "responsable_inscripto":
        factura_row["neto_gravado"] = factura_data.neto_gravado
        factura_row["iva_21"] = factura_data.iva_21
        factura_row["iva_10_5"] = factura_data.iva_10_5
        factura_row["iva_27"] = factura_data.iva_27

    admin.table("facturas").insert(factura_row).execute()

    # Construir resumen para responder por WhatsApp
    confianza = factura_data.confianza.global_
    emisor = factura_data.emisor.razon_social or "Emisor desconocido"
    total_fmt = _fmt_pesos(factura_data.total)
    tipo_label = "Compra" if tipo == "compra" else "Venta"
    confianza_emoji = "✅" if confianza >= 80 else "⚠️" if confianza >= 60 else "❓"

    # Detectar si la factura está dirigida a otro CUIT (solo en compras)
    advertencia_receptor = ""
    if tipo == "compra":
        cuit_receptor_factura = (factura_data.receptor.cuit or "").replace("-", "").replace(" ", "")
        cuit_propio = cuit_cliente.replace("-", "").replace(" ", "")
        tipo_cbte = (factura_data.tipo_comprobante or "").upper()
        # Facturas A y B siempre tienen receptor con CUIT — si la IA no lo extrajo, advertir igual
        es_factura_ab = any(tipo_cbte.startswith(p) for p in ("A", "B", "FACTURA A", "FACTURA B"))

        if cuit_receptor_factura and cuit_propio and cuit_receptor_factura != cuit_propio:
            receptor_nombre = factura_data.receptor.razon_social or cuit_receptor_factura
            advertencia_receptor = (
                f"\n\n⚠️ *Esta factura está a nombre de {receptor_nombre} "
                f"(CUIT {factura_data.receptor.cuit}), no al tuyo.*\n"
                "Si no te pertenece, respondé *no* para descartarla."
            )
        elif es_factura_ab and not cuit_receptor_factura and cuit_propio:
            advertencia_receptor = (
                f"\n\n⚠️ *No pude leer el CUIT receptor de esta factura.*\n"
                f"Verificá que esté dirigida a tu CUIT ({cuit_cliente}) antes de confirmar.\n"
                "Si no es tuya, respondé *no* para descartarla."
            )

    resumen = (
        f"{confianza_emoji} *{tipo_label} detectada* (confianza {confianza}%)\n\n"
        f"📋 *{factura_data.tipo_comprobante or 'Comprobante'}* N° {factura_data.numero or '—'}\n"
        f"🏢 {emisor}\n"
        f"📅 {factura_data.fecha or '—'}\n"
        f"💰 *{total_fmt} {factura_data.moneda}*"
        f"{advertencia_receptor}\n\n"
        f"Respondé *si* para confirmar o *no* para descartar."
    )

    return jsonify({
        "factura_id": factura_id,
        "resumen_texto": resumen,
        "requiere_confirmacion": True,
    })


@bp.post("/comando")
def comando():
    _check_shared_secret()

    body = request.get_json(silent=True) or {}
    cliente_id: str = body.get("cliente_id", "")
    texto_original: str = body.get("texto", "").strip()
    texto: str = texto_original.lower()
    remitente: str = body.get("remitente", "")

    if not cliente_id:
        abort(400, description="cliente_id requerido")

    admin = _admin()

    # ── Saludos → bienvenida (antes del wizard para no bloquearlo) ───────────
    if texto.strip().rstrip("!?.") in COMANDOS_SALUDO:
        return jsonify({"respuesta": _bienvenida()})

    # ── Verificar si hay un wizard RI activo (tiene prioridad sobre todo) ────
    ri_ctx = _pendiente_ri(admin, cliente_id)
    if ri_ctx:
        return _manejar_paso_ri(admin, cliente_id, texto_original.strip(), ri_ctx, remitente)

    # ── Detectar "emitir factura" como comando standalone (RI y mono) ─────────
    _texto_norm = texto.strip()
    if _texto_norm in ("emitir factura", "emitir", "nueva factura", "factura"):
        cf_row = (
            admin.table("clientes")
            .select("condicion_fiscal")
            .eq("id", cliente_id)
            .execute()
        ).data
        condicion_fiscal = (cf_row[0].get("condicion_fiscal") or "monotributo") if cf_row else "monotributo"
        if condicion_fiscal == "responsable_inscripto":
            return _iniciar_wizard_ri(admin, cliente_id, None, remitente)
        # Monotributista: pedir el formato completo
        return jsonify({"respuesta": (
            "Para emitir una Factura C usá el formato:\n"
            "*factura a [nombre] $[monto] [concepto]*\n\n"
            "Ejemplo: _factura a María López $15000 diseño web_"
        )})

    # ── Detectar "factura a X [$Y concepto]" (mono, formato completo) ─────────
    m = _RE_EMISION.search(texto_original)
    if m:
        nombre = m.group("nombre").strip().title()

        # Obtener condicion_fiscal del cliente
        cf_row = (
            admin.table("clientes")
            .select("condicion_fiscal")
            .eq("id", cliente_id)
            .execute()
        ).data
        condicion_fiscal = (cf_row[0].get("condicion_fiscal") or "monotributo") if cf_row else "monotributo"

        if condicion_fiscal == "responsable_inscripto":
            return _iniciar_wizard_ri(admin, cliente_id, nombre, remitente)

        # — Flujo monotributista (Factura C) —
        concepto = (m.group("concepto") or "servicios").strip()
        monto_s  = (m.group("monto") or "0").replace(".", "").replace(",", ".")
        try:
            monto = float(monto_s)
        except ValueError:
            return jsonify({"respuesta": "No pude leer el monto. Usá el formato: *factura a Nombre $12000 concepto*"})

        expires = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
        admin.table("conversaciones_wpp").delete().eq("cliente_id", cliente_id).execute()
        admin.table("conversaciones_wpp").insert({
            "cliente_id": cliente_id,
            "estado": "esperando_confirmacion",
            "contexto": {
                "tipo": "emision_factura",
                "nombre": nombre,
                "monto": monto,
                "concepto": concepto,
                "remitente": remitente,
            },
            "expires_at": expires,
        }).execute()

        return jsonify({"respuesta": (
            f"📄 Voy a emitir una *Factura C*:\n\n"
            f"👤 *A:* {nombre}\n"
            f"💰 *Monto:* {_fmt_pesos(monto)}\n"
            f"📝 *Concepto:* {concepto}\n\n"
            f"Respondé *SI* para confirmar o *NO* para cancelar."
        )})

    # ── SI / NO — puede ser confirmación de factura escaneada O emisión ──────
    if texto in COMANDOS_CONFIRMACION:
        # Primero verificar si hay una emisión pendiente de confirmar
        emision = _pendiente_emision(admin, cliente_id)
        if emision:
            admin.table("conversaciones_wpp").delete().eq("cliente_id", cliente_id).execute()
            return _emitir_factura_confirmada(admin, cliente_id, emision, remitente)

        # Si no, buscar factura escaneada pendiente
        ultima = _ultima_pendiente(admin, cliente_id, remitente)
        if ultima:
            admin.table("facturas").update({"estado": "confirmada"}).eq("id", ultima["id"]).execute()
            emisor = ultima.get("razon_social_contraparte") or "—"
            return jsonify({"respuesta": f"✅ Factura de {emisor} confirmada y registrada."})
        return jsonify({"respuesta": "No hay facturas pendientes de confirmación."})

    if texto in COMANDOS_RECHAZO:
        # Cancelar emisión pendiente si existe
        emision = _pendiente_emision(admin, cliente_id)
        if emision:
            admin.table("conversaciones_wpp").delete().eq("cliente_id", cliente_id).execute()
            return jsonify({"respuesta": "❌ Emisión cancelada."})

        # Si no, rechazar factura escaneada pendiente
        ultima = _ultima_pendiente(admin, cliente_id, remitente)
        if ultima:
            admin.table("facturas").update({"estado": "rechazada"}).eq("id", ultima["id"]).execute()
            return jsonify({"respuesta": "🗑️ Factura descartada."})
        return jsonify({"respuesta": "No hay facturas pendientes."})

    if texto in ("ayuda", "help", "menu", "menú", "comandos"):
        cf_row = (
            admin.table("clientes")
            .select("condicion_fiscal")
            .eq("id", cliente_id)
            .execute()
        ).data
        cond = (cf_row[0].get("condicion_fiscal") or "monotributo") if cf_row else "monotributo"
        return jsonify({"respuesta": _menu_ayuda(cond)})

    if "resumen" in texto:
        from datetime import date
        hoy = date.today()

        # Totales anuales — solo confirmadas/corregidas
        facturas_anio = (
            admin.table("facturas")
            .select("tipo, total")
            .eq("cliente_id", cliente_id)
            .in_("estado", ["confirmada", "corregida"])
            .gte("fecha", f"{hoy.year}-01-01")
            .lt("fecha", f"{hoy.year + 1}-01-01")
            .execute()
        ).data or []
        compras_anio = sum(f["total"] or 0 for f in facturas_anio if f["tipo"] == "compra")
        ventas_anio  = sum(f["total"] or 0 for f in facturas_anio if f["tipo"] == "venta")

        # Totales del mes actual — solo confirmadas/corregidas
        facturas_mes = (
            admin.table("facturas")
            .select("tipo, total")
            .eq("cliente_id", cliente_id)
            .in_("estado", ["confirmada", "corregida"])
            .gte("fecha", f"{hoy.year}-{hoy.month:02d}-01")
            .lt("fecha", f"{hoy.year + 1}-01-01" if hoy.month == 12
                else f"{hoy.year}-{hoy.month + 1:02d}-01")
            .execute()
        ).data or []
        compras_mes = sum(f["total"] or 0 for f in facturas_mes if f["tipo"] == "compra")
        ventas_mes  = sum(f["total"] or 0 for f in facturas_mes if f["tipo"] == "venta")

        # Datos del cliente para tope (mono) o posición IVA (RI)
        TOPES_MONOTRIBUTO = {
            "A": 7_400_000,  "B": 11_000_000, "C": 15_400_000, "D": 19_100_000,
            "E": 23_100_000, "F": 27_500_000, "G": 32_100_000, "H": 37_900_000,
            "I": 45_200_000, "J": 54_100_000, "K": 65_100_000,
        }
        cliente_row = (
            admin.table("clientes")
            .select("condicion_fiscal, categoria_monotributo")
            .eq("id", cliente_id)
            .execute()
        ).data
        tope_linea = ""
        if cliente_row:
            c = cliente_row[0]
            cond = (c.get("condicion_fiscal") or "").lower()

            if cond == "responsable_inscripto":
                # Posición de IVA del mes: débito fiscal (ventas) - crédito fiscal (compras)
                facturas_iva = (
                    admin.table("facturas")
                    .select("tipo, iva_21, iva_10_5, iva_27")
                    .eq("cliente_id", cliente_id)
                    .in_("estado", ["confirmada", "corregida"])
                    .gte("fecha", f"{hoy.year}-{hoy.month:02d}-01")
                    .lt("fecha", f"{hoy.year + 1}-01-01" if hoy.month == 12
                        else f"{hoy.year}-{hoy.month + 1:02d}-01")
                    .execute()
                ).data or []
                debito = sum(
                    (f.get("iva_21") or 0) + (f.get("iva_10_5") or 0) + (f.get("iva_27") or 0)
                    for f in facturas_iva if f["tipo"] == "venta"
                )
                credito = sum(
                    (f.get("iva_21") or 0) + (f.get("iva_10_5") or 0) + (f.get("iva_27") or 0)
                    for f in facturas_iva if f["tipo"] == "compra"
                )
                posicion = debito - credito
                if posicion > 0:
                    tope_linea = f"\n🔵 *Posición IVA:* Débito {_fmt_pesos(debito)} - Crédito {_fmt_pesos(credito)} = *{_fmt_pesos(posicion)} a pagar*"
                elif posicion < 0:
                    tope_linea = f"\n🟢 *Posición IVA:* Saldo a favor {_fmt_pesos(abs(posicion))}"
                else:
                    tope_linea = f"\n⚪ *Posición IVA:* Neutro (débito = crédito)"

            elif cond == "monotributo":
                cat = (c.get("categoria_monotributo") or "").upper()
                tope = TOPES_MONOTRIBUTO.get(cat) if cat else None
                if tope:
                    pct = min(ventas_anio / tope * 100, 100)
                    semaforo = "🔴" if pct >= 90 else "🟡" if pct >= 75 else "🟢"
                    tope_linea = (
                        f"\n{semaforo} *Tope Cat. {cat}:* "
                        f"{_fmt_pesos(ventas_anio)} / {_fmt_pesos(tope)} "
                        f"({pct:.1f}%)"
                    )
                else:
                    tope_linea = "\n⚙️ Configurá tu categoría de monotributo en el dashboard para ver el tope."

        return jsonify({"respuesta": (
            f"📊 *Resumen {hoy.year}*\n\n"
            f"📈 Ventas: {_fmt_pesos(ventas_anio)}\n"
            f"🛒 Compras: {_fmt_pesos(compras_anio)}\n"
            f"💰 Neto: {_fmt_pesos(ventas_anio - compras_anio)}"
            f"{tope_linea}\n\n"
            f"📅 *{hoy.strftime('%B')}*\n"
            f"📈 {_fmt_pesos(ventas_mes)} | 🛒 {_fmt_pesos(compras_mes)}"
        )})

    cf_row0 = (
        admin.table("clientes")
        .select("condicion_fiscal")
        .eq("id", cliente_id)
        .execute()
    ).data
    cond0 = (cf_row0[0].get("condicion_fiscal") or "monotributo") if cf_row0 else "monotributo"
    return jsonify({"respuesta": _menu_ayuda(cond0)})


def _pendiente_emision(admin, cliente_id: str) -> dict | None:
    """Devuelve el contexto de emisión pendiente de confirmación, si existe y no venció."""
    rows = (
        admin.table("conversaciones_wpp")
        .select("contexto, expires_at")
        .eq("cliente_id", cliente_id)
        .eq("estado", "esperando_confirmacion")
        .execute()
    ).data
    if not rows:
        return None
    row = rows[0]
    ctx = row.get("contexto") or {}
    if ctx.get("tipo") != "emision_factura":
        return None
    exp = row.get("expires_at")
    if exp:
        try:
            if datetime.fromisoformat(exp) < datetime.now(timezone.utc):
                return None
        except Exception:
            pass
    return ctx


def _emitir_factura_confirmada(admin, cliente_id: str, ctx: dict, remitente: str):
    """Llama a AFIP (o mock) y guarda la factura emitida en la DB."""
    from app.services.afip_facturacion import emitir_factura_c, AfipError

    nombre   = ctx.get("nombre", "Sin nombre")
    monto    = float(ctx.get("monto", 0))
    concepto = ctx.get("concepto", "servicios")

    # Obtener CUIT y razón social del cliente emisor
    row = (admin.table("clientes").select("cuit, razon_social").eq("id", cliente_id).execute()).data
    cuit_emisor       = row[0]["cuit"].replace("-", "") if row else "00000000000"
    razon_social      = (row[0].get("razon_social") or "Monotributista") if row else "Monotributista"

    try:
        resultado = emitir_factura_c(
            cliente_id=cliente_id,
            cuit_emisor=cuit_emisor,
            nombre_receptor=nombre,
            cuit_receptor=None,
            total=monto,
            concepto=concepto,
        )
    except AfipError as e:
        return jsonify({"respuesta": f"❌ Error al emitir la factura: {e}"})

    # Guardar en facturas
    factura_id = str(uuid.uuid4())
    admin.table("facturas").insert({
        "id": factura_id,
        "cliente_id": cliente_id,
        "tipo": "venta",
        "tipo_comprobante": "C",
        "punto_venta": str(resultado.punto_venta).zfill(4),
        "numero": str(resultado.numero).zfill(8),
        "fecha": resultado.fecha,
        "razon_social_contraparte": nombre,
        "total": resultado.total,
        "subtotal": resultado.total,
        "iva": 0,
        "moneda": "ARS",
        "imagen_path": f"{cliente_id}/{factura_id}",
        "estado": "confirmada",
        "notas": f"cae:{resultado.cae} | wpp:{remitente}",
        "confianza_global": 100,
    }).execute()

    modo = " *(MODO PRUEBA)*" if resultado.homo else ""
    texto_respuesta = (
        f"✅ *Factura C emitida{modo}*\n\n"
        f"📋 N° {resultado.numero_fmt()}\n"
        f"👤 {nombre}\n"
        f"💰 {_fmt_pesos(resultado.total)} ARS\n"
        f"🔑 *CAE:* {resultado.cae}\n"
        f"📅 Vence CAE: {resultado.vencimiento_fmt()}\n\n"
        f"📎 El PDF llega en un momento."
    )

    threading.Thread(
        target=_enviar_pdf_factura,
        kwargs=dict(
            cliente_id=cliente_id,
            remitente=remitente,
            razon_social_emisor=razon_social,
            cuit_emisor=cuit_emisor,
            punto_venta=resultado.punto_venta,
            numero=resultado.numero,
            fecha=resultado.fecha,
            nombre_receptor=nombre,
            concepto=concepto,
            total=resultado.total,
            cae=resultado.cae,
            vencimiento_cae=resultado.vencimiento_cae,
            modo=modo,
        ),
        daemon=True,
    ).start()

    return jsonify({"respuesta": texto_respuesta})


def _ultima_pendiente(admin, cliente_id: str, remitente: str) -> dict | None:
    result = (
        admin.table("facturas")
        .select("id, razon_social_contraparte, notas")
        .eq("cliente_id", cliente_id)
        .eq("estado", "pendiente_revision")
        .like("notas", f"wpp:{remitente}%")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def _fmt_pesos(n: float) -> str:
    return f"${n:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _detectar_media_type(data: bytes) -> str:
    """Detecta el mime type real del archivo desde sus magic bytes."""
    if data[:4] == b"%PDF":
        return "application/pdf"
    if data[:2] == b"\xff\xd8":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:4] in (b"RIFF",) and data[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"  # fallback


# ── Wizard de emisión RI ──────────────────────────────────────────────────────

def _pendiente_ri(admin, cliente_id: str) -> dict | None:
    """Devuelve el contexto del wizard RI si existe y no venció."""
    rows = (
        admin.table("conversaciones_wpp")
        .select("contexto, expires_at")
        .eq("cliente_id", cliente_id)
        .eq("estado", "esperando_confirmacion")
        .execute()
    ).data
    if not rows:
        return None
    row = rows[0]
    ctx = row.get("contexto") or {}
    if ctx.get("tipo") != "emision_ri":
        return None
    exp = row.get("expires_at")
    if exp:
        try:
            if datetime.fromisoformat(exp) < datetime.now(timezone.utc):
                return None
        except Exception:
            pass
    return ctx


def _iniciar_wizard_ri(admin, cliente_id: str, nombre: str | None, remitente: str):
    """Arranca el wizard multi-paso de emisión para RI."""
    expires = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    admin.table("conversaciones_wpp").delete().eq("cliente_id", cliente_id).execute()

    # Si ya tenemos nombre (ej: "factura a María $15000"), empezamos en "cuit"
    # Si no (ej: "emitir factura" solo), primero preguntamos el nombre del receptor
    paso_inicial = "cuit" if nombre else "nombre_receptor"
    pasos_totales = "5" if nombre else "6"

    admin.table("conversaciones_wpp").insert({
        "cliente_id": cliente_id,
        "estado": "esperando_confirmacion",
        "contexto": {
            "tipo": "emision_ri",
            "paso": paso_inicial,
            "pasos_totales": pasos_totales,
            "datos": {"nombre": nombre, "remitente": remitente},
        },
        "expires_at": expires,
    }).execute()

    if nombre:
        return jsonify({"respuesta": (
            f"📄 Voy a emitir una factura para *{nombre}*.\n\n"
            f"*Paso 1/5 — CUIT del receptor*\n"
            f"Escribilo con guiones: 20-12345678-1\n"
            f"Si es consumidor final escribí *sin CUIT*."
        )})
    return jsonify({"respuesta": (
        f"📄 *Nueva factura A/B*\n\n"
        f"*Paso 1/6 — Nombre del receptor*\n"
        f"Escribí el nombre de la empresa o persona a quien emitís."
    )})


def _guardar_paso_ri(admin, cliente_id: str, ctx: dict) -> None:
    """Persiste el estado actual del wizard en la DB."""
    expires = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    admin.table("conversaciones_wpp").delete().eq("cliente_id", cliente_id).execute()
    admin.table("conversaciones_wpp").insert({
        "cliente_id": cliente_id,
        "estado": "esperando_confirmacion",
        "contexto": ctx,
        "expires_at": expires,
    }).execute()


def _manejar_paso_ri(admin, cliente_id: str, texto: str, ctx: dict, remitente: str):
    """Maneja cada paso del wizard de emisión RI según el paso actual."""
    paso  = ctx.get("paso", "cuit")
    datos = ctx.get("datos", {})

    def _avanzar(nuevo_paso: str, nuevos_datos: dict, respuesta: str):
        ctx["paso"] = nuevo_paso
        ctx["datos"] = {**datos, **nuevos_datos}
        _guardar_paso_ri(admin, cliente_id, ctx)
        return jsonify({"respuesta": respuesta})

    # ── Cancelar en cualquier paso ────────────────────────────────────────────
    if texto.strip().lower() in COMANDOS_RECHAZO and paso != "confirmar":
        admin.table("conversaciones_wpp").delete().eq("cliente_id", cliente_id).execute()
        return jsonify({"respuesta": "❌ Emisión cancelada."})

    # ── Paso 1/6: Nombre del receptor (solo cuando se arranca sin nombre) ────
    if paso == "nombre_receptor":
        nombre_ingresado = texto.strip()
        if len(nombre_ingresado) < 2:
            return jsonify({"respuesta": "Escribí el nombre completo de la empresa o persona."})
        return _avanzar("cuit", {"nombre": nombre_ingresado}, (
            f"✅ *Receptor:* {nombre_ingresado}\n\n"
            f"*Paso 2/6 — CUIT del receptor*\n"
            f"Escribilo con guiones: 20-12345678-1\n"
            f"Si es consumidor final escribí *sin CUIT*."
        ))

    # ── Paso 1/5 (o 2/6): CUIT del receptor ──────────────────────────────────
    if paso == "cuit":
        txt = texto.strip().lower()
        if any(p in txt for p in ("sin", "consumidor", "final", "s/n")):
            cuit_receptor = None
            label_cuit = "Consumidor final"
        else:
            cuit_limpio = texto.strip().replace("-", "").replace(" ", "")
            if not (cuit_limpio.isdigit() and len(cuit_limpio) == 11):
                return jsonify({"respuesta": (
                    "❌ El CUIT debe tener 11 dígitos.\n"
                    "Escribilo así: 20-12345678-1\n"
                    "O escribí *sin CUIT* si es consumidor final."
                )})
            cuit_receptor = f"{cuit_limpio[:2]}-{cuit_limpio[2:10]}-{cuit_limpio[10]}"
            label_cuit = cuit_receptor

        return _avanzar("tipo", {"cuit_receptor": cuit_receptor}, (
            f"✅ *CUIT:* {label_cuit}\n\n"
            f"*Paso 2/5 — Tipo de comprobante*\n"
            f"• *A* — El receptor es Responsable Inscripto (IVA discriminado)\n"
            f"• *B* — Consumidor final, monotributista o exento"
        ))

    # ── Paso 2: Tipo A o B ────────────────────────────────────────────────────
    if paso == "tipo":
        tipo = texto.strip().upper()
        if tipo not in ("A", "B"):
            return jsonify({"respuesta": "Respondé *A* (Resp. Inscripto) o *B* (Consumidor final / monotributista)."})
        return _avanzar("concepto", {"tipo_cbte": tipo}, (
            f"✅ *Factura {tipo}*\n\n"
            f"*Paso 3/5 — Concepto*\n"
            f"Describí el servicio o producto (ej: consultoría web enero 2026)."
        ))

    # ── Paso 3: Concepto ──────────────────────────────────────────────────────
    if paso == "concepto":
        if len(texto.strip()) < 3:
            return jsonify({"respuesta": "Escribí una descripción más detallada."})
        return _avanzar("neto", {"concepto": texto.strip()}, (
            f"✅ *Concepto:* {texto.strip()}\n\n"
            f"*Paso 4/5 — Neto gravado*\n"
            f"Escribí el monto SIN IVA (ej: 50000)."
        ))

    # ── Paso 4: Neto gravado ──────────────────────────────────────────────────
    if paso == "neto":
        monto_s = texto.strip().replace("$", "").replace(".", "").replace(",", ".")
        try:
            neto = float(monto_s)
            if neto <= 0:
                raise ValueError
        except ValueError:
            return jsonify({"respuesta": "❌ No pude leer el monto. Escribí solo el número (ej: 50000)."})
        return _avanzar("alicuota", {"neto": neto}, (
            f"✅ *Neto gravado:* {_fmt_pesos(neto)}\n\n"
            f"*Paso 5/5 — Alícuota de IVA*\n"
            f"• *1* — 21% (más común)\n"
            f"• *2* — 10,5%\n"
            f"• *3* — 27%"
        ))

    # ── Paso 5: Alícuota ──────────────────────────────────────────────────────
    if paso == "alicuota":
        ALICUOTAS = {"1": 21.0, "21": 21.0, "2": 10.5, "10.5": 10.5, "10,5": 10.5, "3": 27.0, "27": 27.0}
        ali_key = texto.strip().replace("%", "").strip()
        alicuota = ALICUOTAS.get(ali_key)
        if alicuota is None:
            return jsonify({"respuesta": "Respondé *1* (21%), *2* (10,5%) o *3* (27%)."})

        neto     = float(datos.get("neto", 0))
        iva_monto = round(neto * alicuota / 100, 2)
        total    = round(neto + iva_monto, 2)
        tipo_cbte = datos.get("tipo_cbte", "B")
        cuit_receptor = datos.get("cuit_receptor")
        nombre   = datos.get("nombre", "Receptor")
        concepto = datos.get("concepto", "servicios")

        resumen = (
            f"📋 *Resumen — Factura {tipo_cbte}*\n\n"
            f"👤 *Receptor:* {nombre}\n"
            f"🔢 *CUIT:* {cuit_receptor or 'Consumidor final'}\n"
            f"📝 *Concepto:* {concepto}\n\n"
            f"💰 Neto gravado: {_fmt_pesos(neto)}\n"
            f"🧾 IVA {alicuota:.4g}%: {_fmt_pesos(iva_monto)}\n"
            f"📊 *Total: {_fmt_pesos(total)} ARS*\n\n"
            f"Respondé *SI* para emitir o *NO* para cancelar."
        )
        return _avanzar("confirmar", {"alicuota": alicuota, "iva_monto": iva_monto, "total": total}, resumen)

    # ── Paso 6: Confirmación final ─────────────────────────────────────────────
    if paso == "confirmar":
        if texto.strip().lower() in COMANDOS_RECHAZO:
            admin.table("conversaciones_wpp").delete().eq("cliente_id", cliente_id).execute()
            return jsonify({"respuesta": "❌ Emisión cancelada."})
        if texto.strip().lower() not in COMANDOS_CONFIRMACION:
            return jsonify({"respuesta": "Respondé *SI* para emitir o *NO* para cancelar."})

        admin.table("conversaciones_wpp").delete().eq("cliente_id", cliente_id).execute()
        return _emitir_ri_confirmada(admin, cliente_id, datos, remitente)

    cf_row2 = (
        admin.table("clientes")
        .select("condicion_fiscal")
        .eq("id", cliente_id)
        .execute()
    ).data
    cond2 = (cf_row2[0].get("condicion_fiscal") or "monotributo") if cf_row2 else "monotributo"
    return jsonify({"respuesta": "No entendí ese comando.\n\n" + _menu_ayuda(cond2)})


def _emitir_ri_confirmada(admin, cliente_id: str, datos: dict, remitente: str):
    """Llama al servicio AFIP y guarda la Factura A/B en la DB."""
    from app.services.afip_facturacion import emitir_factura_ab, AfipError

    nombre        = datos.get("nombre") or "Sin nombre"
    cuit_receptor = datos.get("cuit_receptor")
    tipo_cbte     = datos.get("tipo_cbte", "B")
    concepto      = datos.get("concepto", "servicios")
    neto          = float(datos.get("neto", 0))
    alicuota      = float(datos.get("alicuota", 21.0))
    iva_monto     = float(datos.get("iva_monto", 0))
    total         = float(datos.get("total", 0))

    row = (admin.table("clientes").select("cuit, razon_social").eq("id", cliente_id).execute()).data
    cuit_emisor  = row[0]["cuit"].replace("-", "") if row else "00000000000"
    razon_social = (row[0].get("razon_social") or "Resp. Inscripto") if row else "Resp. Inscripto"

    try:
        resultado = emitir_factura_ab(
            cliente_id=cliente_id,
            cuit_emisor=cuit_emisor,
            nombre_receptor=nombre,
            cuit_receptor=cuit_receptor,
            tipo_cbte=tipo_cbte,
            neto_gravado=neto,
            alicuota=alicuota,
            iva_monto=iva_monto,
            total=total,
            concepto=concepto,
        )
    except AfipError as e:
        return jsonify({"respuesta": f"❌ Error al emitir la factura: {e}"})

    factura_id = str(uuid.uuid4())
    iva_21  = iva_monto if alicuota == 21.0 else 0.0
    iva_105 = iva_monto if alicuota == 10.5 else 0.0
    iva_27  = iva_monto if alicuota == 27.0 else 0.0

    admin.table("facturas").insert({
        "id": factura_id,
        "cliente_id": cliente_id,
        "tipo": "venta",
        "tipo_comprobante": tipo_cbte,
        "punto_venta": str(resultado.punto_venta).zfill(4),
        "numero": str(resultado.numero).zfill(8),
        "fecha": resultado.fecha,
        "cuit_contraparte": cuit_receptor,
        "razon_social_contraparte": nombre,
        "subtotal": neto,
        "neto_gravado": neto,
        "iva": iva_monto,
        "iva_21": iva_21,
        "iva_10_5": iva_105,
        "iva_27": iva_27,
        "total": total,
        "moneda": "ARS",
        "imagen_path": f"{cliente_id}/{factura_id}",
        "estado": "confirmada",
        "notas": f"cae:{resultado.cae} | wpp:{remitente}",
        "confianza_global": 100,
    }).execute()

    modo = " *(MODO PRUEBA)*" if resultado.homo else ""
    texto_respuesta = (
        f"✅ *Factura {tipo_cbte} emitida{modo}*\n\n"
        f"📋 N° {resultado.numero_fmt()}\n"
        f"👤 {nombre}"
        + (f"\n🔢 CUIT: {cuit_receptor}" if cuit_receptor else "") +
        f"\n\n💰 Neto: {_fmt_pesos(neto)}\n"
        f"🧾 IVA {alicuota:.4g}%: {_fmt_pesos(iva_monto)}\n"
        f"📊 *Total: {_fmt_pesos(total)} ARS*\n"
        f"🔑 *CAE:* {resultado.cae}\n"
        f"📅 Vence CAE: {resultado.vencimiento_fmt()}\n\n"
        f"📎 El PDF llega en un momento."
    )

    threading.Thread(
        target=_enviar_pdf_factura_ab,
        kwargs=dict(
            cliente_id=cliente_id,
            remitente=remitente,
            razon_social_emisor=razon_social,
            cuit_emisor=cuit_emisor,
            tipo_cbte=tipo_cbte,
            punto_venta=resultado.punto_venta,
            numero=resultado.numero,
            fecha=resultado.fecha,
            nombre_receptor=nombre,
            cuit_receptor=cuit_receptor,
            concepto=concepto,
            neto_gravado=neto,
            alicuota=alicuota,
            iva_monto=iva_monto,
            total=total,
            cae=resultado.cae,
            vencimiento_cae=resultado.vencimiento_cae,
            modo=modo,
        ),
        daemon=True,
    ).start()

    return jsonify({"respuesta": texto_respuesta})


def _enviar_mensaje(cliente_id: str, remitente: str, texto: str) -> None:
    import requests as http_req
    from app.config import get_settings
    s = get_settings()
    try:
        http_req.post(
            f"{s.baileys_internal_url}/instances/{cliente_id}/send",
            json={"to": remitente, "text": texto},
            headers={"X-Baileys-Token": s.baileys_shared_secret},
            timeout=3,
        )
    except Exception:
        pass


def _enviar_documento(cliente_id: str, remitente: str, pdf_bytes: bytes, filename: str, caption: str = "") -> None:
    import base64
    import requests as http_req
    from app.config import get_settings
    s = get_settings()
    try:
        http_req.post(
            f"{s.baileys_internal_url}/instances/{cliente_id}/send-document",
            json={
                "to": remitente,
                "pdf_base64": base64.b64encode(pdf_bytes).decode(),
                "filename": filename,
                "caption": caption,
            },
            headers={"X-Baileys-Token": s.baileys_shared_secret},
            timeout=15,
        )
    except Exception:
        pass


def _enviar_pdf_factura_ab(
    *,
    cliente_id: str,
    remitente: str,
    razon_social_emisor: str,
    cuit_emisor: str,
    tipo_cbte: str,
    punto_venta: int,
    numero: int,
    fecha: str,
    nombre_receptor: str,
    cuit_receptor: str | None,
    concepto: str,
    neto_gravado: float,
    alicuota: float,
    iva_monto: float,
    total: float,
    cae: str,
    vencimiento_cae: str,
    modo: str,
) -> None:
    """Genera el PDF de Factura A/B y lo envía por WhatsApp. Fallas silenciosas."""
    try:
        from app.services.pdf_factura import generar_pdf_factura_ab
        pdf_bytes = generar_pdf_factura_ab(
            tipo_cbte=tipo_cbte,
            razon_social_emisor=razon_social_emisor,
            cuit_emisor=cuit_emisor,
            punto_venta=punto_venta,
            numero=numero,
            fecha=fecha,
            nombre_receptor=nombre_receptor,
            cuit_receptor=cuit_receptor,
            concepto=concepto,
            neto_gravado=neto_gravado,
            alicuota=alicuota,
            iva_monto=iva_monto,
            total=total,
            cae=cae,
            vencimiento_cae=vencimiento_cae,
        )
        tag = modo.replace(" ", "_").replace("*", "").replace("(", "").replace(")", "")
        filename = f"Factura_{tipo_cbte}_{punto_venta:04d}-{numero:08d}{tag}.pdf"
        caption  = f"Factura {tipo_cbte} N° {punto_venta:04d}-{numero:08d}{modo}"
        _enviar_documento(cliente_id, remitente, pdf_bytes, filename, caption)
    except Exception as e:
        log.error("Error generando/enviando PDF Factura %s: %s", tipo_cbte, e)


def _enviar_pdf_factura(
    *,
    cliente_id: str,
    remitente: str,
    razon_social_emisor: str,
    cuit_emisor: str,
    punto_venta: int,
    numero: int,
    fecha: str,
    nombre_receptor: str,
    concepto: str,
    total: float,
    cae: str,
    vencimiento_cae: str,
    modo: str,
) -> None:
    """Genera el PDF de la factura y lo envía por WhatsApp. Fallas silenciosas."""
    try:
        from app.services.pdf_factura import generar_pdf_factura_c
        pdf_bytes = generar_pdf_factura_c(
            razon_social_emisor=razon_social_emisor,
            cuit_emisor=cuit_emisor,
            punto_venta=punto_venta,
            numero=numero,
            fecha=fecha,
            nombre_receptor=nombre_receptor,
            concepto=concepto,
            total=total,
            cae=cae,
            vencimiento_cae=vencimiento_cae,
        )
        filename = f"Factura_C_{punto_venta:04d}-{numero:08d}{modo.replace(' ', '_').replace('*', '').replace('(', '').replace(')', '')}.pdf"
        caption = f"Factura C N° {punto_venta:04d}-{numero:08d}{modo}"
        _enviar_documento(cliente_id, remitente, pdf_bytes, filename, caption)
    except Exception as e:
        log.error("Error generando/enviando PDF de factura: %s", e)
