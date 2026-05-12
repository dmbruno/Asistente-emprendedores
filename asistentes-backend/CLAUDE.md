# CLAUDE.md — Guía para asistentes IA

> Este archivo orienta a Claude Code, Cursor y similares cuando trabajen con este repo.
> Si sos un asistente IA leyendo esto: tomátelo como contexto base obligatorio antes de cualquier cambio.

## Qué es este proyecto

`asistentes-backend` es el corazón de la plataforma de asistentes IA. Contiene dos procesos:

- **Flask** (Python 3.13): API REST que orquesta extracción de facturas con Claude visión, validación contra AFIP, persistencia en Supabase y comunicación con el bot de WhatsApp.
- **Baileys** (Node.js 24 LTS): supervisor de instancias de WhatsApp. Cada cliente activo tiene su propia instancia con su propio número.

## Stack

- Python 3.13, Flask, Pydantic v2, anthropic SDK, openpyxl, gunicorn
- Node.js 24 LTS, `@whiskeysockets/baileys`
- Supabase (PostgreSQL + Auth + Storage + RLS)
- Docker + docker-compose para deploy

## Estructura

```
app/
  __init__.py            # factory pattern de Flask
  config.py              # carga de env vars con Pydantic Settings
  extensions.py          # clientes (Supabase, Anthropic por request)
  blueprints/
    webhook_wpp/         # endpoints públicos auth con shared secret
    facturas/            # CRUD privado (JWT Supabase)
    clientes/            # /me y similares
    api_keys/            # gestión BYOK
  services/
    extraccion_ia.py     # llama a Claude Sonnet 4 con visión
    afip.py              # padrón AFIP (stub si no hay cert)
    excel_export.py      # genera Excel del periodo
    alertas.py           # cron tope monotributo
    conversacion.py      # FSM de WhatsApp
  utils/
    crypto.py            # Fernet roundtrip para api_keys
    cuit.py              # checksum y formateo de CUIT
    auth.py              # verificación JWT de Supabase
baileys_service/
  src/
    index.js             # supervisor
    instance.js          # una instancia Baileys por cliente
    supabase.js          # persistencia de sesiones
    handlers/            # mensajes entrantes
migrations/              # SQL versionado, NO tocar las ya aplicadas
prompts/                 # prompts de IA en markdown, versionados
tests/                   # pytest
```

## Convenciones de código

- **Python**: PEP 8, formateo con `ruff format`, lint con `ruff check`. Type hints siempre. Pydantic v2 para todos los schemas de I/O.
- **JS**: ESM (`"type": "module"`), Node 24, `prettier` + `eslint`.
- **Naming**: español para dominio (factura, cliente, inmueble), inglés para infra (request, payload, handler).
- **Errores**: nunca devolver tracebacks al cliente. Loggear con `logging` (Python) o `pino` (Node) y devolver mensaje genérico.
- **Secretos**: NUNCA hardcodear. Siempre `.env` + `os.environ` / `process.env`. El `.env.example` es la fuente de verdad de qué vars existen.
- **Commits**: en español, formato `feat: ...`, `fix: ...`, `refactor: ...`, `docs: ...`, `test: ...`.

## Cosas que NO debe hacer un asistente IA en este repo

- No commitear `.env`, `*.crt`, `*.key`, ni el `master_key` de Fernet.
- No instalar dependencias nuevas sin justificarlo y confirmarlo.
- No cambiar versiones mayores de Flask, anthropic SDK, Pydantic o Baileys sin avisar.
- No modificar migraciones ya aplicadas (las que están en `main`); crear migraciones nuevas con número siguiente.
- No deshabilitar tests para que el CI pase.
- No quitar políticas RLS de Supabase. Si una policy molesta, abrirla con criterio explícito (ej: `service_role bypass`), no eliminarla.
- No imprimir API keys, JWTs ni session data en logs.
- No usar `requests` síncrono en handlers que ya son async; respetar el modelo del framework.

## Decisiones de arquitectura ya tomadas (no replantear sin discusión)

- **BYOK**: las API keys de IA las trae el cliente, no la plataforma. Se guardan encriptadas con Fernet.
- **Multi-tenant con RLS**: la separación entre clientes la hace Postgres con `auth.uid()`, no la app. La app sólo confía en que los queries pasan por el JWT del usuario.
- **Una instancia de Baileys por cliente**: no hay bot compartido. Cada cliente tiene su número.
- **Sesiones de Baileys en Supabase Storage**: encriptadas. Esto permite reiniciar el contenedor sin perder el pareo.
- **Modelo principal**: `claude-opus-4-7` para visión en MVP. Abstracción para sumar OpenAI/Google después.
- **Plan piloto**: en MVP el plan se hardcodea a `'trial'` y se cambia manualmente en la DB. Sin checkout.

