"""
WSFE — Web Service de Facturación Electrónica de AFIP.

Tipos de comprobante soportados:
  - Factura C (tipo 11): monotributistas, IVA incluido en el total, sin desglose.
  - Factura A (tipo  1): RI → RI, IVA discriminado obligatorio.
  - Factura B (tipo  6): RI → consumidor final / monotributista, IVA discriminado.
"""
from __future__ import annotations

import datetime
import logging
from dataclasses import dataclass

import httpx
from lxml import etree

logger = logging.getLogger(__name__)

WSFE_HOMO = "https://wswhomo.afip.gov.ar/wsfev1/service.asmx"
WSFE_PROD = "https://servicios1.afip.gov.ar/wsfev1/service.asmx"

NS = "http://ar.gov.afip.dif.FEV1/"

TIPO_FACTURA_A      = 1
TIPO_FACTURA_B      = 6
TIPO_FACTURA_C      = 11
DOC_CUIT            = 80
DOC_NO_CATEGORIZADO = 99

# Códigos de alícuota IVA según AFIP
_IVA_COD: dict[float, int] = {10.5: 4, 21.0: 5, 27.0: 6}


@dataclass
class FacturaCEmitida:
    numero: int
    punto_venta: int
    cae: str
    vencimiento_cae: str   # YYYYMMDD
    cuit_emisor: str
    fecha: str             # YYYY-MM-DD
    total: float


class WsfeError(Exception):
    pass


def _soap(url: str, action: str, body: str) -> etree._Element:
    envelope = (
        '<?xml version="1.0" encoding="utf-8"?>'
        '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"'
        ' xmlns:xsi="http://www.w3.org/1999/XMLSchema-instance"'
        ' xmlns:xsd="http://www.w3.org/1999/XMLSchema">'
        f"<soap:Body>{body}</soap:Body></soap:Envelope>"
    )
    try:
        with httpx.Client(timeout=30) as c:
            r = c.post(url, content=envelope.encode(), headers={
                "Content-Type": "text/xml; charset=utf-8",
                "SOAPAction": f'"{action}"',
            })
            r.raise_for_status()
    except httpx.HTTPError as e:
        raise WsfeError(f"HTTP error llamando a WSFE: {e}") from e

    root = etree.fromstring(r.content)
    body_el = root.find("{http://schemas.xmlsoap.org/soap/envelope/}Body")
    return body_el if body_el is not None else root


def _auth(token: str, sign: str, cuit: str) -> str:
    return f"<Auth><Token>{token}</Token><Sign>{sign}</Sign><Cuit>{cuit}</Cuit></Auth>"


def _check_errors(result: etree._Element) -> None:
    for err in result.findall(f".//{{{NS}}}Err"):
        code = err.findtext(f"{{{NS}}}Code")
        msg  = err.findtext(f"{{{NS}}}Msg")
        raise WsfeError(f"AFIP error {code}: {msg}")


def _ultimo_numero(cuit: str, punto_venta: int, tipo_cbte: int, token: str, sign: str, homo: bool) -> int:
    """Último número autorizado para el tipo de comprobante y punto de venta dados."""
    url  = WSFE_HOMO if homo else WSFE_PROD
    body = (
        f'<FECompUltimoAutorizado xmlns="{NS}">'
        f"{_auth(token, sign, cuit)}"
        f"<PtoVta>{punto_venta}</PtoVta>"
        f"<CbteTipo>{tipo_cbte}</CbteTipo>"
        f"</FECompUltimoAutorizado>"
    )
    resp   = _soap(url, f"{NS}FECompUltimoAutorizado", body)
    result = resp.find(f".//{{{NS}}}FECompUltimoAutorizadoResult")
    if result is None:
        raise WsfeError("Respuesta inesperada de FECompUltimoAutorizado")
    _check_errors(result)
    nro = result.findtext(f".//{{{NS}}}CbteNro")
    return int(nro) if nro else 0


def ultimo_numero(cuit: str, punto_venta: int, token: str, sign: str, homo: bool) -> int:
    """Compatibilidad con código existente — consulta Factura C."""
    return _ultimo_numero(cuit, punto_venta, TIPO_FACTURA_C, token, sign, homo)


