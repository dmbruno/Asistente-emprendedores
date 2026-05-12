"""Genera PDFs de facturas siguiendo el layout oficial AFIP/ARCA.

Funciones:
  generar_pdf_factura_c()  → Factura C (monotributistas)
  generar_pdf_factura_ab() → Factura A o B (Responsable Inscripto, IVA discriminado)
"""
from __future__ import annotations

import base64
import io
import json


# ── Helpers ──────────────────────────────────────────────────────────────────

def _fmt(n: float) -> str:
    return f"{n:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


_TIPO_COD = {"A": 1, "B": 6, "C": 11}

def _qr_afip_url(
    cuit: str,
    punto_venta: int,
    numero: int,
    total: float,
    cae: str,
    fecha: str,
    tipo_cbte: str = "C",
    tipo_doc_rec: int = 99,
    nro_doc_rec: int = 0,
) -> str:
    data = {
        "ver": 1,
        "fecha": fecha,
        "cuit": int(cuit.replace("-", "").replace(" ", "")),
        "ptoVta": punto_venta,
        "tipoCmp": _TIPO_COD.get(tipo_cbte.upper(), 11),
        "nroCmp": numero,
        "importe": total,
        "moneda": "PES",
        "ctz": 1,
        "tipoDocRec": tipo_doc_rec,
        "nroDocRec": nro_doc_rec,
        "tipoCodAut": "E",
        "codAut": int(cae),
    }
    b64 = base64.b64encode(json.dumps(data, separators=(",", ":")).encode()).decode()
    return f"https://www.afip.gob.ar/fe/qr/?p={b64}"


def _make_qr_image(url: str, size_cm: float = 2.8):
    import qrcode as qrlib
    from reportlab.lib.units import cm
    from reportlab.platypus import Image

    qr = qrlib.QRCode(box_size=5, border=2,
                      error_correction=qrlib.constants.ERROR_CORRECT_M)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    sz = size_cm * cm
    return Image(buf, width=sz, height=sz)


# ── Generador principal ───────────────────────────────────────────────────────

