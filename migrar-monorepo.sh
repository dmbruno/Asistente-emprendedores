#!/usr/bin/env bash
#
# migrar-monorepo.sh
#
# Reorganiza el repo asistentes-emprendedores a la estructura marketplace:
#
#   asistentes-emprendedores/
#   ├── landing/                          (ex asistentes-landing)
#   ├── productos/
#   │   ├── contable/
#   │   │   ├── backend/                  (ex asistentes-backend)
#   │   │   ├── dashboard/                (ex asistentes-dashboard)
#   │   │   └── admin/                    (ex asistentes-admin)
#   │   └── atencion/
#   │       └── bot/                      (copiado desde ../BotWhatsApp)
#   ├── docs/                             (los .md sueltos van acá)
#   ├── README.md
#   ├── CLAUDE.md
#   └── .gitignore
#
# Cómo correrlo:
#   cd ~/Documents/Programacion/proyectosPropios/asistentes-emprendedores
#   chmod +x migrar-monorepo.sh
#   ./migrar-monorepo.sh
#
# Es interactivo: te va pidiendo confirmación en los pasos destructivos.
# Si algo falla en el medio, podés rollback con: git reset --hard HEAD
# (siempre y cuando antes hayas commiteado los cambios pendientes — el
# script te avisa si los hay).

set -euo pipefail

# Colores para mensajes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}ℹ${NC} $1"; }
ok()      { echo -e "${GREEN}✓${NC} $1"; }
warn()    { echo -e "${YELLOW}⚠${NC} $1"; }
err()     { echo -e "${RED}✗${NC} $1"; }
header()  { echo ""; echo -e "${BLUE}▶${NC} ${1}"; echo "─────────────────────────────────────────"; }

confirm() {
  read -p "$(echo -e ${YELLOW}?${NC}) $1 [y/N] " -n 1 -r
  echo
  [[ $REPLY =~ ^[Yy]$ ]]
}

# ════════════════════════════════════════════════════════════════════════
# CONFIG — ajustá esto si tus paths son distintos
# ════════════════════════════════════════════════════════════════════════

REPO_ROOT="$(pwd)"
BOT_SOURCE="${HOME}/Documents/Programacion/proyectosPropios/BotWhatsApp"

# ════════════════════════════════════════════════════════════════════════
# PRE-FLIGHT CHECKS
# ════════════════════════════════════════════════════════════════════════

header "Pre-flight checks"

# Estamos en el repo correcto?
if [[ ! -d ".git" ]] || [[ ! -d "asistentes-landing" ]]; then
  err "No parece que estemos en la raíz del repo asistentes-emprendedores."
  err "Esperaba encontrar .git/ y asistentes-landing/. Salgo."
  exit 1
fi
ok "Repo correcto: $(basename "$REPO_ROOT")"

# Branch
BRANCH=$(git branch --show-current)
info "Branch actual: $BRANCH"

# Working tree limpio?
if [[ -n "$(git status --porcelain)" ]]; then
  warn "Tenés cambios sin commitear:"
  git status --short
  echo ""
  warn "RECOMENDACIÓN: commiteá o stasheá antes de seguir, así si algo sale"
  warn "mal podés volver con: git reset --hard HEAD"
  echo ""
  if ! confirm "¿Seguir igual?"; then
    info "Salgo. Hacé commit y volvé a correr el script."
    exit 0
  fi
fi

# Bot existe?
if [[ ! -d "$BOT_SOURCE" ]]; then
  err "No encontré el bot en: $BOT_SOURCE"
  err "Editá BOT_SOURCE arriba en este script con el path correcto."
  exit 1
fi
ok "Bot encontrado en: $BOT_SOURCE"

