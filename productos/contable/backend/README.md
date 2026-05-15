# asistentes-backend

Servicio de aplicación de la plataforma de asistentes IA para emprendedores.

Compuesto por dos procesos:

- **Flask (Python 3.13)** — API REST que orquesta extracción IA, AFIP, persistencia en Supabase y comunicación con Baileys.
- **Baileys (Node.js 24 LTS)** — supervisor de instancias de WhatsApp, una por cliente.

> Lee también [`CLAUDE.md`](./CLAUDE.md) y [`ARCHITECTURE.md`](./ARCHITECTURE.md) antes de tocar código.

---

## Requisitos

- Python 3.13
- Node.js 24 LTS
- (Opcional, para deploy) Docker + docker-compose
- Una cuenta de Supabase (no hace falta para el primer arranque local — las migraciones quedan listas para aplicar cuando exista el proyecto)

## Setup local

### 1. Clonar y entrar

```bash
cd asistentes-backend
```

### 2. Variables de entorno

```bash
cp .env.example .env
# Editar .env con valores reales (o de prueba)
```

Para arranque local sin Supabase ni AFIP, las variables pueden quedar con valores placeholder; los servicios que las requieran fallarán con un error claro.

### 3. Flask

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
flask --app app run --debug --port 5001
```

Endpoint de salud: `GET http://localhost:5001/api/v1/health`

### 4. Baileys

```bash
cd baileys_service
npm install
npm run dev
```

Endpoint interno: `http://localhost:3001`

### 5. Migraciones de Supabase

Cuando exista el proyecto Supabase:

```bash
# Con Supabase CLI instalada y proyecto linkeado
supabase db push
```

Las migraciones están en [`migrations/`](./migrations/) en orden numérico.

## Tests

```bash
# Flask
pytest

# Baileys
cd baileys_service && npm test
```

## Deploy

Ver [`ARCHITECTURE.md`](./ARCHITECTURE.md). Resumen: Hetzner CPX21 + docker-compose + Nginx con Let's Encrypt.

## Troubleshooting

| Síntoma | Causa probable | Acción |
|---|---|---|
| `KeyError: SUPABASE_URL` al arrancar Flask | `.env` sin completar | Copiar `.env.example` a `.env` y rellenar. |
| Baileys no genera QR | sesión vieja en Storage | Borrar fila correspondiente en `sesiones_baileys`. |
| `INVALID_CUIT` en validación AFIP | el stub está activo (no hay cert) | Esperado en local sin certificado. |
| `401` en endpoints `/api/v1/*` | falta header `Authorization: Bearer <jwt>` | Loguearse en el dashboard y copiar el JWT. |

## Estructura

```
app/                     # Flask
  blueprints/            # endpoints agrupados por dominio
  services/              # lógica de negocio (IA, AFIP, alertas, etc.)
  utils/                 # crypto, validaciones, auth
baileys_service/         # Node.js
  src/
    handlers/            # handlers de mensajes WhatsApp
migrations/              # SQL versionado
prompts/                 # prompts de IA en .md
tests/                   # pytest
```
