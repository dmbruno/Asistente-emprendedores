#!/usr/bin/env bash
#
# continuar-migracion.sh
#
# Retoma la migración del monorepo donde quedó después del error de git mv.
#
# Estado actual esperado:
#   ✅ landing/ ya existe
#   ✅ productos/contable/dashboard/ ya existe
#   ✅ productos/contable/admin/ ya existe
#   ❌ asistentes-backend/ todavía existe (no se pudo mover)
#   ❌ Pasos 4-7 del script original sin ejecutar
#
# Cómo correrlo:
#   chmod +x continuar-migracion.sh
#   ./continuar-migracion.sh

set -euo pipefail

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

BOT_SOURCE="${HOME}/Documents/Programacion/proyectosPropios/BotWhatsApp"

# ════════════════════════════════════════════════════════════════════════
# PRE-CHECK — confirmar estado esperado
# ════════════════════════════════════════════════════════════════════════

header "Pre-checks"

if [[ ! -d "asistentes-backend" ]]; then
  err "No encuentro asistentes-backend/. Capaz ya completaste la migración."
  err "Si fue así, no necesitás correr este script."
  exit 1
fi
ok "asistentes-backend/ existe (esperado)"

[[ -d "landing" ]] && ok "landing/ existe" || warn "landing/ NO existe (raro, fijate)"
[[ -d "productos/contable/dashboard" ]] && ok "productos/contable/dashboard/ existe" || warn "falta dashboard"
[[ -d "productos/contable/admin" ]] && ok "productos/contable/admin/ existe" || warn "falta admin"

# ════════════════════════════════════════════════════════════════════════
# PASO 3 (retake) — destrabar y completar el git mv del backend
# ════════════════════════════════════════════════════════════════════════

header "Paso 3/7 (retake) — Destrabar y mover asistentes-backend"

info "Sacando del index de git los archivos que ya borramos del disco..."

# Estos los borró el script original con rm -f
for f in \
  asistentes-backend/GUIA_ONBOARDING_USUARIO.md \
  asistentes-backend/GUIA_TESTING_Y_DEPLOY.md \
  asistentes-backend/INSTRUCTIVO_CERTIFICADO_AFIP.md
do
  if git ls-files --error-unmatch "$f" &>/dev/null; then
    git rm --cached "$f" &>/dev/null && ok "Removido del index: $f"
  fi
done

# Defensive: limpiar cualquier OTRO archivo tracked que ya no exista en disco
info "Buscando otros archivos tracked que ya no existen en disco..."
MISSING_COUNT=0
while IFS= read -r f; do
  if [[ ! -e "$f" ]]; then
    git rm --cached "$f" &>/dev/null
    info "  Removido del index: $f"
    MISSING_COUNT=$((MISSING_COUNT + 1))
  fi
done < <(git ls-files asistentes-backend/)

if [[ $MISSING_COUNT -gt 0 ]]; then
  ok "Limpiados $MISSING_COUNT archivos faltantes del index"
else
  ok "No había más archivos faltantes"
fi

info "Ahora sí, moviendo asistentes-backend → productos/contable/backend..."
git mv asistentes-backend productos/contable/backend
ok "asistentes-backend → productos/contable/backend"

# ════════════════════════════════════════════════════════════════════════
# PASO 4 — Mover documentación y archivos sueltos
# ════════════════════════════════════════════════════════════════════════

header "Paso 4/7 — Mover documentación y archivos sueltos"

mkdir -p docs

for md in GUIA_ONBOARDING_USUARIO.md GUIA_TESTING_Y_DEPLOY.md INSTRUCTIVO_CERTIFICADO_AFIP.md deploy.md; do
  if [[ -f "$md" ]]; then
    if git ls-files --error-unmatch "$md" &>/dev/null; then
      git mv "$md" "docs/$md"
    else
      mv "$md" "docs/$md"
    fi
    ok "$md → docs/$md"
  fi
done

