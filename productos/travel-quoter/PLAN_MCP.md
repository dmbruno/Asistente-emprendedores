# Plan: Actualizar proyecto original + convertir a MCP

## Contexto

El proyecto de Travel Quoter fue desarrollado en el monorepo de PropioIA (`productos/travel-quoter/`).
Hay una copia anterior en otra carpeta local que quedó desactualizada.
Este plan cubre: 1) sincronizar esa copia, 2) convertirla en un servidor MCP.

---

## Paso 1 — Ubicar el proyecto original

Antes de arrancar, confirmá la ruta exacta del proyecto viejo en tu máquina.
Ejemplo: `~/Documents/travel-quoter/` o donde esté.

---

## Paso 2 — Copiar los archivos actualizados

Desde la terminal, reemplazás el backend y el dashboard completos.
El monorepo es la fuente de verdad — no hay nada que mergear.

```bash
# Reemplazar backend
cp -r /Users/diegobruno/Documents/Programacion/proyectosPropios/asistentes-emprendedores/productos/travel-quoter/backend/ ~/ruta/al/proyecto-original/

# Reemplazar dashboard
cp -r /Users/diegobruno/Documents/Programacion/proyectosPropios/asistentes-emprendedores/productos/travel-quoter/dashboard/ ~/ruta/al/proyecto-original/
```

Ajustá `~/ruta/al/proyecto-original/` con la ruta real.

---

## Paso 3 — Verificar que sigue funcionando

```bash
cd ~/ruta/al/proyecto-original/backend
source venv/bin/activate
pip install -r requirements.txt   # por si hay deps nuevas
uvicorn app.main:app --reload

# En otra terminal
cd ~/ruta/al/proyecto-original/dashboard
npm install
npm run dev
```

Probá una cotización en el chat para confirmar que todo funciona igual que en el monorepo.

---

## Paso 4 — Convertir a MCP

### 4.1 Instalar el SDK de MCP

```bash
cd ~/ruta/al/proyecto-original/backend
source venv/bin/activate
pip install mcp
```

### 4.2 Pedirle a Claude que cree el servidor MCP

Abrí Claude Code en la carpeta `backend/` del proyecto original y usá este prompt:

```
Tengo un agente de cotización de viajes con estas tools:
- search_flights  → tools/flights.py
- search_hotels   → tools/hotels.py
- build_quote     → tools/quote_builder.py
- send_quote_email → tools/email_sender.py

Creá un archivo nuevo llamado mcp_server.py en la raíz del backend
usando el SDK oficial de Anthropic (paquete `mcp` en PyPI).
El servidor debe:
- Exponer las 4 tools como tools MCP
- Correr por stdio (para conectarlo en Claude Desktop)
- Leer las API keys desde variables de entorno (.env)
- NO modificar ningún archivo existente, solo crear mcp_server.py
```

### 4.3 Configurar Claude Desktop

Abrí el archivo de configuración de Claude Desktop:

```
# Mac
~/Library/Application Support/Claude/claude_desktop_config.json
```

Agregá el servidor MCP:

```json
{
  "mcpServers": {
    "cotizador-viajes": {
      "command": "python",
      "args": ["/ruta/al/proyecto-original/backend/mcp_server.py"],
      "env": {
        "SERPAPI_KEY": "tu-serpapi-key",
        "ANTHROPIC_API_KEY": "tu-anthropic-key",
        "GMAIL_SENDER": "tu-email@gmail.com",
        "GMAIL_CLIENT_ID": "...",
        "GMAIL_CLIENT_SECRET": "...",
        "GMAIL_REFRESH_TOKEN": "..."
      }
    }
  }
}
```

### 4.4 Reiniciar Claude Desktop

Cerrá y volvé a abrir Claude Desktop. En el chat debería aparecer el ícono de herramientas indicando que el MCP está conectado.

---

## Paso 5 — Probar

En Claude Desktop, escribí:

```
Buscame vuelos de Buenos Aires a Miami para el 15 de agosto, 2 personas
```

Claude debería:
1. Detectar que tiene las tools del cotizador
2. Llamar `search_flights` automáticamente
3. Llamar `search_hotels`
4. Armar la cotización con `build_quote`
5. Opcionalmente enviar por email con `send_quote_email`

---

## Qué cambia vs. qué queda igual

| Archivo | App web | MCP |
|---|---|---|
| `tools/flights.py` | sin cambios | sin cambios |
| `tools/hotels.py` | sin cambios | sin cambios |
| `tools/quote_builder.py` | sin cambios | sin cambios |
| `tools/email_sender.py` | sin cambios | sin cambios |
| `agent.py` | orquesta el LLM | no se usa — Claude Desktop orquesta |
| `main.py` | FastAPI server | no se usa — reemplazado por `mcp_server.py` |
| Auth / Supabase | necesaria | no necesaria (corre local) |

El 80% del código ya está escrito. El MCP es un wrapper nuevo sobre las tools existentes.

---

## Notas

- El `mcp_server.py` convive con el proyecto sin romper nada. La app web sigue funcionando igual.
- Si algo falla en el MCP, revisá los logs de Claude Desktop en: `~/Library/Logs/Claude/`
- Las keys del `.env` del backend se pueden reutilizar — copialas al `claude_desktop_config.json`.