def generar_pdf_factura_c(
    *,
    # Emisor
    razon_social_emisor: str,
    cuit_emisor: str,
    domicilio_emisor: str = "",
    ingresos_brutos_emisor: str = "",   # si está vacío usa el CUIT
    inicio_actividades: str = "",        # DD/MM/AAAA o vacío
    # Comprobante
    punto_venta: int,
    numero: int,
    fecha: str,                          # YYYY-MM-DD
    copia: str = "ORIGINAL",            # ORIGINAL / DUPLICADO / TRIPLICADO
    # Receptor
    nombre_receptor: str,
    cuit_receptor: str | None = None,
    domicilio_receptor: str = "",
    condicion_iva_receptor: str = "Consumidor Final",
    condicion_venta: str = "Contado",
    # Detalle
    concepto: str,
    total: float,
    # CAE
    cae: str,
    vencimiento_cae: str,               # YYYYMMDD
) -> bytes:

    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        SimpleDocTemplate, Spacer, Table, TableStyle,
        Paragraph, HRFlowable,
    )
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

    PAGE_W, PAGE_H = A4
    MARGIN = 1.5 * cm
    W = PAGE_W - 2 * MARGIN   # ancho útil ≈ 17.7 cm

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=MARGIN, bottomMargin=MARGIN,
    )

    # ── Estilos ──────────────────────────────────────────────────────────────
    def s(name="x", size=9, bold=False, align=TA_LEFT, color=colors.black, leading=None):
        p = ParagraphStyle(name, fontSize=size, alignment=align, textColor=color)
        p.fontName = "Helvetica-Bold" if bold else "Helvetica"
        if leading:
            p.leading = leading
        return p

    BLACK = colors.black
    GREY  = colors.HexColor("#555555")
    LINE  = colors.HexColor("#000000")

    # Fecha formateada
    try:
        from datetime import datetime
        fecha_fmt = datetime.strptime(fecha, "%Y-%m-%d").strftime("%d/%m/%Y")
    except Exception:
        fecha_fmt = fecha

    vto_fmt = (
        f"{vencimiento_cae[6:]}/{vencimiento_cae[4:6]}/{vencimiento_cae[:4]}"
        if len(vencimiento_cae) == 8 else vencimiento_cae
    )

    ib = ingresos_brutos_emisor or cuit_emisor

    elems = []

    # ── 1. ORIGINAL / DUPLICADO / TRIPLICADO ─────────────────────────────────
    elems.append(Paragraph(copia, s("copia", size=14, bold=True, align=TA_CENTER)))
    elems.append(Spacer(1, 0.2 * cm))

    # ── 2. Cabecera principal (3 columnas) ───────────────────────────────────
    #   Col izq: datos del emisor
    #   Col cen: caja con "C" + COD. 011
    #   Col der: "FACTURA" + datos del comprobante

    W_IZQ = W * 0.44
    W_CEN = W * 0.12
    W_DER = W * 0.44

    col_izq = [
        Paragraph(razon_social_emisor, s("em_name", size=12, bold=True)),
        Spacer(1, 4),
        Paragraph(f"<b>Razón Social:</b> {razon_social_emisor}", s("em1", size=8)),
        Paragraph(f"<b>Domicilio Comercial:</b> {domicilio_emisor}", s("em2", size=8)),
        Paragraph("<b>Condición frente al IVA:</b> Responsable Monotributo", s("em3", size=8)),
    ]

    col_cen = [
        Paragraph("C", s("tipo_c", size=30, bold=True, align=TA_CENTER)),
        Spacer(1, 2),
        Paragraph("COD. 011", s("cod", size=7, align=TA_CENTER)),
    ]

    # Columna derecha: tabla anidada para que "FACTURA" no pise los datos
    datos_der = [
        Paragraph(
            f"<b>Punto de Venta:</b> {punto_venta:05d}&nbsp;&nbsp;"
            f"<b>Comp. Nro:</b> {numero:08d}",
            s("pv", size=8),
        ),
        Paragraph(f"<b>Fecha de Emisión:</b> {fecha_fmt}", s("fe", size=8)),
        Spacer(1, 2),
        Paragraph(f"<b>CUIT:</b> {cuit_emisor}", s("cuit", size=8)),
        Paragraph(f"<b>Ingresos Brutos:</b> {ib}", s("ib", size=8)),
        Paragraph(f"<b>Fecha de Inicio de Actividades:</b> {inicio_actividades or '—'}", s("ia", size=8)),
    ]
    datos_inner = Table(
        [[p] for p in datos_der],
        colWidths=[W_DER - 12],
    )
    datos_inner.setStyle(TableStyle([
        ("TOPPADDING",    (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
    ]))

    inner_der = Table(
        [[Paragraph("FACTURA", s("title", size=20, bold=True))],
         [datos_inner]],
        colWidths=[W_DER - 12],
    )
    inner_der.setStyle(TableStyle([
        ("TOPPADDING",    (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (0,  0),  8),   # espacio claro bajo FACTURA
        ("BOTTOMPADDING", (0, 1), (-1, -1), 2),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("LINEBELOW",     (0, 0), (0,  0),  0.4, colors.lightgrey),
    ]))
    col_der = [inner_der]

    cab = Table([[col_izq, col_cen, col_der]], colWidths=[W_IZQ, W_CEN, W_DER])
    cab.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("BOX",           (0, 0), (-1, -1), 1,   LINE),
        ("LINEAFTER",     (0, 0), (0,  0),  1,   LINE),
        ("LINEBEFORE",    (2, 0), (2,  0),  1,   LINE),
        ("BOX",           (1, 0), (1,  0),  0.8, LINE),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("ALIGN",         (1, 0), (1,  0),  "CENTER"),
        ("VALIGN",        (1, 0), (1,  0),  "MIDDLE"),
    ]))
    elems.append(cab)

    # ── 3. Período facturado ─────────────────────────────────────────────────
    per = Table([[
        Paragraph(
            f"<b>Período Facturado Desde:</b> {fecha_fmt}&nbsp;&nbsp;&nbsp;"
            f"<b>Hasta:</b> {fecha_fmt}",
            s("per", size=8),
        ),
        Paragraph(f"<b>Fecha de Vto. para el pago:</b> {fecha_fmt}", s("vto_pago", size=8, align=TA_RIGHT)),
    ]], colWidths=[W * 0.6, W * 0.4])
    per.setStyle(TableStyle([
        ("BOX",           (0, 0), (-1, -1), 1,   LINE),
        ("LINEBEFORE",    (1, 0), (1,  0),  0.5, LINE),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
    ]))
    elems.append(per)

    # ── 4. Datos del receptor ─────────────────────────────────────────────────
    cuit_rec_str = cuit_receptor or "—"
    rec_rows = [
        [
            Paragraph(f"<b>CUIT:</b> {cuit_rec_str}", s("rc1", size=8)),
            Paragraph(
                f"<b>Apellido y Nombre / Razón Social:</b> {nombre_receptor}",
                s("rc2", size=8),
            ),
        ],
        [
            Paragraph(
                f"<b>Condición frente al IVA:</b> {condicion_iva_receptor}",
                s("rc3", size=8),
            ),
            Paragraph(
                f"<b>Domicilio:</b> {domicilio_receptor or '—'}",
                s("rc4", size=8),
            ),
        ],
        [
            Paragraph(f"<b>Condición de venta:</b> {condicion_venta}", s("rc5", size=8)),
            Paragraph("", s("rc6", size=8)),
        ],
    ]
    rec = Table(rec_rows, colWidths=[W * 0.4, W * 0.6])
    rec.setStyle(TableStyle([
        ("BOX",           (0, 0), (-1, -1), 1,   LINE),
        ("LINEBELOW",     (0, 0), (-1, -2), 0.3, colors.lightgrey),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
    ]))
    elems.append(rec)
    elems.append(Spacer(1, 0.1 * cm))

    # ── 5. Tabla de detalle ───────────────────────────────────────────────────
    col_ws = [
        W * 0.08,   # Código
        W * 0.31,   # Producto/Servicio
        W * 0.09,   # Cantidad
        W * 0.10,   # U. Medida
        W * 0.14,   # Precio Unit.
        W * 0.07,   # % Bonif
        W * 0.09,   # Imp. Bonif.
        W * 0.12,   # Subtotal
    ]
    hdr_s  = s("dh",  size=8, bold=True, align=TA_CENTER)
    hdr_s7 = s("dh7", size=7, bold=True, align=TA_CENTER)  # para columnas angostas
    det_headers = [
        Paragraph("Código", hdr_s),
        Paragraph("Producto / Servicio", hdr_s),
        Paragraph("Cantidad", hdr_s),
        Paragraph("U. Medida", hdr_s),
        Paragraph("Precio Unit.", hdr_s),
        Paragraph("% Bonif", hdr_s7),
        Paragraph("Imp. Bonif.", hdr_s7),
        Paragraph("Subtotal", hdr_s),
    ]
    det_row = [
        Paragraph("1", s("d0", size=8, align=TA_CENTER)),
        Paragraph(concepto, s("d1", size=8)),
        Paragraph("1,00", s("d2", size=8, align=TA_RIGHT)),
        Paragraph("unidades", s("d3", size=8, align=TA_CENTER)),
        Paragraph(_fmt(total), s("d4", size=8, align=TA_RIGHT)),
        Paragraph("0,00", s("d5", size=8, align=TA_RIGHT)),
        Paragraph("0,00", s("d6", size=8, align=TA_RIGHT)),
        Paragraph(_fmt(total), s("d7", size=8, align=TA_RIGHT)),
    ]

    # Filas vacías para dar altura similar al modelo AFIP
    empty_row = [""] * 8

    det_data = [det_headers, det_row] + [empty_row] * 6
    det_table = Table(det_data, colWidths=col_ws, rowHeights=[None] + [0.6 * cm] * 7)
    det_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  colors.HexColor("#e0e0e0")),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("BOX",           (0, 0), (-1, -1), 1, LINE),
        ("INNERGRID",     (0, 0), (-1, 0),  0.5, LINE),
        ("LINEBELOW",     (0, 0), (-1, 0),  1, LINE),
        ("TOPPADDING",    (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING",   (0, 0), (-1, -1), 4),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 4),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
    ]))
    elems.append(det_table)

    # ── 6. Totales ────────────────────────────────────────────────────────────
    W_LBL  = W * 0.26
    W_VAL  = W * 0.14
    W_FILL = W - W_LBL - W_VAL

    def tot_row(label, valor):
        return [
            Paragraph("", s("tf")),
            Paragraph(label, s("tl", size=9, bold=False, align=TA_RIGHT)),
            Paragraph(f"$ {_fmt(valor)}", s("tv", size=9, align=TA_RIGHT)),
        ]

    tot_data = [
        tot_row("Subtotal:", total),
        tot_row("Importe Otros Tributos:", 0.0),
        tot_row("Importe Total:", total),
    ]
    tot_table = Table(tot_data, colWidths=[W_FILL, W_LBL, W_VAL])
    tot_table.setStyle(TableStyle([
        ("FONTNAME",      (1, 2), (2, 2),   "Helvetica-Bold"),
        ("LINEABOVE",     (1, 2), (2, 2),   0.5, LINE),
        ("TOPPADDING",    (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 4),
    ]))
    elems.append(tot_table)
    elems.append(Spacer(1, 0.4 * cm))
    elems.append(HRFlowable(width=W, thickness=1, color=LINE))
    elems.append(Spacer(1, 0.3 * cm))

    # ── 7. Footer: QR + ARCA + CAE ───────────────────────────────────────────
    qr_url = _qr_afip_url(
        cuit=cuit_emisor, punto_venta=punto_venta, numero=numero,
        total=total, cae=cae, fecha=fecha,
    )
    qr_img = _make_qr_image(qr_url, size_cm=2.6)

    arca_block = [
        Paragraph("<b>ARCA</b>", s("arca", size=11, bold=True)),
        Paragraph("AGENCIA DE RECAUDACIÓN", s("arca2", size=6)),
        Paragraph("Y CONTROL ADUANERO", s("arca3", size=6)),
    ]

    pag_block = [
        Paragraph(f"Pág. 1/1", s("pag", size=8, align=TA_CENTER)),
    ]

    cae_block = [
        Paragraph(f"<b>CAE N°:</b> {cae}", s("cae1", size=9, bold=False, align=TA_RIGHT)),
        Paragraph(f"<b>Fecha de Vto. de CAE:</b> {vto_fmt}", s("cae2", size=9, align=TA_RIGHT)),
    ]

    footer_top = Table(
        [[qr_img, arca_block, pag_block, cae_block]],
        colWidths=[W * 0.15, W * 0.20, W * 0.30, W * 0.35],
    )
    footer_top.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 4),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 4),
    ]))
    elems.append(footer_top)
    elems.append(Spacer(1, 0.2 * cm))
    elems.append(Paragraph("<b><i>Comprobante Autorizado</i></b>", s("ca", size=8)))
    elems.append(Spacer(1, 0.15 * cm))
    elems.append(Paragraph(
        "Esta Agencia no se responsabiliza por los datos ingresados en el detalle de la operación",
        s("disc", size=7, color=GREY),
    ))

    doc.build(elems)
    return buf.getvalue()


