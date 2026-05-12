"""
Servicio principal de facturación electrónica AFIP.

Orquesta:
  1. Cargar cert + key del cliente desde api_keys (Fernet decrypt)
  2. WSAA → obtener Token/Sign
  3. WSFE → solicitar CAE

Tipos soportados:
  - emitir_factura_c()  → Factura C (monotributistas)
  - emitir_factura_ab() → Factura A / B (Responsable Inscripto)

Homologación vs Producción:
  - AFIP_HOMO=true  → usa endpoints de prueba de AFIP (sin efectos reales)
  - AFIP_HOMO=false → producción (requiere cert real registrado en AFIP)
"""
from __future__ import annotations

import datetime
import logging
import os
from dataclasses import dataclass

logger = logging.getLogger(__name__)

HOMO = os.getenv("AFIP_HOMO", "true").lower() in ("1", "true", "yes")
MOCK = os.getenv("AFIP_MOCK", "true").lower() in ("1", "true", "yes")


@dataclass
class ResultadoFactura:
    numero: int
    punto_venta: int
    cae: str
    vencimiento_cae: str    # YYYYMMDD → se formatea al mostrar
    cuit_emisor: str
    fecha: str              # YYYY-MM-DD
    total: float
    homo: bool

    def vencimiento_fmt(self) -> str:
        """YYYYMMDD → DD/MM/YYYY para mostrar al usuario."""
        v = self.vencimiento_cae
        if len(v) == 8:
            return f"{v[6:]}/{v[4:6]}/{v[:4]}"
        return v

    def numero_fmt(self) -> str:
        """Número de comprobante con formato AFIP: PPPP-NNNNNNNN."""
        return f"{self.punto_venta:04d}-{self.numero:08d}"


class AfipError(Exception):
    pass


def _mock_factura_ab(
    cuit_emisor: str,
    punto_venta: int,
    total: float,
    fecha: datetime.date | None,
    tipo_cbte: str,
) -> ResultadoFactura:
    """Devuelve una Factura A/B simulada sin llamar a AFIP."""
    import random, hashlib
    hoy  = fecha or datetime.date.today()
    seed = f"{cuit_emisor}{hoy}{total}{tipo_cbte}"
    cae  = str(int(hashlib.md5(seed.encode()).hexdigest(), 16))[:14].ljust(14, "0")
    vto  = (hoy + datetime.timedelta(days=10)).strftime("%Y%m%d")
    numero = int(hoy.strftime("%j")) * 100 + random.randint(1, 99)
    logger.info("AFIP_MOCK=true — factura %s simulada CAE %s", tipo_cbte, cae)
    return ResultadoFactura(
        numero=numero,
        punto_venta=punto_venta,
        cae=cae,
        vencimiento_cae=vto,
        cuit_emisor=cuit_emisor,
        fecha=hoy.isoformat(),
        total=total,
        homo=True,
    )


def _mock_factura(
    cuit_emisor: str,
    punto_venta: int,
    total: float,
    fecha: datetime.date | None,
) -> ResultadoFactura:
    """Devuelve una factura simulada sin llamar a AFIP. Solo para desarrollo."""
    import random, hashlib
    hoy     = fecha or datetime.date.today()
    # CAE simulado: 14 dígitos deterministas según cuit+fecha+total
    seed    = f"{cuit_emisor}{hoy}{total}"
    cae     = str(int(hashlib.md5(seed.encode()).hexdigest(), 16))[:14].ljust(14, "0")
    vto     = (hoy + datetime.timedelta(days=10)).strftime("%Y%m%d")
    # Número: usar timestamp para que sea único en el mock
    numero  = int(hoy.strftime("%j")) * 100 + random.randint(1, 99)

    logger.info("AFIP_MOCK=true — factura simulada CAE %s", cae)
    return ResultadoFactura(
        numero=numero,
        punto_venta=punto_venta,
        cae=cae,
        vencimiento_cae=vto,
        cuit_emisor=cuit_emisor,
        fecha=hoy.isoformat(),
        total=total,
        homo=True,
    )


def _cargar_cert_key(cliente_id: str) -> tuple[str, str]:
    """Lee cert y key encriptados de api_keys y los desencripta."""
    from app.extensions import get_supabase_admin
    from app.utils.crypto import decrypt, CryptoError

    admin = get_supabase_admin()
    rows = (
        admin.table("api_keys")
        .select("provider, encrypted_key")
        .eq("cliente_id", cliente_id)
        .in_("provider", ["afip_cert", "afip_key"])
        .execute()
    ).data or []

    by_provider = {r["provider"]: r["encrypted_key"] for r in rows}

    if "afip_cert" not in by_provider or "afip_key" not in by_provider:
        raise AfipError(
            "No tenés el certificado AFIP configurado. "
            "Andá a Configuración → Facturación electrónica AFIP y cargalo."
        )

    try:
        cert_pem = decrypt(by_provider["afip_cert"])
        key_pem  = decrypt(by_provider["afip_key"])
    except CryptoError as e:
        raise AfipError(f"Error desencriptando certificado AFIP: {e}") from e

    return cert_pem, key_pem


