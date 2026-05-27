# Instrucciones para Claude Code — mcp-travel-quoter

## Contexto

Este proyecto es una copia local del Cotizador de Viajes desarrollado en el monorepo de PropioIA.
El monorepo (fuente de verdad actualizada) está en:

```
/Users/diegobruno/Documents/Programacion/proyectosPropios/asistentes-emprendedores/productos/travel-quoter/
```

El objetivo de esta sesión es:
1. Sincronizar este proyecto con la versión del monorepo
2. Convertir el backend en un servidor MCP

Hacé las dos tareas en orden. No avances al paso 2 sin terminar el paso 1.

---

## Paso 1 — Sincronizar con el monorepo

Copiá estos archivos del monorepo a este proyecto, reemplazando los existentes:

### Backend — archivos a copiar

```
app/agent.py
app/config.py
app/main.py
app/routers/__init__.py
app/routers/suscripcion.py
app/tools/__init__.py
app/tools/email_sender.py
app/tools/flights.py
app/tools/hotels.py
app/tools/quote_builder.py
requirements.txt
```

Ruta origen de cada archivo:
```
/Users/diegobruno/Documents/Programacion/proyectosPropios/asistentes-emprendedores/productos/travel-quoter/backend/<archivo>
```

### Dashboard — archivos a copiar

Copiá el dashboard completo:
```
/Users/diegobruno/Documents/Programacion/proyectosPropios/asistentes-emprendedores/productos/travel-quoter/dashboard/
```

### Archivos que NO hay que copiar

- `.env` — cada proyecto tiene sus propias keys
- `venv/` — entorno virtual local
- `node_modules/`
- `.gitignore`
- `Dockerfile`

### Verificación del paso 1

Una vez copiados los archivos:
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Confirmá que el backend arranca sin errores antes de continuar.

---

## Paso 2 — Convertir a MCP

Una vez verificado que el proyecto funciona igual que el monorepo, convertí el backend en un servidor MCP.

### Qué es lo que hay que hacer

Las tools ya están escritas y funcionan. El trabajo es crear un archivo nuevo `backend/mcp_server.py` que las exponga como tools MCP usando el SDK oficial de Anthropic.

**No modificar ningún archivo existente.** Solo crear `mcp_server.py`.

### Instalar el SDK

```bash
cd backend
source venv/bin/activate
pip install mcp
```

Agregá `mcp` al `requirements.txt`.

### Estructura del servidor MCP a crear

El archivo `mcp_server.py` debe:

- Importar las tools desde `app/tools/flights.py`, `app/tools/hotels.py`, `app/tools/quote_builder.py`, `app/tools/email_sender.py`
- Exponer estas 4 tools MCP:
  - `search_flights` — busca vuelos reales via SerpAPI
  - `search_hotels` — busca hoteles reales via SerpAPI
  - `build_quote` — arma la cotización estructurada
  - `send_quote_email` — envía la cotización por email
- Leer todas las API keys desde variables de entorno (`.env`)
- Correr por **stdio** (no HTTP) para ser compatible con Claude Desktop
- Las descripciones de cada tool deben ser claras y detalladas para que el LLM sepa cuándo llamarlas y qué parámetros usar

### Variables de entorno que necesita el MCP

```
SERPAPI_KEY
GMAIL_SENDER
GMAIL_CLIENT_ID
GMAIL_CLIENT_SECRET
GMAIL_REFRESH_TOKEN
```

El MCP no necesita Supabase ni auth — corre localmente.

### Configuración de Claude Desktop

Una vez creado `mcp_server.py`, generá también el bloque de configuración que hay que agregar en:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

El bloque debe verse así (con las rutas absolutas correctas de esta máquina):
```json
{
  "mcpServers": {
    "cotizador-viajes": {
      "command": "python",
      "args": ["/Users/diegobruno/Documents/Programacion/mcp-travel-quoter/backend/mcp_server.py"],
      "env": {
        "SERPAPI_KEY": "",
        "GMAIL_SENDER": "",
        "GMAIL_CLIENT_ID": "",
        "GMAIL_CLIENT_SECRET": "",
        "GMAIL_REFRESH_TOKEN": ""
      }
    }
  }
}
```

Dejá los valores vacíos — Diego los completa con sus keys reales.

### Verificación del paso 2

1. Reiniciar Claude Desktop
2. Confirmar que aparece el ícono de herramientas en el chat
3. Probar con: "Buscame vuelos de Buenos Aires a Miami para el 15 de agosto, 2 personas"
4. El agente debe llamar `search_flights` y `search_hotels` automáticamente

---

## Notas importantes

- El `mcp_server.py` convive con el proyecto sin romper nada. La app web FastAPI sigue funcionando igual.
- Si algo falla en el MCP, los logs están en: `~/Library/Logs/Claude/`
- Las keys del `.env` del backend son las mismas que van en el `claude_desktop_config.json`
- Si hay dudas sobre cómo funciona alguna tool, leer el archivo correspondiente en `app/tools/`