def solicitar_cae(
    *,
    cuit_emisor: str,
    punto_venta: int,
    token: str,
    sign: str,
    homo: bool,
    nombre_receptor: str,
    cuit_receptor: str | None,
    total: float,
    concepto: str = "servicios",
    fecha: datetime.date | None = None,
) -> FacturaCEmitida:
    """
    Solicita CAE para una Factura C.
    concepto: 'servicios' | 'productos' | 'ambos'
    """
    url  = WSFE_HOMO if homo else WSFE_PROD
    hoy  = fecha or datetime.date.today()
    fch  = hoy.strftime("%Y%m%d")

    # Receptor: si tiene CUIT, usarlo; si no, consumidor final
    cuit_clean = (cuit_receptor or "").replace("-", "").strip()
    if cuit_clean.isdigit() and len(cuit_clean) == 11:
        doc_tipo, doc_nro = DOC_CUIT, cuit_clean
    else:
        doc_tipo, doc_nro = DOC_NO_CATEGORIZADO, "0"

    concepto_cod = {"productos": 1, "servicios": 2, "ambos": 3}.get(concepto.lower(), 2)
    importe      = round(total, 2)

    ultimo = ultimo_numero(cuit_emisor, punto_venta, token, sign, homo)
    cbte   = ultimo + 1

    # Fechas de período obligatorias cuando concepto es servicios (2) o ambos (3)
    serv_xml = ""
    if concepto_cod in (2, 3):
        primer_dia = hoy.replace(day=1).strftime("%Y%m%d")
        ultimo_dia = (hoy.replace(day=1) + datetime.timedelta(days=32)).replace(day=1) - datetime.timedelta(days=1)
        serv_xml = (
            f"<FchServDesde>{primer_dia}</FchServDesde>"
            f"<FchServHasta>{ultimo_dia.strftime('%Y%m%d')}</FchServHasta>"
            f"<FchVtoPago>{fch}</FchVtoPago>"
        )

    body = (
        f'<FECAESolicitar xmlns="{NS}">'
        f"{_auth(token, sign, cuit_emisor)}"
        "<FeCAEReq>"
        "<FeCabReq>"
        f"<CantReg>1</CantReg><PtoVta>{punto_venta}</PtoVta>"
        f"<CbteTipo>{TIPO_FACTURA_C}</CbteTipo>"
        "</FeCabReq>"
        "<FeDetReq><FECAEDetRequest>"
        f"<Concepto>{concepto_cod}</Concepto>"
        f"<DocTipo>{doc_tipo}</DocTipo><DocNro>{doc_nro}</DocNro>"
        f"<CbteDesde>{cbte}</CbteDesde><CbteHasta>{cbte}</CbteHasta>"
        f"<CbteFch>{fch}</CbteFch>"
        f"<ImpTotal>{importe:.2f}</ImpTotal>"
        "<ImpTotConc>0.00</ImpTotConc>"
        f"<ImpNeto>{importe:.2f}</ImpNeto>"
        "<ImpOpEx>0.00</ImpOpEx><ImpIVA>0.00</ImpIVA><ImpTrib>0.00</ImpTrib>"
        "<MonId>PES</MonId><MonCotiz>1.00</MonCotiz>"
        f"{serv_xml}"
        "</FECAEDetRequest></FeDetReq>"
        "</FeCAEReq>"
        "</FECAESolicitar>"
    )

    resp   = _soap(url, f"{NS}FECAESolicitar", body)
    result = resp.find(f".//{{{NS}}}FECAESolicitarResult")
    if result is None:
        raise WsfeError("Respuesta inesperada de FECAESolicitar")
    _check_errors(result)

    det = result.find(f".//{{{NS}}}FECAEDetResponse")
    if det is None:
        raise WsfeError("No se encontró FECAEDetResponse")

    resultado = det.findtext(f"{{{NS}}}Resultado")
    if resultado != "A":
        obs = [o.findtext(f"{{{NS}}}Msg") or "" for o in det.findall(f".//{{{NS}}}Obs")]
        raise WsfeError(f"Comprobante rechazado por AFIP: {'; '.join(filter(None, obs))}")

    cae     = det.findtext(f"{{{NS}}}CAE") or ""
    vto_cae = det.findtext(f"{{{NS}}}CAEFchVto") or ""

    logger.info("CAE obtenido: %s vto %s nro %s", cae, vto_cae, cbte)
    return FacturaCEmitida(
        numero=cbte,
        punto_venta=punto_venta,
        cae=cae,
        vencimiento_cae=vto_cae,
        cuit_emisor=cuit_emisor,
        fecha=hoy.isoformat(),
        total=importe,
    )


