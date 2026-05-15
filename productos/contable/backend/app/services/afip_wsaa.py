"""
WSAA — Web Service de Autenticación y Autorización de AFIP.
Genera un Ticket de Acceso (TA) válido ~12 horas.
El TA se cachea en memoria para no re-autenticar en cada factura.
"""
from __future__ import annotations

import base64
import datetime
import logging
from xml.etree import ElementTree as ET

import httpx
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.serialization.pkcs7 import PKCS7SignatureBuilder

logger = logging.getLogger(__name__)

WSAA_HOMO = "https://wsaahomo.afip.gov.ar/ws/services/LoginCms"
WSAA_PROD = "https://wsaa.afip.gov.ar/ws/services/LoginCms"

# cache: (cuit, servicio, homo) -> (expira, token, sign)
_cache: dict[tuple, tuple] = {}


class WsaaError(Exception):
    pass


def _tra(servicio: str) -> bytes:
    ar_tz = datetime.timezone(datetime.timedelta(hours=-3))
    ahora = datetime.datetime.now(ar_tz)
    gen  = (ahora - datetime.timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%S-03:00")
    exp  = (ahora + datetime.timedelta(hours=12)).strftime("%Y-%m-%dT%H:%M:%S-03:00")
    uid  = int(ahora.timestamp())
    return (
        f'<?xml version="1.0" encoding="UTF-8"?>'
        f"<loginTicketRequest version=\"1.0\">"
        f"<header><uniqueId>{uid}</uniqueId>"
        f"<generationTime>{gen}</generationTime>"
        f"<expirationTime>{exp}</expirationTime></header>"
        f"<service>{servicio}</service>"
        f"</loginTicketRequest>"
    ).encode()


def _sign(tra_bytes: bytes, cert_pem: str, key_pem: str) -> str:
    cert = x509.load_pem_x509_certificate(cert_pem.encode())
    key  = serialization.load_pem_private_key(key_pem.encode(), password=None)
    signed = (
        PKCS7SignatureBuilder()
        .set_data(tra_bytes)
        .add_signer(cert, key, hashes.SHA256())
        .sign(serialization.Encoding.DER, [])
    )
    return base64.b64encode(signed).decode()


def _call(cms_b64: str, homo: bool) -> tuple[str, str, datetime.datetime]:
    url  = WSAA_HOMO if homo else WSAA_PROD
    soap = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">'
        "<soapenv:Body>"
        '<loginCms xmlns="http://wsaa.view.sua.dvadac.desein.afip.gov">'
        f"<in0>{cms_b64}</in0>"
        "</loginCms></soapenv:Body></soapenv:Envelope>"
    )
    try:
        with httpx.Client(timeout=30) as client:
            r = client.post(url, content=soap.encode(), headers={
                "Content-Type": "text/xml; charset=UTF-8",
                "SOAPAction": '""',
            })
    except httpx.HTTPError as e:
        raise WsaaError(f"No se pudo conectar a AFIP: {e}") from e

    if r.status_code >= 400:
        # AFIP devuelve 500 con SOAP Fault — leer el mensaje real
        try:
            root = ET.fromstring(r.text)
            fault_str = next(
                (el.text for el in root.iter() if el.tag.endswith("faultstring")),
                None,
            )
            if fault_str:
                raise WsaaError(f"AFIP WSAA rechazó la autenticación: {fault_str}")
        except ET.ParseError:
            pass
        raise WsaaError(f"AFIP WSAA respondió HTTP {r.status_code}. Verificá que el certificado esté registrado.")

    root = ET.fromstring(r.text)
    ta_xml = None
    for el in root.iter():
        if el.tag.endswith("loginCmsReturn"):
            ta_xml = el.text
            break
    if not ta_xml:
        raise WsaaError(f"WSAA no devolvió loginCmsReturn. Body: {r.text[:400]}")

    ta   = ET.fromstring(ta_xml)
    token = ta.findtext("credentials/token")
    sign  = ta.findtext("credentials/sign")
    exp_s = ta.findtext("header/expirationTime") or ""

    if not token or not sign:
        raise WsaaError("WSAA: token o sign vacíos")

    try:
        # AFIP devuelve -03:00 o -02:00 según DST
        exp_s_utc = exp_s[:19] + "+00:00"  # simplificamos ignorando TZ (margen ya incluido)
        expira = datetime.datetime.fromisoformat(exp_s_utc)
    except Exception:
        expira = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=11)

    return token, sign, expira


def obtener_ta(
    cuit: str,
    cert_pem: str,
    key_pem: str,
    homo: bool = True,
    servicio: str = "wsfe",
) -> tuple[str, str]:
    """Devuelve (token, sign). Reutiliza el TA cacheado si no venció."""
    key = (cuit, servicio, homo)
    cached = _cache.get(key)
    if cached:
        expira, tok, sgn = cached
        if datetime.datetime.now(datetime.timezone.utc) < expira - datetime.timedelta(minutes=10):
            logger.debug("WSAA: TA cacheado para CUIT %s", cuit)
            return tok, sgn

    logger.info("WSAA: solicitando nuevo TA para CUIT %s homo=%s", cuit, homo)
    tra_bytes = _tra(servicio)
    cms       = _sign(tra_bytes, cert_pem, key_pem)
    token, sign, expira = _call(cms, homo)
    _cache[key] = (expira, token, sign)
    logger.info("WSAA: TA obtenido, expira %s", expira)
    return token, sign
