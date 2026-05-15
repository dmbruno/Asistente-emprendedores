# ARCHITECTURE.md — Decisiones de diseño

## Vista general

```
┌────────────────────────────────────────────────────────────────────┐
│                            CLIENTE                                 │
│  WhatsApp del cliente ──► Baileys (instancia dedicada)             │
│  Browser ──► Dashboard (Next.js) ──► Flask API                     │
│  Browser ──► Landing (Next.js)                                     │
└────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│                          PLATAFORMA                                │
│                                                                    │
│  ┌──────────────┐   shared secret   ┌────────────────────┐         │
│  │ Baileys (Node)│ ◄────────────────►│   Flask API        │         │
│  │ N instancias │                    │  - blueprints      │         │
│  └──────┬───────┘                    │  - services        │         │
│         │                            │  - utils           │         │
│         │ download/upload session    └─────────┬──────────┘         │
│         ▼                                      │                    │
│  ┌──────────────────────────────────────────────┼─────────────┐    │
│  │                  Supabase                    ▼             │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │    │
│  │  │  Postgres   │  │   Storage   │  │      Auth        │   │    │
│  │  │   (RLS)     │  │  (privado)  │  │  (magic link)    │   │    │
│  │  └─────────────┘  └─────────────┘  └──────────────────┘   │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Anthropic API  │
                       │  (BYOK por user) │
                       └──────────────────┘
```

## Decisiones clave

### 1. Multi-tenant con Row Level Security

La separación entre clientes la hace **Postgres**, no la aplicación. Cada query que usa la `anon key` o el JWT del usuario respeta automáticamente las policies. Esto reduce drásticamente la superficie de bugs de aislamiento.

**Implicancia**: el backend Flask usa la `service_role key` solo para operaciones de servicio (escribir como sistema, leer de tablas como `waitlist`). Las consultas en nombre de un usuario van con su JWT.

### 2. BYOK (Bring Your Own Key)

Cada cliente carga su propia API key de Anthropic/OpenAI/Google. La plataforma no paga tokens.

**Almacenamiento**:
- Tabla `api_keys` con campo `encrypted_key` (Fernet).
- `master_key` de Fernet en variable de entorno `MASTER_KEY` del backend (rotable).
- `key_hint` (últimos 4 chars) para mostrar en UI sin desencriptar.

**Validación**: al guardar, se hace una llamada de prueba al provider; si falla, no se persiste.

### 3. Una instancia de Baileys por cliente

No hay un bot compartido. Cada cliente activo tiene su propio número y su propia instancia.

**Por qué**:
- WhatsApp banea bots compartidos.
- El cliente pone su número personal o uno dedicado.
- Permite que cada cliente tenga su propio historial sin mezclar.

**Cómo**:
- El servicio Baileys es un supervisor que mantiene N instancias en memoria.
- Cada instancia tiene `cliente_id` y persiste su sesión en Supabase Storage (encriptada).
- Si el contenedor reinicia, las instancias se rehidratan desde Storage sin pedir QR otra vez.

### 4. Flask vs todo-en-Supabase

Supabase soporta funciones Edge, pero elegimos Flask para la lógica de aplicación porque:

- **Stateful con Baileys**: el servicio Node.js no encaja en serverless.
- **Llamadas largas a IA**: visión puede tardar 10-30s; serverless con timeout corto es riesgoso.
- **Validaciones complejas**: AFIP requiere certificado digital y librerías Python.

Supabase queda como **infraestructura de datos**: DB, Auth, Storage, RLS. La lógica vive en Flask.

### 5. Modelo de IA para visión

MVP: `claude-opus-4-7` con visión.

**Por qué Opus**:
- Mejor extracción de tickets borrosos / fotos torcidas.
- En BYOK el costo lo paga el cliente, no la plataforma.
- Para el cliente piloto (< 100 facturas/mes) el costo mensual es bajo.

**Abstracción**: `services/extraccion_ia.py` recibe `provider` como parámetro y enrutará a OpenAI/Google cuando se sumen.

### 6. AFIP

Consulta de padrón vía webservice oficial con certificado digital.

**MVP**: stub que devuelve un objeto vacío con `validado=False`. Se activa el modo real cuando se carga `AFIP_CERT_PATH` en el `.env`.

**Cache**: 30 días en tabla `cache_afip` para no agotar el rate limit de AFIP.

### 7. Plan piloto sin checkout