def solicitar_cae_ab(
    *,
    cuit_emisor: str,
    punto_venta: int,
    token: str,
    sign: str,
    homo: bool,
    tipo_cbte: int,          # TIPO_FACTURA_A=1 o TIPO_FACTURA_B=6
    cuit_receptor: str | None,
    neto_gravado: float,
    alicuota: float,         # 21.0, 10.5 o 27.0
    iva_monto: float,
    total: float,
    concepto: str = "servicios",
    fecha: datetime.date | None = None,
) -> FacturaCEmitida:
    """
    Solicita CAE para Factura A o B (Responsable Inscripto).

    Diferencias respecto a Factura C:
    - ImpNeto = neto gravado (sin IVA)
    - ImpIVA  = monto del IVA
    - Requiere el bloque <Iva> con alícuota y base imponible
    """
    url = WSFE_HOMO if homo else WSFE_PROD
    hoy = fecha or datetime.date.today()
    fch = hoy.strftime("%Y%m%d")

    cuit_clean = (cuit_receptor or "").replace("-", "").strip()
    if cuit_clean.isdigit() and len(cuit_clean) == 11:
        doc_tipo, doc_nro = DOC_CUIT, cuit_clean
    else:
        doc_tipo, doc_nro = DOC_NO_CATEGORIZADO, "0"

    concepto_cod = {"productos": 1, "servicios": 2, "ambos": 3}.get(concepto.lower(), 2)
    neto   = round(neto_gravado, 2)
    iva    = round(iva_monto, 2)
    imp_total = round(total, 2)
    ali_cod = _IVA_COD.get(alicuota, 5)

    ultimo = _ultimo_numero(cuit_emisor, punto_venta, tipo_cbte, token, sign, homo)
    cbte   = ultimo + 1

    iva_xml = (
        f"<Iva><AlicIva>"
        f"<Id>{ali_cod}</Id>"
        f"<BaseImp>{neto:.2f}</BaseImp>"
        f"<Importe>{iva:.2f}</Importe>"
        f"</AlicIva></Iva>"
    )

    # Fechas de período obligatorias cuando concepto es servicios (2) o ambos (3)
    serv_xml = ""
    if concepto_cod in (2, 3):
        primer_dia = hoy.replace(day=1).strftime("%Y%m%d")
        ultimo_dia = (hoy.replace(day=1) + datetime.timedelta(days=32)).replace(day=1) - datetime.timedelta(days=1)
        serv_xml = (
            f"<FchServDesde>{primer_dia}</FchServDesde>"
            f"<FchServHasta>{ultimo_dia.strftime('%Y%m%d')}</FchServHasta>"
            f"<FchVtoPago>{fch}</FchVtoPago>"
        )

    body = (
        f'<FECAESolicitar xmlns="{NS}">'
        f"{_auth(token, sign, cuit_emisor)}"
        "<FeCAEReq>"
        "<FeCabReq>"
        f"<CantReg>1</CantReg><PtoVta>{punto_venta}</PtoVta>"
        f"<CbteTipo>{tipo_cbte}</CbteTipo>"
        "</FeCabReq>"
        "<FeDetReq><FECAEDetRequest>"
        f"<Concepto>{concepto_cod}</Concepto>"
        f"<DocTipo>{doc_tipo}</DocTipo><DocNro>{doc_nro}</DocNro>"
        f"<CbteDesde>{cbte}</CbteDesde><CbteHasta>{cbte}</CbteHasta>"
        f"<CbteFch>{fch}</CbteFch>"
        f"<ImpTotal>{imp_total:.2f}</ImpTotal>"
        "<ImpTotConc>0.00</ImpTotConc>"
        f"<ImpNeto>{neto:.2f}</ImpNeto>"
        "<ImpOpEx>0.00</ImpOpEx>"
        f"<ImpIVA>{iva:.2f}</ImpIVA>"
        "<ImpTrib>0.00</ImpTrib>"
        "<MonId>PES</MonId><MonCotiz>1.00</MonCotiz>"
        f"{iva_xml}"
        f"{serv_xml}"
        "</FECAEDetRequest></FeDetReq>"
        "</FeCAEReq>"
        "</FECAESolicitar>"
    )

    resp   = _soap(url, f"{NS}FECAESolicitar", body)
    result = resp.find(f".//{{{NS}}}FECAESolicitarResult")
    if result is None:
        raise WsfeError("Respuesta inesperada de FECAESolicitar")
    _check_errors(result)

    det = result.find(f".//{{{NS}}}FECAEDetResponse")
    if det is None:
        raise WsfeError("No se encontró FECAEDetResponse")

    resultado_str = det.findtext(f"{{{NS}}}Resultado")
    if resultado_str != "A":
        obs = [o.findtext(f"{{{NS}}}Msg") or "" for o in det.findall(f".//{{{NS}}}Obs")]
        raise WsfeError(f"Comprobante rechazado por AFIP: {'; '.join(filter(None, obs))}")

    cae     = det.findtext(f"{{{NS}}}CAE") or ""
    vto_cae = det.findtext(f"{{{NS}}}CAEFchVto") or ""

    logger.info("CAE AB obtenido: tipo=%s nro=%s cae=%s", tipo_cbte, cbte, cae)
    return FacturaCEmitida(
        numero=cbte,
        punto_venta=punto_venta,
        cae=cae,
        vencimiento_cae=vto_cae,
        cuit_emisor=cuit_emisor,
        fecha=hoy.isoformat(),
        total=imp_total,
    )