# Última oportunidad de cancelar
echo ""
warn "Esto va a:"
warn "  1. Borrar copias espejo desactualizadas (asistentes-backend/asistentes-*)"
warn "  2. Renombrar las 4 carpetas asistentes-* a la nueva estructura"
warn "  3. Mover los .md sueltos a docs/"
warn "  4. Copiar el bot desde $BOT_SOURCE → productos/atencion/bot/"
warn "  5. Crear README.md y CLAUDE.md nuevos en la raíz"
echo ""
if ! confirm "¿Arrancamos?"; then
  info "Cancelado. No se tocó nada."
  exit 0
fi

# ════════════════════════════════════════════════════════════════════════
# PASO 1 — Limpieza de copias espejo
# ════════════════════════════════════════════════════════════════════════

header "Paso 1/6 — Limpiar copias espejo desactualizadas"

# Estas carpetas existen dentro de asistentes-backend/ como mirrors viejos.
# No están tracked en git (untracked), así que rm -rf es seguro.
for mirror in asistentes-landing asistentes-dashboard asistentes-admin asistentes-backend; do
  if [[ -d "asistentes-backend/$mirror" ]]; then
    info "Borrando asistentes-backend/$mirror/"
    rm -rf "asistentes-backend/$mirror"
  fi
done

# .md duplicados dentro de asistentes-backend/
for md in GUIA_ONBOARDING_USUARIO.md GUIA_TESTING_Y_DEPLOY.md INSTRUCTIVO_CERTIFICADO_AFIP.md; do
  if [[ -f "asistentes-backend/$md" ]]; then
    info "Borrando asistentes-backend/$md"
    rm -f "asistentes-backend/$md"
  fi
done

ok "Limpieza terminada"

# ════════════════════════════════════════════════════════════════════════
# PASO 2 — Crear estructura nueva
# ════════════════════════════════════════════════════════════════════════

header "Paso 2/6 — Crear estructura de carpetas"

mkdir -p productos/contable
mkdir -p productos/atencion
mkdir -p docs

ok "productos/contable/ creado"
ok "productos/atencion/ creado"
ok "docs/ creado"

# ════════════════════════════════════════════════════════════════════════
# PASO 3 — Mover carpetas con git mv (preserva historial)
# ════════════════════════════════════════════════════════════════════════

header "Paso 3/6 — Mover carpetas con git mv"

git mv asistentes-landing landing
ok "asistentes-landing → landing"

git mv asistentes-dashboard productos/contable/dashboard
ok "asistentes-dashboard → productos/contable/dashboard"

git mv asistentes-admin productos/contable/admin
ok "asistentes-admin → productos/contable/admin"

git mv asistentes-backend productos/contable/backend
ok "asistentes-backend → productos/contable/backend"

# ════════════════════════════════════════════════════════════════════════
# PASO 4 — Mover documentación y archivos sueltos
# ════════════════════════════════════════════════════════════════════════

header "Paso 4/6 — Mover documentación y archivos sueltos"

# .md sueltos en raíz → docs/
for md in GUIA_ONBOARDING_USUARIO.md GUIA_TESTING_Y_DEPLOY.md INSTRUCTIVO_CERTIFICADO_AFIP.md deploy.md; do
  if [[ -f "$md" ]]; then
    git mv "$md" "docs/$md"
    ok "$md → docs/$md"
  fi
done

# Script de cert AFIP → al backend
if [[ -f "cargar_afip_cert.py" ]]; then
  git mv cargar_afip_cert.py productos/contable/backend/cargar_afip_cert.py
  ok "cargar_afip_cert.py → productos/contable/backend/"
fi

# test_e2e.sh es del backend / contable
if [[ -f "test_e2e.sh" ]]; then
  git mv test_e2e.sh productos/contable/backend/test_e2e.sh
  ok "test_e2e.sh → productos/contable/backend/"
fi

# Cert files (.csr, .key) NO están en git pero existen en la raíz.
# Los muevo con mv normal (no git mv) — están gitignoreados.
for cert in *.csr *.key; do
  if [[ -f "$cert" ]]; then
    mkdir -p productos/contable/backend/certs
    mv "$cert" "productos/contable/backend/certs/$cert"
    ok "$cert → productos/contable/backend/certs/  (untracked, no afecta git)"
  fi
