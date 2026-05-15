# Deploy — Guía paso a paso (costo $0)

## Arquitectura de deploy

| Componente | Plataforma | Costo |
|---|---|---|
| Landing (`asistentes-landing`) | Vercel | Gratis |
| Dashboard clientes (`asistentes-dashboard`) | Vercel | Gratis |
| Admin (`asistentes-admin`) | Vercel | Gratis |
| Backend Flask + Baileys | Render | Gratis |
| Base de datos, auth, storage | Supabase | Ya configurado |

---

## Prerequisitos

- Cuenta en [vercel.com](https://vercel.com) (gratis, con GitHub)
- Cuenta en [render.com](https://render.com) (gratis, con GitHub)
- Repositorio en GitHub con el código del proyecto
- Las variables de entorno listas (ver secciones de cada app)

---

## 1. Subir el código a GitHub

Si todavía no tenés el repo en GitHub:

```bash
cd /ruta/al/proyecto
git init
git add .
git commit -m "feat: proyecto inicial"
gh repo create asistentes-emprendedores --private --push --source=.
```

---

## 2. Deploy del Backend (Flask + Baileys) en Render

El backend usa Docker con dos servicios: Flask (puerto 5001) y Baileys (puerto 3001).

### 2.1 — Crear el servicio Flask

1. Entrá a [render.com](https://render.com) → **New** → **Web Service**
2. Conectá el repositorio de GitHub
3. Configurá:
   - **Name**: `asistentes-flask`
   - **Root Directory**: `asistentes-backend`
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Plan**: `Free`

4. En **Environment Variables** agregá todas las del `.env.example`:

```
FLASK_ENV=production
SECRET_KEY=<generá uno con: openssl rand -hex 32>
SUPABASE_URL=https://aisvbrnqwgoqobksveco.supabase.co
SUPABASE_ANON_KEY=<tu anon key de Supabase>
SUPABASE_SERVICE_ROLE_KEY=<tu service role key de Supabase>
SUPABASE_JWT_SECRET=<tu JWT secret de Supabase>
SUPABASE_BUCKET_FACTURAS=facturas-imagenes
MASTER_KEY=<tu Fernet key actual>
BAILEYS_SHARED_SECRET=<generá uno con: openssl rand -hex 32>
BAILEYS_INTERNAL_URL=https://asistentes-baileys.onrender.com
AFIP_PRODUCTION=true
LOG_LEVEL=INFO
```

5. Hacé clic en **Create Web Service**. Render va a construir y levantar el contenedor.

6. Copiá la URL que te da Render (ej: `https://asistentes-flask.onrender.com`). La vas a necesitar en los pasos siguientes.

### 2.2 — Crear el servicio Baileys

1. **New** → **Web Service**
2. Mismo repositorio
3. Configurá:
   - **Name**: `asistentes-baileys`
   - **Root Directory**: `asistentes-backend/baileys_service`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js`
   - **Plan**: `Free`

4. En **Environment Variables**:

```
SUPABASE_URL=https://aisvbrnqwgoqobksveco.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<tu service role key>
FLASK_INTERNAL_URL=https://asistentes-flask.onrender.com
BAILEYS_SHARED_SECRET=<el mismo que pusiste en Flask>
PORT=3001
```

5. Hacé clic en **Create Web Service**.

> **Nota sobre el plan gratis de Render:** Los servicios gratis se duermen después de 15 minutos sin tráfico y tardan ~30 segundos en despertar. Para el MVP está bien. Cuando tengas clientes activos, el plan Starter ($7/mes por servicio) los mantiene siempre encendidos.

---

## 3. Deploy de la Landing en Vercel

1. Entrá a [vercel.com](https://vercel.com) → **Add New Project**
2. Importá el repositorio de GitHub
3. Configurá:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `asistentes-landing`
4. En **Environment Variables**:

```
NEXT_PUBLIC_SUPABASE_URL=https://aisvbrnqwgoqobksveco.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu anon key>
NEXT_PUBLIC_SITE_URL=https://tu-landing.vercel.app
```

5. Hacé clic en **Deploy**.

---

## 4. Deploy del Dashboard de clientes en Vercel

1. **Add New Project** → mismo repositorio
2. Configurá:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `asistentes-dashboard`
3. En **Environment Variables**:

```
NEXT_PUBLIC_SUPABASE_URL=https://aisvbrnqwgoqobksveco.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu anon key>
NEXT_PUBLIC_API_URL=https://asistentes-flask.onrender.com
```

4. Hacé clic en **Deploy**.

---

## 5. Deploy del Admin en Vercel

1. **Add New Project** → mismo repositorio
2. Configurá:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `asistentes-admin`
3. En **Environment Variables**:

```
NEXT_PUBLIC_SUPABASE_URL=https://aisvbrnqwgoqobksveco.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu anon key>
SUPABASE_URL=https://aisvbrnqwgoqobksveco.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<tu service role key>
ADMIN_SECRET=<generá uno con: openssl rand -hex 32>
```

4. Hacé clic en **Deploy**.

---

## 6. Configurar dominio personalizado (opcional, gratis con tu dominio)

Si tenés un dominio propio:

- **Vercel**: Project → Settings → Domains → agregá tu dominio
- Vercel da SSL automático con Let's Encrypt

Si no tenés dominio, las URLs de `vercel.app` y `onrender.com` funcionan directo.

---

## 7. Actualizar la URL del backend en Supabase

Una vez que el backend está en Render, actualizá la URL que Baileys usa para los webhooks de WhatsApp. En el panel de Supabase, verificá que la columna `webhook_url` de la tabla de instancias apunte a `https://asistentes-flask.onrender.com`.

---

## 8. Verificación post-deploy

- [ ] Landing carga en la URL de Vercel
- [ ] Dashboard permite login con Supabase
- [ ] Backend responde: `curl https://asistentes-flask.onrender.com/api/v1/health`
- [ ] Baileys levanta y aparece el QR de WhatsApp en los logs de Render
- [ ] Se puede emitir una factura de prueba desde WhatsApp

---

## Variables de entorno — referencia rápida

| Variable | Dónde encontrarla |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `SUPABASE_JWT_SECRET` | Supabase → Project Settings → API → JWT Secret |
| `MASTER_KEY` | Ya está generada — copiarla del `.env` local |
| `SECRET_KEY` | `openssl rand -hex 32` |
| `BAILEYS_SHARED_SECRET` | `openssl rand -hex 32` (mismo valor en Flask y Baileys) |
| `ADMIN_SECRET` | `openssl rand -hex 32` |
