# CLAUDE.md — Guía para asistentes IA

> Este archivo orienta a Claude Code, Cursor y similares cuando trabajen con este repo.

## Qué es este proyecto

`asistentes-dashboard` es el panel privado del cliente. Acá ve sus facturas digitalizadas, métricas, y configura su API key BYOK y la conexión de WhatsApp.

## Stack

- Next.js 14.2 (App Router) + TypeScript estricto
- TailwindCSS 3.4 + shadcn/ui (instalar componentes a demanda)
- Supabase Auth (magic link)
- `@supabase/auth-helpers-nextjs`
- `react-hook-form` + `zod` para formularios
- `recharts` para gráficos
- `lucide-react` para iconos
- Playwright para tests E2E

## Estructura

```
app/
  layout.tsx              # layout raíz
  page.tsx                # redirige a /dashboard o /login
  login/
    page.tsx              # formulario de magic link
  dashboard/
    layout.tsx            # layout autenticado con sidebar
    page.tsx              # home con métricas
    facturas/
      page.tsx            # tabla
      [id]/page.tsx       # detalle
      upload/page.tsx
    resumen/page.tsx
    whatsapp/page.tsx
    configuracion/page.tsx
    api-keys/page.tsx
components/
  ui/                     # primitivos shadcn (button, input, table, dialog…)
  facturas/               # componentes específicos del dominio
  charts/
  layout/                 # navbar, sidebar
lib/
  supabase/
    client.ts             # cliente browser
    server.ts             # cliente server (cookies)
    middleware.ts         # cliente middleware
  api.ts                  # wrapper para llamar al backend Flask con el JWT
  format.ts               # formateo de moneda, fechas argentinas
middleware.ts             # protege /dashboard/*
```

## Convenciones

- **Server Components por default**, Client Components sólo cuando hace falta (`"use client"`).
- **Naming**: PascalCase para componentes (`FacturaCard.tsx`), camelCase para utilities (`formatCurrency.ts`).
- **Estilos**: Tailwind. Sin CSS modules, sin styled-components.
- **Formularios**: siempre `react-hook-form` + `zod`. Nunca `useState` para campos.
- **Errores**: usar `error.tsx` por ruta cuando aplique. No mostrar tracebacks.
- **Strings al usuario**: español argentino ("vos", "querés", "cargá", etc.).
- **Commits**: español, formato `feat: ...`, `fix: ...`, `refactor: ...`.

## Cosas que NO debe hacer un asistente IA en este repo

- No commitear `.env.local`.
- No instalar dependencias nuevas sin justificarlo.
- No reemplazar Tailwind por otra solución de estilos.
- No agregar lógica de negocio que debería estar en el backend Flask.
- No hacer queries a Supabase con `service_role` desde el cliente.
- No deshabilitar TypeScript con `// @ts-ignore` salvo casos justificados.

## Decisiones de arquitectura ya tomadas

- **App Router**, no Pages Router.
- **Server Components por default** para páginas de lectura.
- **Lectura de datos vía Supabase**: el dashboard lee directo de la DB (con RLS); las acciones complejas (upload de factura, validación de API key) van al backend Flask.
- **Auth con magic link**, sin contraseñas en MVP.
- **Diseño**: limpio, profesional, no infantil. Inspiración: Linear, Stripe.

## Cómo agregar una página protegida

1. Crear archivo en `app/dashboard/<seccion>/page.tsx`.
2. El `middleware.ts` ya protege todo lo que cuelgue de `/dashboard`, no hace falta tocar.
3. Si la página necesita datos:
   - Server Component: usar `createServerClient` de `lib/supabase/server.ts` y consultar Supabase directo.
   - Client Component: usar `createBrowserClient` de `lib/supabase/client.ts`.
4. Si necesita llamar al backend Flask: usar el wrapper de `lib/api.ts`.

## Cómo consumir la API del backend

```ts
import { apiFetch } from "@/lib/api";

const facturas = await apiFetch("/api/v1/facturas?mes=5&anio=2026");
```

El wrapper inyecta el JWT actual en `Authorization: Bearer <jwt>` automáticamente.

## Componentes shadcn instalados

Por ahora ninguno (instalación a demanda con `npx shadcn@latest add <name>`).

Cuando se agregue uno, registrarlo aquí:

- (vacío)

## Cómo iterar sobre este código

1. Leer este archivo y `README.md`.
2. Cambios de UI: ejecutar `npm run dev` y testear en navegador antes de proponer.
3. Cambios de estructura: actualizar la sección "Estructura" arriba.
4. Si tocás contratos con el backend (URLs, payloads, headers): avisar y actualizar el repo `asistentes-backend` también.
5. Correr `npm run type-check && npm run lint` antes de commitear.

## Contexto de negocio

- Usuario final: emprendedores hispanohablantes (Argentina).
- Cliente piloto: monotributista con < 100 facturas/mes.
- Canal principal de captura: WhatsApp. Este dashboard es secundario.
- Mobile usage es real (el cliente puede revisar desde el celular). Mobile-first.
