# asistentes-landing

Landing pública de la plataforma. Next.js 14 + TypeScript + TailwindCSS.

> Lee [`CLAUDE.md`](./CLAUDE.md) antes de tocar código.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre [http://localhost:3001](http://localhost:3001).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en :3001 |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build |
| `npm run lint` | ESLint |
| `npm run type-check` | `tsc --noEmit` |

## Páginas

- `/` — home (hero, problema, servicios, cómo funciona, pricing, FAQ, CTA waitlist)
- `/servicios/facturacion` — detalle del servicio activo
- `/sobre-nosotros`
- `/precios`
- `/contacto` — formulario que crea entrada en `waitlist`

## SEO

- Metadatos por página vía `Metadata` API.
- `app/sitemap.ts` y `app/robots.ts` autogenerados.
- Schema.org structured data en home y servicios.
- Lighthouse target: > 90 mobile en performance, accesibilidad y SEO.

## Deploy

Vercel. Conectar repo, definir env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`).
