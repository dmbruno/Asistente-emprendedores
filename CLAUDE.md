# CLAUDE.md — Contexto general del monorepo

## Qué es esto

Monorepo de PropioIA: marketplace de agentes IA para emprendedores hispanohablantes (Argentina principalmente).

Hoy hay 2 agentes activos:
1. **Agente Contable** — digitaliza facturas desde WhatsApp + valida en AFIP + dashboard.
2. **Asistente de Atención** — bot conversacional con IA, personalizable por cliente.

## Estructura (mental model)

```
landing/                        ← marketplace público — vende todo
productos/<slug>/               ← cada producto tiene su carpeta
    backend/                    ← backend específico (si aplica)
    dashboard/                  ← UI del usuario (si aplica)
    admin/                      ← UI interna (si aplica)
    bot/                        ← bot (si aplica)
docs/                           ← documentación
```

**Regla de oro**: el código compartido entre productos es CERO por ahora. Cada producto es independiente. La landing solo los "vende"; no comparte runtime con ellos.

## Cómo cada Claude debería leer este repo

Si trabajás en algo específico, leé el CLAUDE.md del subproyecto correspondiente:

- `landing/CLAUDE.md` — convenciones de la landing (Server Components, tono, SEO)
- `productos/contable/backend/CLAUDE.md` — backend Flask
- `productos/atencion/bot/CLAUDE.md` — bot WhatsApp

## Decisiones tomadas (con razones)

- **Monorepo simple con carpetas, no Turborepo/workspaces** — para 1 dev sin sharing de código real, agregar tooling de monorepo formal es overkill.
- **Cada producto se deploya por separado** — Vercel/Render/Railway apuntan al root directory correspondiente. Permite escalar y rollbackear independiente.
- **BYOK transversal** — todos los agentes corren con la API key del cliente final, no la de PropioIA. Costos transparentes, sin margen oculto.
- **Onboarding del Asistente de Atención: form → mail → setup manual** — para volumen bajo de clientes es lo más práctico. Cuando haya 15-20 clientes pagando, automatizar.

## Preferencias del usuario (Diego)

- Stack principal: **Python/Flask** (pero hay proyectos en Node por requerimiento).
- Desarrollador fullstack: React, MySQL, SQLite, Postgres.
- **Respuestas concretas, sin humo.** Nada de "es importante notar que...".
- Le sirven **analogías de la vida real** para explicar conceptos.
- **Antes de implementar cambios grandes, preguntar** si hay ambigüedad.
- Español rioplatense informal (vos, podés, querés, etc.).

## Cosas que NO hay que hacer

- ❌ Compartir código entre productos a la fuerza (mejor duplicar que crear acoplamientos).
- ❌ Tocar la landing para meter lógica de un producto específico — cada producto tiene su propia carpeta para eso.
- ❌ Commitear `.env*`, `*.key`, `*.csr`, `*.pem` (ya están en `.gitignore`).
- ❌ Generar archivos `.md` de documentación sin pedido explícito.

## Comandos rápidos

```bash
# Landing
cd landing && npm run dev          # localhost:3001

# Bot
cd productos/atencion/bot && npm run dev

# Backend Contable
cd productos/contable/backend && source venv/bin/activate && flask run

# Dashboard Contable
cd productos/contable/dashboard && npm run dev    # localhost:3000
```
