-- ============================================================================
-- 0001_initial_schema.sql
-- Esquema inicial de la plataforma de asistentes IA.
-- Aplicar con: supabase db push  (con el proyecto linkeado)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensiones
-- ----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Tabla: clientes (extiende auth.users)
-- ----------------------------------------------------------------------------
create table public.clientes (
    id                      uuid primary key references auth.users(id) on delete cascade,
    cuit                    varchar(13)  not null unique,
    razon_social            varchar(255) not null,
    whatsapp                varchar(20)  not null unique,
    email                   varchar(255) not null,
    condicion_fiscal        text         not null default 'monotributo'
        check (condicion_fiscal in ('monotributo', 'responsable_inscripto', 'exento')),
    categoria_monotributo   varchar(5),
    plan                    text         not null default 'trial'
        check (plan in ('trial', 'solo', 'negocio', 'pro')),
    activo                  boolean      not null default true,
    created_at              timestamptz  not null default now(),
    updated_at              timestamptz  not null default now()
);

create index idx_clientes_whatsapp on public.clientes (whatsapp);
create index idx_clientes_activo   on public.clientes (activo) where activo = true;

-- ----------------------------------------------------------------------------
-- Tabla: api_keys (BYOK encriptadas)
-- ----------------------------------------------------------------------------
create table public.api_keys (
    id                  uuid primary key default uuid_generate_v4(),
    cliente_id          uuid not null references public.clientes(id) on delete cascade,
    provider            text not null check (provider in ('anthropic', 'openai', 'google')),
    encrypted_key       text not null,
    key_hint            varchar(8),
    last_validated_at   timestamptz,
    last_used_at        timestamptz,
    created_at          timestamptz not null default now(),
    unique (cliente_id, provider)
);

create index idx_api_keys_cliente on public.api_keys (cliente_id);

-- ----------------------------------------------------------------------------
-- Tabla: facturas
-- ----------------------------------------------------------------------------
create table public.facturas (
    id                          uuid primary key default uuid_generate_v4(),
    cliente_id                  uuid not null references public.clientes(id) on delete cascade,
    tipo                        text not null check (tipo in ('compra', 'venta')),
    tipo_comprobante            varchar(10),
    punto_venta                 varchar(5),
    numero                      varchar(20),
    fecha                       date,
    cuit_contraparte            varchar(13),
    razon_social_contraparte    varchar(255),
    subtotal                    numeric(12, 2),
    iva                         numeric(12, 2),
    total                       numeric(12, 2),
    moneda                      varchar(5) not null default 'ARS',
    imagen_path                 text not null,
    extraccion_json             jsonb,
    confianza_global            integer check (confianza_global between 0 and 100),
    estado                      text not null default 'pendiente_revision'
        check (estado in ('pendiente_revision', 'confirmada', 'corregida', 'rechazada')),
    categoria                   varchar(50),
    notas                       text,
    hash_imagen                 varchar(64),
    created_at                  timestamptz not null default now(),
    updated_at                  timestamptz not null default now()
);

create index idx_facturas_cliente_fecha on public.facturas (cliente_id, fecha desc);
create index idx_facturas_estado        on public.facturas (cliente_id, estado);
create index idx_facturas_tipo          on public.facturas (cliente_id, tipo);
create unique index idx_facturas_hash_unico
    on public.facturas (cliente_id, hash_imagen)
    where hash_imagen is not null;

-- ----------------------------------------------------------------------------
-- Tabla: items_factura
-- ----------------------------------------------------------------------------
create table public.items_factura (
    id                  uuid primary key default uuid_generate_v4(),
    factura_id          uuid not null references public.facturas(id) on delete cascade,
    descripcion         text,
    cantidad            numeric(10, 3),
    precio_unitario     numeric(12, 2),
    subtotal            numeric(12, 2)
);

create index idx_items_factura on public.items_factura (factura_id);

-- ----------------------------------------------------------------------------
-- Tabla: conversaciones_wpp (FSM por cliente)
-- ----------------------------------------------------------------------------
create table public.conversaciones_wpp (
    id              uuid primary key default uuid_generate_v4(),
    cliente_id      uuid not null references public.clientes(id) on delete cascade,
    factura_id      uuid references public.facturas(id) on delete set null,
    estado          text not null
        check (estado in ('libre', 'esperando_confirmacion', 'esperando_correccion')),
    contexto        jsonb,
    expires_at      timestamptz,
    created_at      timestamptz not null default now()
);

