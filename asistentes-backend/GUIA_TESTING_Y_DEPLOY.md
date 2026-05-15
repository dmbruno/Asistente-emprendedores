# Guía de Testing End-to-End y Deploy a Producción

> Leer completo antes de arrancar. El orden importa.

---

## 0. Antes de todo: migración pendiente de RI

Las columnas de IVA para Responsables Inscriptos no tienen migración formal todavía.
Crearla y aplicarla es el **primer paso obligatorio**.

### Crear el archivo de migración

Creá el archivo `asistentes-backend/migrations/0003_ri_columnas_iva.sql` con este contenido:

```sql
-- 0003_ri_columnas_iva.sql
-- Columnas de IVA discriminado para Responsables Inscriptos en facturas de compra.

alter table public.facturas
  add column if not exists neto_gravado  numeric(12, 2),
  add column if not exists iva_21        numeric(12, 2),
  add column if not exists iva_10_5      numeric(12, 2),
  add column if not exists iva_27        numeric(12, 2);
```

### Aplicar en Supabase

```bash
cd asistentes-backend
supabase link --project-ref <TU_REF>   # solo la primera vez
supabase db push
```

O pegá el SQL directamente en **Supabase → SQL Editor → New query → Run**.

---

## 1. Levantar el proyecto en local

### 1.1 Variables de entorno

```bash
# Backend
cp asistentes-backend/.env.example asistentes-backend/.env
# Completar: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
#            SUPABASE_JWT_SECRET, MASTER_KEY, BAILEYS_SHARED_SECRET
# Dejar: AFIP_MOCK=true, AFIP_HOMO=true (para tests sin AFIP real)

# Dashboard
cp asistentes-dashboard/.env.example asistentes-dashboard/.env.local
# Completar: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
# NEXT_PUBLIC_API_URL=http://localhost:5001

# Landing
cp asistentes-landing/.env.example asistentes-landing/.env.local
# Completar: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 1.2 Levantar servicios

```bash
# Terminal 1 — Backend Flask + Baileys
cd asistentes-backend
docker compose up --build

# Terminal 2 — Dashboard
cd asistentes-dashboard
npm install && npm run dev
# Corre en http://localhost:3000

# Terminal 3 — Landing
cd asistentes-landing
npm install && npm run dev
# Corre en http://localhost:3001 (o el puerto que indique)
```

### 1.3 Verificar que todo levantó

```bash
curl http://localhost:5001/health        # debe devolver {"ok": true}
curl http://localhost:3001/health        # Baileys alive
```

---

## 2. Crear tu usuario de prueba en Supabase

1. Ir a **Supabase → Authentication → Users → Invite user**
2. Ingresar tu email
3. Abrís el magic link que llega al mail
4. El dashboard te redirige a `/dashboard`

### Insertar la fila en `clientes` (Supabase → SQL Editor)

```sql
insert into public.clientes (id, cuit, razon_social, whatsapp, email, condicion_fiscal, categoria_monotributo, plan)
values (
  auth.uid(),  -- reemplazar con el UUID que ves en Authentication → Users
  '20-12345678-9',
  'Tu Nombre o Razón Social',
  '5493875051112',   -- formato internacional sin +, tu número de WPP
  'tu@email.com',
  'monotributo',
  'D',
  'trial'
);
```

> **Tip:** el UUID del usuario lo ves en Supabase → Authentication → Users → columna `id`.

---

## 3. Flujo Monotributista — Testing completo

### 3.1 Configurar API key de IA en el dashboard

1. Ir a `http://localhost:3000/dashboard/api-keys`
2. Agregar tu Anthropic API key (o OpenAI / Google)
3. Confirmar que aparece guardada con los últimos 4 dígitos visibles

### 3.2 Conectar WhatsApp

1. Ir a `http://localhost:3000/dashboard/whatsapp`
2. Escanear el QR con tu WhatsApp
3. Esperar que el estado cambie a "Conectado"

### 3.3 Registrar una factura de compra

Desde WhatsApp, mandar:
1. Foto de cualquier factura A, B o C que tengas a mano
2. Escribir `compra`
3. El bot responde con los datos extraídos
4. Responder `sí` para confirmar

**Verificar en el dashboard:**
- `http://localhost:3000/dashboard/facturas` → la factura debe aparecer con estado "Confirmada"

### 3.4 Emitir una Factura C (venta)

Desde WhatsApp escribir:
```
emitir factura
```

