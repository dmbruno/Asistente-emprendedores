# PropioIA — Marketplace de Agentes IA

> Plataforma de agentes de IA para emprendedores hispanohablantes.
> Cada agente se vende como producto independiente desde la landing.

## Estructura del repo

```
asistentes-emprendedores/
├── landing/                        ← Next.js — marketplace público
│
├── productos/
│   ├── contable/                   ← Agente Contable (digitalizador de facturas + AFIP)
│   │   ├── backend/                ← Flask + Python
│   │   ├── dashboard/              ← Next.js (panel del usuario)
│   │   └── admin/                  ← Next.js (panel de Diego)
│   │
│   └── atencion/                   ← Asistente de Atención al Cliente
│       └── bot/                    ← Node + TypeScript (WhatsApp + Evolution API)
│
├── docs/                           ← Documentación general del proyecto
└── README.md
```

## Deploys

| Producto | Plataforma | Root directory |
|---|---|---|
| Landing | Vercel | `landing` |
| Contable · Dashboard | Vercel | `productos/contable/dashboard` |
| Contable · Admin | Vercel | `productos/contable/admin` |
| Contable · Backend | Render | `productos/contable/backend` |
| Atención · Bot | Railway | `productos/atencion/bot` (1 deploy por cliente) |

## Cómo agregar un agente nuevo

1. Crear carpeta `productos/<slug>/` con su backend/dashboard/admin (lo que necesite).
2. Agregar el agente al array `AGENTES` en `landing/components/sections/Servicios.tsx`.
3. Crear su página de detalle en `landing/app/servicios/<slug>/page.tsx`.
4. Sumar la ruta a `landing/app/sitemap.ts`.
5. Configurar el deploy correspondiente en Vercel/Render/Railway.