if [[ -f "cargar_afip_cert.py" ]]; then
  if git ls-files --error-unmatch "cargar_afip_cert.py" &>/dev/null; then
    git mv cargar_afip_cert.py productos/contable/backend/cargar_afip_cert.py
  else
    mv cargar_afip_cert.py productos/contable/backend/cargar_afip_cert.py
  fi
  ok "cargar_afip_cert.py → productos/contable/backend/"
fi

if [[ -f "test_e2e.sh" ]]; then
  if git ls-files --error-unmatch "test_e2e.sh" &>/dev/null; then
    git mv test_e2e.sh productos/contable/backend/test_e2e.sh
  else
    mv test_e2e.sh productos/contable/backend/test_e2e.sh
  fi
  ok "test_e2e.sh → productos/contable/backend/"
fi

# Certs (gitignored, no tracked)
shopt -s nullglob
for cert in *.csr *.key; do
  if [[ -f "$cert" ]]; then
    mkdir -p productos/contable/backend/certs
    mv "$cert" "productos/contable/backend/certs/$cert"
    ok "$cert → productos/contable/backend/certs/  (untracked)"
  fi
done
shopt -u nullglob

if [[ -f "factura_a_prueba.html" ]]; then
  mkdir -p docs/samples
  if git ls-files --error-unmatch "factura_a_prueba.html" &>/dev/null; then
    git mv factura_a_prueba.html docs/samples/factura_a_prueba.html
  else
    mv factura_a_prueba.html docs/samples/factura_a_prueba.html
  fi
  ok "factura_a_prueba.html → docs/samples/"
fi

if [[ -f "instagram-carousel.html" ]]; then
  mkdir -p docs/marketing
  if git ls-files --error-unmatch "instagram-carousel.html" &>/dev/null; then
    git mv instagram-carousel.html docs/marketing/instagram-carousel.html
  else
    mv instagram-carousel.html docs/marketing/instagram-carousel.html
  fi
  ok "instagram-carousel.html → docs/marketing/"
fi

if [[ -d "venv" ]]; then
  mv venv productos/contable/backend/venv
  ok "venv/ → productos/contable/backend/  (untracked)"
fi

# ════════════════════════════════════════════════════════════════════════
# PASO 5 — Copiar el bot
# ════════════════════════════════════════════════════════════════════════

header "Paso 5/7 — Copiar el bot"

if [[ ! -d "$BOT_SOURCE" ]]; then
  err "No encontré el bot en: $BOT_SOURCE"
  err "Editá BOT_SOURCE arriba con el path correcto."
  exit 1
fi

mkdir -p productos/atencion/bot

rsync -a \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=dist \
  --exclude=.next \
  --exclude="*.log" \
  --exclude=".env" \
  --exclude=".env.local" \
  "$BOT_SOURCE/" "productos/atencion/bot/"

git add productos/atencion/bot
ok "Bot copiado a productos/atencion/bot/"
info "El repo original BotWhatsApp queda intacto como backup."

# ════════════════════════════════════════════════════════════════════════
# PASO 6 — README.md y CLAUDE.md raíz
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
info "Estructura final (3 niveles):"
echo ""

if command -v tree &>/dev/null; then
  tree -L 3 -I 'node_modules|.next|dist|venv|__pycache__|.git' .
else
  find . -maxdepth 3 -type d \
    ! -path '*/node_modules*' ! -path '*/\.next*' ! -path '*/dist*' \
    ! -path '*/venv*' ! -path '*/__pycache__*' ! -path '*/\.git*' \
    | sort
fi

echo ""
ok "Migración completada."
echo ""
warn "PRÓXIMOS PASOS:"
echo "  1. Revisar:                 git status"
echo "  2. Verificar typechecks:"
echo "     cd landing && npm install && npm run type-check"
echo "     cd ../productos/atencion/bot && npm install && npm run typecheck"
echo "  3. Commit:                  git add -A && git commit -m 'refactor: reorganizar a estructura marketplace con productos/'"
echo "  4. Push:                    git push"
echo "  5. Actualizar root directory en Vercel/Render para cada deploy"
echo ""