El bot va a pedir:
1. **Nombre del cliente** (o "sin datos" para consumidor final)
2. **Monto total**

Responder ambas. El bot confirma con número de comprobante y CAE simulado (MOCK=true).

> Revisar en `http://localhost:3000/dashboard/facturas` que la venta quedó registrada.

### 3.5 Comando resumen

Desde WhatsApp escribir:
```
resumen
```

Debe responder con:
- Total facturado (ventas)
- Total de compras
- Acumulado del año
- Porcentaje del tope de categoría consumido

### 3.6 Verificar el panel de métricas

Ir a `http://localhost:3000/dashboard` y confirmar:
- Totales del mes
- Alerta de tope de categoría (si superaste el 80%)

---

## 4. Cambiar a Plan Solo para probar restricciones

### En Supabase → SQL Editor:

```sql
-- Subir a plan Solo (sin pasar por Mercado Pago)
update public.clientes
set plan = 'solo'
where email = 'tu@email.com';

-- Para volver a trial cuando termines de probar:
update public.clientes
set plan = 'trial'
where email = 'tu@email.com';
```

### Qué cambia con Plan Solo:

| Restricción | Trial | Solo |
|-------------|-------|------|
| Facturas/mes | 5 | 80 |
| Export Excel | ✗ | ✓ |
| Alertas de tope | ✗ | ✓ |
| PDF por WhatsApp | ✗ | ✓ |

### Verificar límite de Trial

Con plan `trial`, intentar registrar una 6ª factura → el bot debe responder que alcanzaste el límite y sugerir el upgrade.

---

## 5. Flujo Responsable Inscripto — Testing completo

### 5.1 Cambiar condición fiscal en Supabase

```sql
update public.clientes
set
  condicion_fiscal = 'responsable_inscripto',
  categoria_monotributo = null
where email = 'tu@email.com';
```

### 5.2 Registrar una factura de compra con IVA discriminado

Desde WhatsApp, mandar:
1. Foto de una factura A (con IVA discriminado)
2. Escribir `compra`
3. El bot extrae: neto gravado + IVA 21% (o 10,5% / 27%)
4. Responder `sí` para confirmar

**Verificar en Supabase → Table Editor → facturas:**
- Las columnas `neto_gravado`, `iva_21` (o `iva_10_5` / `iva_27`) deben tener valores

### 5.3 Emitir Factura A o B (wizard de 5 pasos)

Desde WhatsApp escribir:
```
emitir factura
```

El bot inicia el wizard. Responder cada paso:

| Paso | Bot pregunta | Respuesta de ejemplo |
|------|-------------|---------------------|
| 1 | CUIT del receptor | `30-71002829-4` o `sin CUIT` |
| 2 | Tipo: A o B | `B` |
| 3 | Concepto / descripción | `Servicios de diseño web` |
| 4 | Neto gravado | `10000` |
| 5 | Alícuota IVA | `21` |

Luego el bot muestra el resumen y pregunta `¿Confirmás?`. Responder `sí`.

**Resultado esperado:**
- Mensaje de confirmación con CAE simulado
- PDF de Factura B enviado por WhatsApp

### 5.4 Cancelar el wizard en cualquier paso

Escribir `no` en cualquier momento → el bot cancela y vuelve al estado libre.

### 5.5 Comando resumen para RI

Desde WhatsApp escribir:
```
resumen
```

Debe responder con:
- Total ventas del mes
- Total compras del mes
- **Débito fiscal** (IVA de tus ventas)
- **Crédito fiscal** (IVA de tus compras)
- **Posición IVA** (débito - crédito = saldo a favor / a pagar)

### 5.6 Verificar panel de RI en el dashboard

Ir a `http://localhost:3000/dashboard`:
- Debe mostrar widget de **Posición IVA del mes** (débito / crédito / saldo)

Ir a `http://localhost:3000/dashboard/resumen`:
- Tabla mensual con columnas Déb. IVA / Cré. IVA / Pos. IVA
- Widget de posición IVA acumulada del año

---

## 6. Exportación a Excel

Con algunas facturas cargadas, ir al dashboard:
1. `http://localhost:3000/dashboard/facturas`
2. Hacer click en "Exportar Excel" (requiere plan Solo o Negocio)
3. Verificar que el archivo descargado tiene las filas correctas

Para RI: el Excel debe incluir columnas `neto_gravado`, `iva_21`, `iva_10_5`, `iva_27`.

---

## 7. Poner el proyecto en línea