def generar_pdf_factura_ab(
    *,
    tipo_cbte: str,                        # "A" o "B"
    # Emisor
    razon_social_emisor: str,
    cuit_emisor: str,
    domicilio_emisor: str = "",
    ingresos_brutos_emisor: str = "",
    inicio_actividades: str = "",
    # Comprobante
    punto_venta: int,
    numero: int,
    fecha: str,                            # YYYY-MM-DD
    copia: str = "ORIGINAL",
    # Receptor
    nombre_receptor: str,
    cuit_receptor: str | None = None,
    domicilio_receptor: str = "",
    condicion_iva_receptor: str = "",      # "Responsable Inscripto" | "Consumidor Final" | ...
    condicion_venta: str = "Contado",
    # Detalle
    concepto: str,
    neto_gravado: float,
    alicuota: float,                       # 21.0, 10.5 o 27.0
    iva_monto: float,
    total: float,
    # CAE
    cae: str,
    vencimiento_cae: str,                  # YYYYMMDD
) -> bytes:
    """Genera PDF para Factura A o B (Responsable Inscripto) con IVA discriminado."""

    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        SimpleDocTemplate, Spacer, Table, TableStyle,
        Paragraph, HRFlowable,
    )
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

    tipo = tipo_cbte.upper()
    tipo_cod_str = {"A": "001", "B": "006"}.get(tipo, "006")

    # Receptor IVA default según tipo
    if not condicion_iva_receptor:
        condicion_iva_receptor = "Responsable Inscripto" if tipo == "A" else "Consumidor Final"

    PAGE_W, PAGE_H = A4
    MARGIN = 1.5 * cm
    W = PAGE_W - 2 * MARGIN

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=MARGIN, bottomMargin=MARGIN,
    )

    def s(name="x", size=9, bold=False, align=TA_LEFT, color=colors.black, leading=None):
        p = ParagraphStyle(name, fontSize=size, alignment=align, textColor=color)
        p.fontName = "Helvetica-Bold" if bold else "Helvetica"
        if leading:
            p.leading = leading
        return p

    LINE = colors.black
    GREY = colors.HexColor("#555555")

    try:
        from datetime import datetime as _dt
        fecha_fmt = _dt.strptime(fecha, "%Y-%m-%d").strftime("%d/%m/%Y")
    except Exception:
        fecha_fmt = fecha

    vto_fmt = (
        f"{vencimiento_cae[6:]}/{vencimiento_cae[4:6]}/{vencimiento_cae[:4]}"
        if len(vencimiento_cae) == 8 else vencimiento_cae
    )

    ib = ingresos_brutos_emisor or cuit_emisor
    elems = []

    # ── 1. ORIGINAL ─────────────────────────────────────────────────────────────
    elems.append(Paragraph(copia, s("copia", size=14, bold=True, align=TA_CENTER)))
    elems.append(Spacer(1, 0.2 * cm))

    # ── 2. Cabecera ──────────────────────────────────────────────────────────────
    W_IZQ = W * 0.44
    W_CEN = W * 0.12
    W_DER = W * 0.44

    col_izq = [
        Paragraph(razon_social_emisor, s("em_name", size=12, bold=True)),
        Spacer(1, 4),
        Paragraph(f"<b>Razón Social:</b> {razon_social_emisor}", s("em1", size=8)),
        Paragraph(f"<b>Domicilio Comercial:</b> {domicilio_emisor}", s("em2", size=8)),
        Paragraph("<b>Condición frente al IVA:</b> Responsable Inscripto", s("em3", size=8)),
    ]

    col_cen = [
        Paragraph(tipo, s("tipo_letra", size=30, bold=True, align=TA_CENTER)),
        Spacer(1, 2),
        Paragraph(f"COD. {tipo_cod_str}", s("cod", size=7, align=TA_CENTER)),
    ]

    datos_der = [
        Paragraph(
            f"<b>Punto de Venta:</b> {punto_venta:05d}&nbsp;&nbsp;"
            f"<b>Comp. Nro:</b> {numero:08d}",
            s("pv", size=8),
        ),
        Paragraph(f"<b>Fecha de Emisión:</b> {fecha_fmt}", s("fe", size=8)),
        Spacer(1, 2),
        Paragraph(f"<b>CUIT:</b> {cuit_emisor}", s("cuit", size=8)),
        Paragraph(f"<b>Ingresos Brutos:</b> {ib}", s("ib", size=8)),
        Paragraph(f"<b>Fecha de Inicio de Actividades:</b> {inicio_actividades or '—'}", s("ia", size=8)),
    ]
    datos_inner = Table([[p] for p in datos_der], colWidths=[W_DER - 12])
    datos_inner.setStyle(TableStyle([
        ("TOPPADDING",    (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
    ]))
    inner_der = Table(
        [[Paragraph("FACTURA", s("title", size=20, bold=True))], [datos_inner]],
        colWidths=[W_DER - 12],
    )
    inner_der.setStyle(TableStyle([
        ("TOPPADDING",    (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (0, 0),   8),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 2),
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("LINEBELOW",     (0, 0), (0, 0),   0.4, colors.lightgrey),
    ]))

    cab = Table([[col_izq, col_cen, [inner_der]]], colWidths=[W_IZQ, W_CEN, W_DER])
    cab.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("BOX",           (0, 0), (-1, -1), 1,   LINE),
        ("LINEAFTER",     (0, 0), (0,  0),  1,   LINE),
        ("LINEBEFORE",    (2, 0), (2,  0),  1,   LINE),
        ("BOX",           (1, 0), (1,  0),  0.8, LINE),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("ALIGN",         (1, 0), (1,  0),  "CENTER"),
        ("VALIGN",        (1, 0), (1,  0),  "MIDDLE"),
    ]))
    elems.append(cab)

    # ── 3. Período ───────────────────────────────────────────────────────────────
    per = Table([[
        Paragraph(
            f"<b>Período Facturado Desde:</b> {fecha_fmt}&nbsp;&nbsp;&nbsp;"
            f"<b>Hasta:</b> {fecha_fmt}",
            s("per", size=8),
        ),
        Paragraph(f"<b>Fecha de Vto. para el pago:</b> {fecha_fmt}", s("vp", size=8, align=TA_RIGHT)),
    ]], colWidths=[W * 0.6, W * 0.4])
    per.setStyle(TableStyle([
        ("BOX",           (0, 0), (-1, -1), 1,   LINE),
        ("LINEBEFORE",    (1, 0), (1,  0),  0.5, LINE),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
    ]))
    elems.append(per)

    # ── 4. Receptor ──────────────────────────────────────────────────────────────
    cuit_rec_str = cuit_receptor or "—"
    rec = Table([
        [
            Paragraph(f"<b>CUIT:</b> {cuit_rec_str}", s("rc1", size=8)),
            Paragraph(f"<b>Apellido y Nombre / Razón Social:</b> {nombre_receptor}", s("rc2", size=8)),
        ],
        [
            Paragraph(f"<b>Condición frente al IVA:</b> {condicion_iva_receptor}", s("rc3", size=8)),
            Paragraph(f"<b>Domicilio:</b> {domicilio_receptor or '—'}", s("rc4", size=8)),
        ],
        [
            Paragraph(f"<b>Condición de venta:</b> {condicion_venta}", s("rc5", size=8)),
            Paragraph("", s("rc6", size=8)),
        ],
    ], colWidths=[W * 0.4, W * 0.6])
    rec.setStyle(TableStyle([
        ("BOX",           (0, 0), (-1, -1), 1,   LINE),
        ("LINEBELOW",     (0, 0), (-1, -2), 0.3, colors.lightgrey),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
    ]))
    elems.append(rec)
    elems.append(Spacer(1, 0.1 * cm))

    # ── 5. Detalle ────────────────────────────────────────────────────────────────
    col_ws = [W * 0.08, W * 0.31, W * 0.09, W * 0.10, W * 0.14, W * 0.07, W * 0.09, W * 0.12]
    hdr_s  = s("dh",  size=8, bold=True, align=TA_CENTER)
    hdr_s7 = s("dh7", size=7, bold=True, align=TA_CENTER)
    det_headers = [
        Paragraph("Código", hdr_s),
        Paragraph("Producto / Servicio", hdr_s),
        Paragraph("Cantidad", hdr_s),
        Paragraph("U. Medida", hdr_s),
        Paragraph("Precio Unit.", hdr_s),
        Paragraph("% Bonif", hdr_s7),
        Paragraph("Imp. Bonif.", hdr_s7),
        Paragraph("Subtotal", hdr_s),
    ]
    det_row = [
        Paragraph("1", s("d0", size=8, align=TA_CENTER)),
        Paragraph(concepto, s("d1", size=8)),
        Paragraph("1,00", s("d2", size=8, align=TA_RIGHT)),
        Paragraph("unidades", s("d3", size=8, align=TA_CENTER)),
        Paragraph(_fmt(neto_gravado), s("d4", size=8, align=TA_RIGHT)),
        Paragraph("0,00", s("d5", size=8, align=TA_RIGHT)),
        Paragraph("0,00", s("d6", size=8, align=TA_RIGHT)),
        Paragraph(_fmt(neto_gravado), s("d7", size=8, align=TA_RIGHT)),
    ]
    det_data = [det_headers, det_row] + [[""] * 8] * 6
    det_table = Table(det_data, colWidths=col_ws, rowHeights=[None] + [0.6 * cm] * 7)
    det_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  colors.HexColor("#e0e0e0")),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("BOX",           (0, 0), (-1, -1), 1, LINE),
        ("INNERGRID",     (0, 0), (-1, 0),  0.5, LINE),
        ("LINEBELOW",     (0, 0), (-1, 0),  1, LINE),
        ("TOPPADDING",    (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING",   (0, 0), (-1, -1), 4),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 4),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
    ]))
    elems.append(det_table)

    # ── 6. Totales con IVA discriminado ──────────────────────────────────────────
    W_LBL  = W * 0.26
    W_VAL  = W * 0.14
    W_FILL = W - W_LBL - W_VAL

    def tot_row(label, valor):
        return [
            Paragraph("", s("tf")),
            Paragraph(label, s("tl", size=9, align=TA_RIGHT)),
            Paragraph(f"$ {_fmt(valor)}", s("tv", size=9, align=TA_RIGHT)),
        ]

    ali_str = f"{alicuota:.4g}".rstrip("0").rstrip(".")
    tot_data = [
        tot_row("Neto Gravado:",                 neto_gravado),
        tot_row(f"I.V.A. {ali_str}%:",           iva_monto),
        tot_row("Importe Otros Tributos:",        0.0),
        tot_row("Importe Total:",                 total),
    ]
    tot_table = Table(tot_data, colWidths=[W_FILL, W_LBL, W_VAL])
    tot_table.setStyle(TableStyle([
        ("FONTNAME",      (1, 3), (2, 3),   "Helvetica-Bold"),
        ("LINEABOVE",     (1, 3), (2, 3),   0.5, LINE),
        ("TOPPADDING",    (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 4),
    ]))
    elems.append(tot_table)
    elems.append(Spacer(1, 0.4 * cm))
    elems.append(HRFlowable(width=W, thickness=1, color=LINE))
    elems.append(Spacer(1, 0.3 * cm))

    # ── 7. Footer: QR + CAE ──────────────────────────────────────────────────────
    cuit_rec_digits = (cuit_receptor or "").replace("-", "").strip()
    tipo_doc_rec = 80 if (cuit_rec_digits.isdigit() and len(cuit_rec_digits) == 11) else 99
    nro_doc_rec  = int(cuit_rec_digits) if tipo_doc_rec == 80 else 0

    qr_url = _qr_afip_url(
        cuit=cuit_emisor, punto_venta=punto_venta, numero=numero,
        total=total, cae=cae, fecha=fecha,
        tipo_cbte=tipo,
        tipo_doc_rec=tipo_doc_rec, nro_doc_rec=nro_doc_rec,
    )
    qr_img = _make_qr_image(qr_url, size_cm=2.6)

    arca_block = [
        Paragraph("<b>ARCA</b>", s("arca", size=11, bold=True)),
        Paragraph("AGENCIA DE RECAUDACIÓN", s("arca2", size=6)),
        Paragraph("Y CONTROL ADUANERO", s("arca3", size=6)),
    ]
    cae_block = [
        Paragraph(f"<b>CAE N°:</b> {cae}", s("cae1", size=9, align=TA_RIGHT)),
        Paragraph(f"<b>Fecha de Vto. de CAE:</b> {vto_fmt}", s("cae2", size=9, align=TA_RIGHT)),
    ]
    footer_top = Table(
        [[qr_img, arca_block, [Paragraph("Pág. 1/1", s("pag", size=8, align=TA_CENTER))], cae_block]],
        colWidths=[W * 0.15, W * 0.20, W * 0.30, W * 0.35],
    )
    footer_top.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 4),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 4),
    ]))
    elems.append(footer_top)
    elems.append(Spacer(1, 0.2 * cm))
    elems.append(Paragraph("<b><i>Comprobante Autorizado</i></b>", s("ca", size=8)))
    elems.append(Spacer(1, 0.15 * cm))
    elems.append(Paragraph(
        "Esta Agencia no se responsabiliza por los datos ingresados en el detalle de la operación",
        s("disc", size=7, color=GREY),
    ))

    doc.build(elems)
    return buf.getvalue()