create index idx_conv_cliente on public.conversaciones_wpp (cliente_id);
create index idx_conv_expires on public.conversaciones_wpp (expires_at) where expires_at is not null;

-- ----------------------------------------------------------------------------
-- Tabla: sesiones_baileys
-- ----------------------------------------------------------------------------
create table public.sesiones_baileys (
    id                  uuid primary key default uuid_generate_v4(),
    cliente_id          uuid not null unique references public.clientes(id) on delete cascade,
    numero_whatsapp     varchar(20),
    estado              text not null default 'desconectado'
        check (estado in ('conectado', 'desconectado', 'esperando_qr')),
    session_data        text,
    ultimo_heartbeat    timestamptz,
    created_at          timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Tabla: cache_afip
-- ----------------------------------------------------------------------------
create table public.cache_afip (
    cuit            varchar(13) primary key,
    razon_social    varchar(255),
    condicion_iva   varchar(50),
    estado          varchar(50),
    domicilio       text,
    consultado_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Tabla: waitlist (landing pública)
-- ----------------------------------------------------------------------------
create table public.waitlist (
    id                  uuid primary key default uuid_generate_v4(),
    email               varchar(255) not null,
    nombre              varchar(100),
    servicio_interes    varchar(50),
    mensaje             text,
    created_at          timestamptz not null default now()
);

create index idx_waitlist_email on public.waitlist (email);

-- ----------------------------------------------------------------------------
-- Trigger: actualizar updated_at automáticamente
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger trg_clientes_updated_at
    before update on public.clientes
    for each row execute function public.set_updated_at();

create trigger trg_facturas_updated_at
    before update on public.facturas
    for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.clientes              enable row level security;
alter table public.api_keys              enable row level security;
alter table public.facturas              enable row level security;
alter table public.items_factura         enable row level security;
alter table public.conversaciones_wpp    enable row level security;
alter table public.sesiones_baileys      enable row level security;
alter table public.cache_afip            enable row level security;
alter table public.waitlist              enable row level security;

-- clientes: el usuario solo lee/edita su propia fila.
create policy "clientes_select_own"
    on public.clientes for select
    using (auth.uid() = id);

create policy "clientes_update_own"
    on public.clientes for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- api_keys, facturas, items_factura, conversaciones_wpp, sesiones_baileys:
-- el usuario solo accede a filas con cliente_id = auth.uid().
create policy "api_keys_owner"
    on public.api_keys for all
    using (auth.uid() = cliente_id)
    with check (auth.uid() = cliente_id);

create policy "facturas_owner"
    on public.facturas for all
    using (auth.uid() = cliente_id)
    with check (auth.uid() = cliente_id);

create policy "items_factura_owner"
    on public.items_factura for all
    using (
        exists (
            select 1 from public.facturas f
            where f.id = items_factura.factura_id
            and f.cliente_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.facturas f
            where f.id = items_factura.factura_id
            and f.cliente_id = auth.uid()
        )
    );

create policy "conversaciones_wpp_owner"
    on public.conversaciones_wpp for all
    using (auth.uid() = cliente_id)
    with check (auth.uid() = cliente_id);

create policy "sesiones_baileys_owner"
    on public.sesiones_baileys for all
    using (auth.uid() = cliente_id)
    with check (auth.uid() = cliente_id);

-- cache_afip: solo lectura para usuarios autenticados.
create policy "cache_afip_read"
    on public.cache_afip for select
    using (auth.role() = 'authenticated');

-- waitlist: insert público (anon), select solo service_role.
create policy "waitlist_insert_public"
    on public.waitlist for insert
    to anon, authenticated
    with check (true);

-- (No policy de SELECT → solo service_role puede leer)

-- ----------------------------------------------------------------------------
-- Storage bucket: facturas-imagenes
-- ----------------------------------------------------------------------------
-- Crear el bucket privado desde el dashboard de Supabase o vía API.
-- Policies:
--   - Lectura: el cliente solo accede a archivos en path {cliente_id}/...
--   - Escritura: solo service_role (el backend sube las imágenes).
--
-- Ejemplo de policy a aplicar manualmente en Storage:
--
--   create policy "facturas_read_own"
--       on storage.objects for select
--       using (
--           bucket_id = 'facturas-imagenes'
--           and (storage.foldername(name))[1] = auth.uid()::text
--       );