## Cómo correr migraciones de Supabase

```bash
# 1. Instalar Supabase CLI (una vez)
brew install supabase/tap/supabase

# 2. Linkear el proyecto local con el remoto
supabase link --project-ref <ref>

# 3. Aplicar migraciones nuevas
supabase db push

# 4. Crear una migración nueva
supabase migration new <nombre_descriptivo>
# Esto crea un archivo en supabase/migrations/. Mover el SQL a migrations/ del repo.
```

**Regla**: nunca editar una migración ya aplicada. Crear una nueva con número incremental.

## Cómo agregar un endpoint nuevo

1. Crear blueprint en `app/blueprints/<dominio>/` con `__init__.py`, `routes.py`, `schemas.py`.
2. Registrar el blueprint en `app/__init__.py` con su `url_prefix`.
3. Schema de input/output en `schemas.py` con Pydantic v2.
4. Lógica en `app/services/` si requiere algo no trivial.
5. Tests en `tests/test_<dominio>.py`.
6. Documentar en la colección Postman.

Plantilla mínima de blueprint:

```python
# app/blueprints/<dominio>/__init__.py
from flask import Blueprint
bp = Blueprint("<dominio>", __name__, url_prefix="/api/v1/<dominio>")
from . import routes  # noqa
```

## Cómo agregar un servicio nuevo (ej. cotizador de viajes)

El backend está pensado para soportar más asistentes verticales sin tocar lo existente:

1. Crear blueprint en `app/blueprints/<servicio>/`.
2. Crear servicio de dominio en `app/services/<servicio>_*.py`.
3. Si requiere persistencia, agregar tablas con prefijo del dominio (ej: `cotizador_viajes`) en una migración nueva.
4. Registrar el blueprint sin tocar los existentes.
5. Si requiere conversación por WhatsApp, agregar handler en Baileys que apunte al webhook nuevo.

## Diagrama del flujo principal

```
Cliente envía foto a su WhatsApp
        │
        ▼
┌──────────────────────┐
│  Baileys (Node.js)   │  ← una instancia por cliente
│  - descarga imagen   │
│  - identifica tipo   │
└──────────┬───────────┘
           │ POST /webhook/wpp/factura (shared secret)
           ▼
┌──────────────────────────────────────┐
│            Flask API                 │
│ ┌──────────────────────────────────┐ │
│ │ services/extraccion_ia.py        │ │
│ │  - lee api_key del cliente       │ │
│ │  - llama Claude Opus 4.7 visión  │ │
│ │  - valida JSON con Pydantic      │ │
│ │  - valida matemática             │ │
│ └──────────┬───────────────────────┘ │
│            │                         │
│            ▼                         │
│ ┌──────────────────────────────────┐ │
│ │ services/afip.py (stub o real)   │ │
│ │  - cruza CUIT con padrón         │ │
│ └──────────┬───────────────────────┘ │
└────────────┼─────────────────────────┘
             │ insert factura + items
             ▼
       ┌─────────────┐
       │  Supabase   │  ← RLS por cliente_id
       │  Postgres   │
       │  Storage    │  ← imagen encriptada en bucket privado
       └─────────────┘
             │
             ▼ resumen_texto + factura_id
       ┌──────────────┐
       │  Baileys     │
       └──────┬───────┘
              ▼
   Cliente ve resumen y confirma
```

## Cómo iterar sobre este código

1. Antes de hacer cambios, leer este archivo y el `README.md`.
2. Si el cambio toca DB → crear migración nueva, no modificar la DB en vivo.
3. Si el cambio toca contratos de API entre repos (backend ↔ dashboard ↔ landing) → avisar y actualizar los 3.
4. Correr `pytest` antes de proponer un cambio.
5. Commits atómicos en español.

## Contexto de negocio relevante

- Usuario final: emprendedores hispanohablantes, foco inicial Argentina.
- Cliente piloto: monotributista con < 100 facturas/mes.
- Canal principal: WhatsApp. El dashboard es secundario (revisión y export).
- La plataforma escalará a más servicios verticales (cotizador, agendador, etc.).

## Documentación adicional

- [`README.md`](./README.md) — setup y deploy
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — decisiones de diseño y diagramas
- `prompts/` — prompts de IA versionados
- `migrations/` — esquema SQL versionado