### 7.1 Servidor recomendado

Cualquier VPS con Docker. Opciones económicas para Argentina:
- **DigitalOcean Droplet** — $6/mes (1 vCPU, 1 GB RAM) — suficiente para MVP
- **Hetzner CX11** — ~4 EUR/mes — más barato
- **Railway** — opción sin servidor dedicado, más fácil de configurar

### 7.2 Dominio y DNS

1. Comprar dominio (ej. `asistentes-ia.com.ar`) en NIC.ar o Namecheap
2. Crear registros DNS apuntando al servidor:
   ```
   A   api.asistentes-ia.com.ar    →  <IP del servidor>
   A   app.asistentes-ia.com.ar    →  <IP del servidor>   (dashboard)
   A   asistentes-ia.com.ar        →  Vercel/Netlify       (landing)
   ```

### 7.3 Deploy del backend (Flask + Baileys)

```bash
# En el servidor
git clone <tu-repo> /opt/asistentes
cd /opt/asistentes/asistentes-backend

# Copiar .env de producción
cp .env.example .env
nano .env  # completar con valores reales (ver checklist más abajo)

# Levantar con perfil de producción (incluye nginx)
docker compose --profile prod up -d --build
```

### 7.4 SSL con Certbot

```bash
# Dentro del contenedor nginx o en el servidor directamente:
docker run --rm \
  -v ./nginx/certbot/conf:/etc/letsencrypt \
  -v ./nginx/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d api.asistentes-ia.com.ar \
  --email tu@email.com --agree-tos --non-interactive
```

### 7.5 Deploy del dashboard (Next.js)

**Opción recomendada: Vercel**

```bash
cd asistentes-dashboard
npx vercel --prod
```

Variables de entorno en Vercel:
```
NEXT_PUBLIC_SUPABASE_URL        = <tu URL de Supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY   = <tu anon key>
NEXT_PUBLIC_API_URL             = https://api.asistentes-ia.com.ar
```

### 7.6 Deploy de la landing (Next.js)

**También en Vercel** (proyecto separado):

```bash
cd asistentes-landing
npx vercel --prod
```

Variables:
```
NEXT_PUBLIC_SUPABASE_URL      = <tu URL de Supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY = <tu anon key>
NEXT_PUBLIC_SITE_URL          = https://asistentes-ia.com.ar
```

### 7.7 Checklist de variables de entorno de producción (.env backend)

```bash
FLASK_ENV=production
SECRET_KEY=<string aleatorio largo>           # openssl rand -hex 32

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
SUPABASE_JWT_SECRET=<JWT secret de Supabase>

MASTER_KEY=<Fernet key>                       # python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

BAILEYS_SHARED_SECRET=<string aleatorio>      # openssl rand -hex 32
BAILEYS_INTERNAL_URL=http://baileys:3001      # nombre del servicio Docker

AFIP_MOCK=false                               # ← importante en producción
AFIP_HOMO=true                                # true hasta tener cert real de AFIP

MP_ACCESS_TOKEN=<ver sección 8>
MP_PUBLIC_KEY=<ver sección 8>
MP_WEBHOOK_URL=https://api.asistentes-ia.com.ar
MP_WEBHOOK_SECRET=<string aleatorio>
MP_BACK_URL=https://app.asistentes-ia.com.ar/dashboard
```

---

## 8. Mercado Pago — Suscripciones reales

### 8.1 Crear cuenta de Mercado Pago

1. Ir a mercadopago.com.ar
2. Crear cuenta como **empresa** (no persona física) para recibir pagos de clientes
3. Completar la verificación de identidad

### 8.2 Obtener credenciales de producción