def _punto_venta(cliente_id: str) -> int:
    """Lee el punto de venta configurado. Default: 1."""
    from app.extensions import get_supabase_admin
    admin = get_supabase_admin()
    row = (
        admin.table("clientes")
        .select("afip_punto_venta")
        .eq("id", cliente_id)
        .execute()
    ).data
    if row and row[0].get("afip_punto_venta"):
        return int(row[0]["afip_punto_venta"])
    return 1


def emitir_factura_c(
    *,
    cliente_id: str,
    cuit_emisor: str,
    nombre_receptor: str,
    cuit_receptor: str | None = None,
    total: float,
    concepto: str = "servicios",
    fecha: datetime.date | None = None,
) -> ResultadoFactura:
    """
    Punto de entrada principal. Emite una Factura C para el cliente.

    En homo=True usa los endpoints de prueba de AFIP — no tiene efectos reales.
    """
    from .afip_wsaa import obtener_ta, WsaaError
    from .afip_wsfe import solicitar_cae, WsfeError

    if total <= 0:
        raise AfipError("El monto debe ser mayor a $0.")

    pv = _punto_venta(cliente_id)

    if MOCK:
        return _mock_factura(cuit_emisor, pv, total, fecha)

    cert_pem, key_pem = _cargar_cert_key(cliente_id)
    try:
        token, sign = obtener_ta(
            cuit=cuit_emisor,
            cert_pem=cert_pem,
            key_pem=key_pem,
            homo=HOMO,
        )
    except WsaaError as e:
        raise AfipError(f"Error autenticando con AFIP (WSAA): {e}") from e

    try:
        resultado = solicitar_cae(
            cuit_emisor=cuit_emisor,
            punto_venta=_punto_venta(cliente_id),
            token=token,
            sign=sign,
            homo=HOMO,
            nombre_receptor=nombre_receptor,
            cuit_receptor=cuit_receptor,
            total=total,
            concepto=concepto,
            fecha=fecha,
        )
    except WsfeError as e:
        raise AfipError(f"Error solicitando CAE a AFIP (WSFE): {e}") from e

    return ResultadoFactura(
        numero=resultado.numero,
        punto_venta=resultado.punto_venta,
        cae=resultado.cae,
        vencimiento_cae=resultado.vencimiento_cae,
        cuit_emisor=resultado.cuit_emisor,
        fecha=resultado.fecha,
        total=resultado.total,
        homo=HOMO,
    )


def emitir_factura_ab(
    *,
    cliente_id: str,
    cuit_emisor: str,
    nombre_receptor: str,
    cuit_receptor: str | None = None,
    tipo_cbte: str,            # "A" o "B"
    neto_gravado: float,
    alicuota: float,           # 21.0, 10.5 o 27.0
    iva_monto: float,
    total: float,
    concepto: str = "servicios",
    fecha: datetime.date | None = None,
) -> ResultadoFactura:
    """
    Emite una Factura A o B para clientes Responsables Inscriptos.

    Factura A: receptor RI, IVA discriminado.
    Factura B: receptor consumidor final o monotributista, IVA discriminado.
    """
    from .afip_wsfe import TIPO_FACTURA_A, TIPO_FACTURA_B, solicitar_cae_ab, WsfeError
    from .afip_wsaa import obtener_ta, WsaaError

    if total <= 0:
        raise AfipError("El monto total debe ser mayor a $0.")
    if neto_gravado <= 0:
        raise AfipError("El neto gravado debe ser mayor a $0.")

    tipo_int = TIPO_FACTURA_A if tipo_cbte.upper() == "A" else TIPO_FACTURA_B
    pv = _punto_venta(cliente_id)

    if MOCK:
        return _mock_factura_ab(cuit_emisor, pv, total, fecha, tipo_cbte.upper())

    cert_pem, key_pem = _cargar_cert_key(cliente_id)
    try:
        token, sign = obtener_ta(cuit=cuit_emisor, cert_pem=cert_pem, key_pem=key_pem, homo=HOMO)
    except WsaaError as e:
        raise AfipError(f"Error autenticando con AFIP (WSAA): {e}") from e

    try:
        resultado = solicitar_cae_ab(
            cuit_emisor=cuit_emisor,
            punto_venta=pv,
            token=token,
            sign=sign,
            homo=HOMO,
            tipo_cbte=tipo_int,
            cuit_receptor=cuit_receptor,
            neto_gravado=neto_gravado,
            alicuota=alicuota,
            iva_monto=iva_monto,
            total=total,
            concepto=concepto,
            fecha=fecha,
        )
    except WsfeError as e:
        raise AfipError(f"Error solicitando CAE a AFIP (WSFE): {e}") from e

    return ResultadoFactura(
        numero=resultado.numero,
        punto_venta=resultado.punto_venta,
        cae=resultado.cae,
        vencimiento_cae=resultado.vencimiento_cae,
        cuit_emisor=resultado.cuit_emisor,
        fecha=resultado.fecha,
        total=resultado.total,
        homo=HOMO,
    )
