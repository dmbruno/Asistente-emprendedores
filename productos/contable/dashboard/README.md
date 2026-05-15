# asistentes-dashboard

Dashboard privado del cliente. Next.js 14 (App Router) + TypeScript + TailwindCSS + Supabase Auth.

> Lee [`CLAUDE.md`](./CLAUDE.md) antes de tocar código.

## Setup

```bash
npm install
cp .env.example .env.local
# Completar variables (cuando exista el proyecto Supabase)
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en :3000 |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build |
| `npm run lint` | ESLint |
| `npm run type-check` | `tsc --noEmit` |
| `npm run test:e2e` | Playwright |

## Páginas

```
/login                       — magic link via Supabase Auth
/dashboard                   — home con métricas del mes
/dashboard/facturas          — tabla con filtros y paginación
/dashboard/facturas/[id]     — detalle + edición
/dashboard/facturas/upload   — alternativa a WhatsApp
/dashboard/resumen           — gráficos mensuales
/dashboard/whatsapp          — estado de la conexión + QR
/dashboard/configuracion     — datos del cliente, plan
/dashboard/api-keys          — gestión BYOK
```

## Auth

Magic link por email (sin contraseñas en MVP). Middleware redirige a `/login` si no hay sesión.

## Cómo consume la API del backend

- Queries simples (lectura de datos del usuario): directo a Supabase con `@supabase/auth-helpers-nextjs`. RLS aplica.
- Acciones complejas (subir factura, validar API key, descargar Excel): POST/GET al backend Flask con el JWT de Supabase en `Authorization: Bearer <jwt>`.

## Deploy

Vercel. Conectar el repo y definir las env vars del proyecto.