1. Ir a [mercadopago.com.ar/developers/panel](https://www.mercadopago.com.ar/developers/panel)
2. Hacer click en tu aplicación (o crear una nueva: "Asistentes IA")
3. Ir a **Credenciales de producción**
4. Copiar:
   - `Access Token` → va en `MP_ACCESS_TOKEN`
   - `Public Key` → va en `MP_PUBLIC_KEY`

> **Mientras testés:** usá las **Credenciales de prueba** (sandbox). Tienen el prefijo `TEST-`. Con esas podés simular pagos sin dinero real.

### 8.3 Configurar el webhook de suscripciones

1. En el panel de MP → **Webhooks** → **Agregar webhook**
2. URL: `https://api.asistentes-ia.com.ar/api/v1/suscripcion/webhook`
3. Eventos a suscribir: `subscription_preapproval`
4. Copiar el **Secret** que genera MP → va en `MP_WEBHOOK_SECRET`

### 8.4 Cómo funciona el flujo de pago

```
Usuario clickea "Empezar ahora" en el dashboard
        ↓
Dashboard llama a POST /api/v1/suscripcion/checkout  (con JWT)
        ↓
Backend crea un Preapproval en MP y devuelve checkout_url
        ↓
Usuario es redirigido a Mercado Pago y paga
        ↓
MP llama al webhook con status "authorized"
        ↓
Backend actualiza clientes.plan = 'solo' (o 'negocio')
        ↓
Usuario vuelve al dashboard con el plan activo
```

### 8.5 Probar el flujo de pago en sandbox

```sql
-- 1. Asegurarse de que el cliente tiene plan 'trial'
update public.clientes set plan = 'trial' where email = 'tu@email.com';
```

```bash
# 2. Usar credenciales TEST- en .env
MP_ACCESS_TOKEN=TEST-xxxxxxxxxxxxxxxxxxxx
```

1. Ir a `http://localhost:3000/dashboard/suscripcion`
2. Clickear "Empezar ahora" en el plan Solo
3. MP redirige a una página de checkout de prueba
4. Usar tarjeta de prueba de MP:
   ```
   Número: 5031 7557 3453 0604
   Vencimiento: 11/25
   CVV: 123
   Nombre: APRO
   ```
5. El webhook actualiza el plan automáticamente

### 8.6 Verificar que el pago llegó

- En Supabase: `select plan, mp_preapproval_id from clientes where email = 'tu@email.com'`
- En el panel de MP → **Suscripciones** → debe aparecer como "Activa"

### 8.7 Precios configurados (modificar en `suscripcion/routes.py` si cambian)

| Plan | Monto actual | Frecuencia |
|------|-------------|-----------|
| Solo | $49.999 ARS | Mensual |
| Negocio | $69.999 ARS | Mensual |

Para cambiar precios: editar el dict `PLANES` en `asistentes-backend/app/blueprints/suscripcion/routes.py`.

---

## 9. Checklist final antes de abrir al público

### Backend
- [ ] Migración 0003 aplicada en Supabase de producción
- [ ] `AFIP_MOCK=false` en producción
- [ ] `FLASK_ENV=production`
- [ ] `SECRET_KEY` cambiado (no el de desarrollo)
- [ ] `MASTER_KEY` de Fernet generado y guardado de forma segura
- [ ] SSL activo en el dominio del backend
- [ ] Webhook de MP configurado y testeado

### Dashboard
- [ ] Deploy en Vercel con variables de producción
- [ ] Login con magic link funciona desde el dominio de producción
- [ ] `NEXT_PUBLIC_API_URL` apunta al backend de producción (HTTPS)

### Landing
- [ ] Deploy en Vercel
- [ ] Link en bio de Instagram apunta al WhatsApp correcto
- [ ] Formulario de waitlist guarda en Supabase

### Mercado Pago
- [ ] Credenciales de **producción** (no TEST-) en el .env del servidor
- [ ] Webhook registrado y verificado en el panel de MP
- [ ] Probado con una compra real de $1 (podés crear un plan de prueba temporal)

### WhatsApp
- [ ] Número de producción escaneado y conectado en el servidor
- [ ] Sesión de Baileys persistida en Supabase Storage
- [ ] Probada la reconexión automática (reiniciar el contenedor y verificar que reconecta)

---

## 10. Dar acceso a un primer cliente

```sql
-- 1. El cliente se registra solo con magic link desde la landing/dashboard
-- 2. Buscar su UUID en Supabase → Authentication → Users

-- 3. Insertar su fila en clientes
insert into public.clientes (id, cuit, razon_social, whatsapp, email, condicion_fiscal, categoria_monotributo, plan)
values (
  '<UUID del usuario>',
  '<CUIT del cliente>',
  '<Razón social>',
  '<número WPP en formato 549xxxxxxxxx>',
  '<email>',
  'monotributo',   -- o 'responsable_inscripto'
  'D',             -- solo para monotributistas
  'trial'
);

-- 4. Subir el plan manualmente hasta que MP esté integrado
update public.clientes set plan = 'solo' where id = '<UUID>';
```

---

> Una vez que tengas el primer cliente real y el pago funcionando, el ciclo es automático. Mercado Pago activa y desactiva planes sin intervención manual.
