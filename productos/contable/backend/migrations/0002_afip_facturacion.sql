-- ============================================================================
-- 0002_afip_facturacion.sql
-- Soporte para emisión de Facturas C desde WhatsApp via AFIP Web Services.
-- ============================================================================

-- Punto de venta AFIP del cliente (default "0001")
alter table public.clientes
  add column if not exists afip_punto_venta varchar(5) default '0001';

-- Extender el constraint de providers para almacenar cert y key AFIP encriptados.
-- Usamos la misma tabla api_keys para reutilizar la infraestructura Fernet.
alter table public.api_keys
  drop constraint if exists api_keys_provider_check;

alter table public.api_keys
  add constraint api_keys_provider_check
  check (provider in ('anthropic', 'openai', 'google', 'afip_cert', 'afip_key'));
