# CLAUDE.md — Guía para asistentes IA

## Qué es este proyecto

`asistentes-landing` es la web pública de la plataforma. Vende los servicios, captura waitlist y ranquea en SEO. Sin auth, sin estado de usuario.

## Stack

- Next.js 14.2 (App Router) + TypeScript estricto
- TailwindCSS 3.4
- `@supabase/supabase-js` SOLO para insertar al waitlist (anon key, RLS aplica)
- `lucide-react` para iconos

## Estructura

```
app/
  layout.tsx              # layout raíz con metadatos por defecto
  page.tsx                # home
  servicios/
    facturacion/page.tsx  # detalle del servicio activo
  sobre-nosotros/page.tsx
  precios/page.tsx
  contacto/page.tsx       # form waitlist
  sitemap.ts              # autogenera sitemap.xml
  robots.ts               # autogenera robots.txt
components/
  sections/               # Hero, Problema, Servicios, ComoFunciona, Pricing, FAQ, CTA, Footer
  ui/                     # botones, badges
lib/
  supabase.ts             # cliente anon
  metadata.ts             # helpers de metadatos
public/
  og.png                  # imagen OG por defecto
```

## Convenciones

- **Mobile-first** siempre.
- **Server Components por default**. Sólo el form de waitlist es Client.
- **Sin animaciones JS pesadas** que rompan el budget de performance. Si se usan, sólo CSS o `framer-motion` lazy.
- **Imágenes**: `next/image` siempre, con `width`/`height` o `fill`.
- **Strings al usuario**: español argentino.
- **Naming**: PascalCase para componentes, camelCase para utilities.
- **Commits**: español, formato `feat: ...`, `fix: ...`.

## Cosas que NO debe hacer un asistente IA en este repo

- No agregar dependencias pesadas que rompan Lighthouse > 90.
- No usar `service_role` ni manejar datos privados acá.
- No copiar código del dashboard que no aplica.
- No agregar tracking de terceros sin avisar (impacto en consentimiento + performance).
- No commitear `.env.local`.

## Reglas de copy y tono de voz

- **Tuteo argentino**: "vos", "tenés", "querés", "cargá", "subí".
- **Frases cortas**, claridad sobre cleverness.
- **Específico, no genérico**: en vez de "ahorrá tiempo" → "no anotes facturas a mano nunca más".
- **Sin hype**: nada de "revoluciona", "transforma", "potencia con IA".
- **CTAs con verbos directos**: "Probar gratis", "Ver servicios", "Sumate a la lista".

## Política de SEO

- Cada página define su propio `metadata` (title, description, OG).
- `og:image` 1200x630 en `public/og/<ruta>.png` o autogenerada.
- `description` entre 120-160 caracteres.
- `title` entre 30-60 caracteres.
- Locale: `es_AR`.
- `viewport`: device-width.
- Schema.org `Organization` y `Product` en home y servicios respectivamente.
- Sin `noindex` salvo en páginas internas o errores.

## Cómo agregar un servicio nuevo a la home

1. Sumar el servicio al array `SERVICIOS` en `components/sections/Servicios.tsx`.
2. Si está activo, crear página en `app/servicios/<slug>/page.tsx` con metadatos propios.
3. Si está "Próximamente", marcarlo con la prop `comingSoon: true` y NO crear página.
4. Actualizar `app/sitemap.ts` para incluir la nueva ruta cuando salga.
5. Si tiene FAQ propia, sumarla al array de FAQ de la home o página dedicada.

## Cómo iterar sobre este código

1. Cambios visuales: probar en mobile (375px) y desktop (1280px) antes de commitear.
2. Cambios de copy: revisar tono según las reglas de arriba.
3. Cambios de structure: actualizar `sitemap.ts`.
4. Antes de mergear: `npm run build && npm run type-check`.

## Contexto de negocio

- Audiencia: emprendedores hispanohablantes (Argentina).
- Servicios al lanzar: solo "Digitalizador de Facturación" activo, otros como "Próximamente".
- Objetivo principal de la home: capturar waitlist + redirigir a /dashboard a los ya registrados (cuando esté la auth).
