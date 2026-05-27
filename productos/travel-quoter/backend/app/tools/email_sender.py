"""Envío de cotizaciones por email usando SMTP."""

from __future__ import annotations

import logging
import smtplib
from datetime import date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)

TOOL_DEFINITION = {
    "name": "send_quote_email",
    "description": (
        "Envía la cotización completa al email del cliente en un ÚNICO correo con vuelo y hotel juntos. "
        "Llamar UNA SOLA VEZ después de confirmar con el usuario. "
        "Completar todos los campos con los datos reales de la búsqueda."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "recipient_email": {"type": "string", "description": "Email del destinatario"},
            "recipient_name": {"type": "string", "description": "Nombre completo del pasajero/cliente"},
            "trip_name": {"type": "string", "description": "Nombre del viaje, ej: 'Viaje a Lima – Ago 2026'"},
            "airline": {"type": "string", "description": "Aerolínea del vuelo seleccionado, ej: 'LATAM'"},
            "flight_amount_usd": {"type": "number", "description": "Precio total del vuelo en USD (número, sin símbolo)"},
            "flight_details": {"type": "string", "description": "Detalles del vuelo: ruta, fecha, horario, escalas"},
            "hotel_name": {"type": "string", "description": "Nombre del hotel seleccionado"},
            "hotel_nights": {"type": "integer", "description": "Cantidad de noches de hospedaje"},
            "hotel_amount_usd": {"type": "number", "description": "Precio total del hotel en USD"},
            "hotel_details": {"type": "string", "description": "Detalles del hotel: ubicación, estrellas, amenities"},
            "total_usd": {"type": "number", "description": "Total del paquete en USD (vuelo + hotel)"},
            "notes": {"type": "string", "description": "Notas adicionales o aclaraciones para el cliente"},
        },
        "required": ["recipient_email", "recipient_name", "trip_name", "airline", "flight_amount_usd", "hotel_name", "hotel_nights", "hotel_amount_usd", "total_usd"],
    },
}


async def send_quote_email(
    recipient_email: str,
    recipient_name: str,
    trip_name: str,
    airline: str,
    flight_amount_usd: float,
    hotel_name: str,
    hotel_nights: int,
    hotel_amount_usd: float,
    total_usd: float,
    flight_details: str = "",
    hotel_details: str = "",
    notes: str = "",
    **_ignored,
) -> dict:
    logger.info("Enviando cotización a %s", recipient_email)
    try:
        msg = _build_email(
            to_email=recipient_email,
            to_name=recipient_name,
            trip_name=trip_name,
            airline=airline,
            flight_amount_usd=float(flight_amount_usd),
            flight_details=flight_details,
            hotel_name=hotel_name,
            hotel_nights=int(hotel_nights),
            hotel_amount_usd=float(hotel_amount_usd),
            hotel_details=hotel_details,
            total_usd=float(total_usd),
            notes=notes,
        )

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_pass)
            server.sendmail(settings.smtp_user, recipient_email, msg.as_string())

        logger.info("Cotización enviada OK a %s", recipient_email)
        return {"sent": True, "to": recipient_email}

    except Exception as e:
        logger.error("Error enviando cotización a %s: %s: %s", recipient_email, type(e).__name__, e)
        return {"sent": False, "error": str(e)}


def _build_email(
    to_email: str, to_name: str, trip_name: str,
    airline: str, flight_amount_usd: float, flight_details: str,
    hotel_name: str, hotel_nights: int, hotel_amount_usd: float, hotel_details: str,
    total_usd: float, notes: str,
) -> MIMEMultipart:
    today = date.today().strftime("%d/%m/%Y")

    flight_detail_row = f'<tr><td colspan="3" style="padding:2px 10px 8px;color:#6b7280;font-size:13px">{flight_details}</td></tr>' if flight_details else ""
    hotel_detail_row = f'<tr><td colspan="3" style="padding:2px 10px 8px;color:#6b7280;font-size:13px">{hotel_details}</td></tr>' if hotel_details else ""
    notes_block = f'<p style="color:#6b7280;font-size:14px;margin-top:16px"><strong>Notas:</strong> {notes}</p>' if notes else ""

    html = f"""
    <html><body style="font-family:sans-serif;color:#1a1a1a;max-width:600px;margin:auto;padding:24px">
      <h2 style="color:#16a34a;margin-bottom:4px">Cotización: {trip_name}</h2>
      <p style="margin-top:0;color:#6b7280;font-size:13px">Generada el {today}</p>
      <p>Hola {to_name},</p>
      <p>Te enviamos el detalle de tu cotización de viaje.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="background:#f0fdf4">
          <td style="padding:10px;font-weight:bold">✈️ Vuelo</td>
          <td style="padding:10px">{airline}</td>
          <td style="padding:10px;text-align:right;font-weight:bold">USD {flight_amount_usd:,.2f}</td>
        </tr>
        {flight_detail_row}
        <tr>
          <td style="padding:10px;font-weight:bold">🏨 Hotel</td>
          <td style="padding:10px">{hotel_name} ({hotel_nights} noches)</td>
          <td style="padding:10px;text-align:right;font-weight:bold">USD {hotel_amount_usd:,.2f}</td>
        </tr>
        {hotel_detail_row}
        <tr style="background:#f0fdf4;font-weight:bold;font-size:16px">
          <td style="padding:12px 10px" colspan="2">Total estimado</td>
          <td style="padding:12px 10px;text-align:right;color:#16a34a">USD {total_usd:,.2f}</td>
        </tr>
      </table>
      {notes_block}
      <p style="color:#9ca3af;font-size:11px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px">
        Cotización generada por PropioIA Travel Quoter
      </p>
    </body></html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Cotización: {trip_name}"
    msg["From"] = f"Travel Quoter <{settings.gmail_sender}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))
    return msg