El campo `plan` arranca en `'trial'` para todos. Se cambia manualmente en la DB hasta que entre Stripe en una fase posterior. No hay enforcement de límites por plan en MVP.

## Flujo: subir una factura por WhatsApp

```
1. Cliente envía foto de factura + texto "compra"
       │
       ▼
2. Baileys recibe el mensaje
   - identifica tipo (compra/venta) por palabra clave
   - descarga imagen
   - calcula hash sha256 (para detectar duplicados)
       │
       ▼
3. POST /webhook/wpp/factura  (Flask)
   {
     cliente_id, tipo, imagen_bytes, hash_imagen
   }
       │
       ▼
4. Flask:
   a. ¿hash duplicado en facturas del cliente? → responde "ya cargada"
   b. sube imagen a Supabase Storage (path: {cliente_id}/{uuid}.jpg)
   c. lee api_key del cliente, desencripta
   d. llama a Claude Opus 4.7 con la imagen + prompt de extracción
   e. valida JSON con Pydantic
   f. valida matemática (subtotal + impuestos ≈ total)
   g. cruza CUIT contra AFIP (o stub)
   h. guarda fila en facturas con estado='pendiente_revision'
   i. crea fila en conversaciones_wpp con estado='esperando_confirmacion'
   j. responde { resumen_texto, factura_id, requiere_confirmacion: true }
       │
       ▼
5. Baileys envía resumen al cliente:
   "📄 Factura A 0001-00012345
    💰 Total: $42.000
    📅 Fecha: 04/05/2026
    🏢 Emisor: Acme S.A.

    ¿Confirmás? (sí / no / "el total es X")"
       │
       ▼
6. Cliente responde
       │
       ▼
7. POST /webhook/wpp/comando  (Flask)
   - "si" → factura.estado = 'confirmada'
   - "no" → factura.estado = 'rechazada'
   - texto libre → reabre conversación, pide aclaración
       │
       ▼
8. Flask responde mensaje final
       │
       ▼
9. Baileys lo manda al cliente
```

## Flujo: dashboard accede a facturas

```
1. Usuario abre /dashboard/facturas
       │
       ▼
2. Next.js (server component) llama a Supabase con el JWT del usuario
       │
       ▼
3. Postgres aplica RLS:
   SELECT * FROM facturas WHERE cliente_id = auth.uid()
       │
       ▼
4. Devuelve solo las facturas del usuario
```

Para corrección manual:

```
1. Usuario edita factura
       │
       ▼
2. PATCH /api/v1/facturas/<id>  (Flask, JWT del usuario)
       │
       ▼
3. Flask:
   a. verifica JWT con SUPABASE_JWT_SECRET
   b. extrae user_id del JWT
   c. UPDATE facturas SET ... WHERE id=? AND cliente_id=user_id
   d. cambia estado a 'corregida'
```

## Topología de deploy (producción)

- **Hetzner CPX21** (4 vCPU, 8 GB RAM): backend.
  - Docker Compose levanta `flask`, `baileys`, `nginx`.
  - Let's Encrypt con `certbot` en `nginx`.
- **Vercel**: landing y dashboard.
- **Supabase managed**: DB + Auth + Storage.

## Errores y observabilidad

- **Logging**: stdout/stderr → recogido por Docker.
- **Sentry** (opcional): `SENTRY_DSN` en `.env`. Captura errores no manejados.
- **Métricas básicas**: contador de facturas procesadas, tiempo medio de extracción IA, errores por cliente.

## Seguridad

- HTTPS obligatorio en producción.
- JWTs verificados con `SUPABASE_JWT_SECRET` en cada request privado.
- Webhooks Baileys ↔ Flask autenticados con `BAILEYS_SHARED_SECRET` (header `X-Baileys-Token`).
- API keys de clientes encriptadas en reposo (Fernet) y nunca logueadas.
- Imágenes en bucket privado de Supabase. Acceso solo con signed URLs (TTL corto).
- Sesiones de Baileys encriptadas antes de subir a Storage.

## Backup y recuperación

- Postgres: backups automáticos de Supabase.
- Storage: backups automáticos de Supabase.
- Sesiones de Baileys: si se pierden, el cliente debe escanear QR de nuevo.

## Roadmap técnico (no MVP)

- Stripe checkout para los planes.
- Soporte OpenAI / Google además de Anthropic.
- Detección de duplicados con embeddings (no solo hash).
- App móvil con Expo apuntando a la misma API.
- Dashboard del contador (multi-cliente).