done

# HTMLs de prueba — opcional, los muevo a docs/samples/
if [[ -f "factura_a_prueba.html" ]]; then
  mkdir -p docs/samples
  git mv factura_a_prueba.html docs/samples/factura_a_prueba.html
  ok "factura_a_prueba.html → docs/samples/"
fi

if [[ -f "instagram-carousel.html" ]]; then
  mkdir -p docs/marketing
  git mv instagram-carousel.html docs/marketing/instagram-carousel.html
  ok "instagram-carousel.html → docs/marketing/"
fi

# venv/ (si está en raíz) — gitignoreado, lo movemos al backend
if [[ -d "venv" ]]; then
  mv venv productos/contable/backend/venv
  ok "venv/ → productos/contable/backend/  (untracked, no afecta git)"
fi

# ════════════════════════════════════════════════════════════════════════
# PASO 5 — Copiar el bot
# ════════════════════════════════════════════════════════════════════════

header "Paso 5/6 — Copiar el bot desde $BOT_SOURCE"

mkdir -p productos/atencion/bot

# rsync con exclusiones (sin node_modules, sin .git, sin dist)
rsync -a \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=dist \
  --exclude=.next \
  --exclude="*.log" \
  --exclude=".env" \
  --exclude=".env.local" \
  "$BOT_SOURCE/" "productos/atencion/bot/"

# Agregar al staging
git add productos/atencion/bot

ok "Bot copiado a productos/atencion/bot/  (sin node_modules, sin .git, sin .env)"
info "El repo original BotWhatsApp queda intacto como backup."

# ════════════════════════════════════════════════════════════════════════
# PASO 6 — Generar README.md y CLAUDE.md raíz nuevos
# ════════════════════════════════════════════════════════════════════════

header "Paso 6/7 — Crear README.md y CLAUDE.md de la raíz"

cat > README.md <<'EOF'
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

## Stack por subproyecto

- **landing** — Next.js 14 (App Router), Tailwind, Supabase (waitlist), Nodemailer (SMTP)
- **productos/contable/backend** — Python 3, Flask, AFIP WSAA/WSFE
- **productos/contable/dashboard** — Next.js 14, Tailwind, Supabase auth
- **productos/contable/admin** — Next.js 14, Tailwind
- **productos/atencion/bot** — Node 18+, TypeScript, OpenAI, Evolution API
EOF
ok "README.md creado"

cat > CLAUDE.md <<'EOF'
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
EOF
ok "CLAUDE.md creado"

git add README.md CLAUDE.md

# ════════════════════════════════════════════════════════════════════════
# PASO 7 — Verificación
# ════════════════════════════════════════════════════════════════════════

header "Paso 7/7 — Verificación de estructura"

echo ""
info "Estructura resultante:"
echo ""

tree -L 3 -I 'node_modules|.next|dist|venv|__pycache__' . 2>/dev/null || find . -maxdepth 3 -type d \
  ! -path '*/node_modules*' ! -path '*/\.next*' ! -path '*/dist*' \
  ! -path '*/venv*' ! -path '*/__pycache__*' ! -path '*/\.git*' \
  | sort

echo ""
ok "Reorganización completada."
echo ""
warn "PRÓXIMOS PASOS:"
echo "  1. Revisar el cambio:       git status"
echo "  2. Verificar que typechecks pasan:"
echo "     cd landing && npm run type-check"
echo "     cd productos/atencion/bot && npm run typecheck"
echo "  3. Commit:                  git add -A && git commit -m 'refactor: reorganizar a estructura marketplace con productos/'"
echo "  4. En Vercel/Render actualizar los Root Directory de cada deploy:"
echo "     - landing               → root: landing"
echo "     - dashboard contable    → root: productos/contable/dashboard"
echo "     - admin contable        → root: productos/contable/admin"
echo "     - backend contable      → root: productos/contable/backend"
echo "  5. Borrar el repo BotWhatsApp original cuando confirmes que el bot anda"
echo ""
