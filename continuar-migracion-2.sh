#!/usr/bin/env bash
#
# continuar-migracion-2.sh
#
# Retoma la migración después del conflicto en test_e2e.sh.
#
# Estado actual esperado:
#   ✅ Las 4 carpetas movidas a su nueva ubicación
#   ✅ Los .md de raíz ya en docs/
#   ✅ cargar_afip_cert.py ya en productos/contable/backend/
#   ❌ test_e2e.sh sigue en raíz (conflicto)
#   ❌ Certs, HTMLs, venv sin mover
#   ❌ Bot sin copiar
#   ❌ README.md y CLAUDE.md raíz sin crear

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

BOT_SOURCE="${HOME}/Documents/Programacion/proyectosPropios/BotWhatsApp"

# ════════════════════════════════════════════════════════════════════════
# Helper: mueve un archivo de forma segura, sin abortar si hay conflicto.
#   - Si el archivo destino no existe → git mv (o mv si no está tracked).
#   - Si el destino existe y es IDÉNTICO al origen → borra el origen.
#   - Si el destino existe y es DISTINTO → solo loguea, no toca nada.
# ════════════════════════════════════════════════════════════════════════
safe_move() {
  local src="$1"
  local dst="$2"

  if [[ ! -e "$src" ]]; then
    return
  fi

  if [[ -e "$dst" ]]; then
    if diff -q "$src" "$dst" &>/dev/null; then
      info "  $src es idéntico a $dst → borrando origen"
      if git ls-files --error-unmatch "$src" &>/dev/null; then
        git rm "$src" >/dev/null
      else
        rm "$src"
      fi
      ok "  $src eliminado (idéntico al de destino)"
    else
      warn "  CONFLICTO: $src y $dst son distintos. NO se mueve."
      warn "  Revisar manualmente con: diff $src $dst"
    fi
    return
  fi

  # Destino no existe, mover normal
  mkdir -p "$(dirname "$dst")"
  if git ls-files --error-unmatch "$src" &>/dev/null; then
    git mv "$src" "$dst"
  else
    mv "$src" "$dst"
  fi
  ok "  $src → $dst"
}

# ════════════════════════════════════════════════════════════════════════
# Pre-checks
# ════════════════════════════════════════════════════════════════════════

header "Pre-checks"

[[ -d "landing" ]] && ok "landing/ existe"
[[ -d "productos/contable/dashboard" ]] && ok "productos/contable/dashboard/ existe"
[[ -d "productos/contable/admin" ]] && ok "productos/contable/admin/ existe"
[[ -d "productos/contable/backend" ]] && ok "productos/contable/backend/ existe"

# ════════════════════════════════════════════════════════════════════════
# PASO 4 (resto) — archivos sueltos que quedaron pendientes
# ════════════════════════════════════════════════════════════════════════

header "Paso 4/7 (continuación) — Mover archivos sueltos restantes"

safe_move "test_e2e.sh"             "productos/contable/backend/test_e2e.sh"
safe_move "cargar_afip_cert.py"     "productos/contable/backend/cargar_afip_cert.py"

# Certs (gitignored)
shopt -s nullglob
for cert in *.csr *.key; do
  if [[ -f "$cert" ]]; then
    mkdir -p productos/contable/backend/certs
    safe_move "$cert" "productos/contable/backend/certs/$cert"
  fi
done
shopt -u nullglob

safe_move "factura_a_prueba.html"   "docs/samples/factura_a_prueba.html"
safe_move "instagram-carousel.html" "docs/marketing/instagram-carousel.html"

if [[ -d "venv" ]]; then
  if [[ -d "productos/contable/backend/venv" ]]; then
    warn "venv/ ya existe en productos/contable/backend/, dejo el de raíz como está"
  else
    mv venv productos/contable/backend/venv
    ok "  venv/ → productos/contable/backend/venv"
  fi
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

if [[ -d "productos/atencion/bot" ]] && [[ -n "$(ls -A productos/atencion/bot 2>/dev/null)" ]]; then
  warn "productos/atencion/bot/ ya tiene contenido — saltando copia (si querés re-copiar, borralo primero)"
else
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
fi

# ════════════════════════════════════════════════════════════════════════
# PASO 6 — README.md y CLAUDE.md raíz
# ════════════════════════════════════════════════════════════════════════

header "Paso 6/7 — README.md y CLAUDE.md raíz"

if [[ -f "README.md" ]]; then
  warn "README.md ya existe en la raíz, NO se sobrescribe"
else
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
  git add README.md
  ok "README.md creado"
fi

if [[ -f "CLAUDE.md" ]]; then
  warn "CLAUDE.md ya existe en la raíz, NO se sobrescribe"
else
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
  git add CLAUDE.md
  ok "CLAUDE.md creado"
fi

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
