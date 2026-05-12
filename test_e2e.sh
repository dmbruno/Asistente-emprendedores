#!/usr/bin/env bash
# Script de validación E2E local (sin Supabase ni Claude reales)
# Requiere: backend Flask corriendo en localhost:5001
#
# Uso: ./test_e2e.sh

set -euo pipefail

BACKEND="http://localhost:5001"
PASS=0
FAIL=0

ok()   { echo "  [OK] $1"; ((PASS++)); }
fail() { echo "  [FAIL] $1"; ((FAIL++)); }
h()    { echo; echo "== $1 =="; }

# ─── Imagen de prueba (1x1 px blanco en JPEG) ─────────────────────────────
TMPIMG=$(mktemp /tmp/factura_test.XXXX.jpg)
# JPEG mínimo válido de 1x1px
printf '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f'"'"'9=82<.342\x1e\x1f=49=38;7>;6<7 67<8=+10000000000000000000000000000\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xc4\x00\xb5\x10\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05\x04\x04\x00\x00\x01}\x01\x02\x03\x00\x04\x11\x05\x12!1A\x06\x13Qa\x07"q\x142\x81\x91\xa1\x08#B\xb1\xc1\x15R\xd1\xf0$3br\x82\t\n\x16\x17\x18\x19\x1a%&'"'"'()*456789:CDEFGHIJSTUVWXYZcdefghijstuvwxyz\x83\x84\x85\x86\x87\x88\x89\x8a\x92\x93\x94\x95\x96\x97\x98\x99\x9a\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xc2\xc3\xc4\xc5\xc6\xc7\xc8\xc9\xca\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda\xe1\xe2\xe3\xe4\xe5\xe6\xe7\xe8\xe9\xea\xf1\xf2\xf3\xf4\xf5\xf6\xf7\xf8\xf9\xfa\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xfb\xd4P\x00\x00\x00\x1f\xff\xd9' > "$TMPIMG"
trap "rm -f $TMPIMG" EXIT

h "1. Health check"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND/api/v1/health")
[ "$STATUS" = "200" ] && ok "GET /api/v1/health → 200" || fail "GET /api/v1/health → $STATUS (¿backend corriendo?)"

h "2. Listar facturas sin auth header (BYPASS_AUTH=true → pasa de todas formas)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND/api/v1/facturas")
[ "$STATUS" = "200" ] && ok "GET /api/v1/facturas → 200" || fail "GET /api/v1/facturas → $STATUS"

h "3. Detalle de factura inexistente"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND/api/v1/facturas/abc123")
[ "$STATUS" = "200" ] && ok "GET /api/v1/facturas/abc123 → 200" || fail "GET /api/v1/facturas/abc123 → $STATUS"

h "4. Resumen del período"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND/api/v1/facturas/resumen")
[ "$STATUS" = "200" ] && ok "GET /api/v1/facturas/resumen → 200" || fail "GET /api/v1/facturas/resumen → $STATUS"

h "5. Upload de imagen con MOCK_CLAUDE (el test principal)"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -F "image=@$TMPIMG;type=image/jpeg" \
  "$BACKEND/api/v1/facturas/upload")
BODY=$(echo "$RESPONSE" | head -n -1)
STATUS=$(echo "$RESPONSE" | tail -n 1)
if [ "$STATUS" = "201" ]; then
  ok "POST /api/v1/facturas/upload → 201"
  FACTURA_ID=$(echo "$BODY" | grep -o '"factura_id":"[^"]*"' | cut -d'"' -f4)
  TOTAL=$(echo "$BODY" | grep -o '"total":[0-9.]*' | head -1 | cut -d: -f2)
  ok "  factura_id = $FACTURA_ID"
  ok "  total extraído = \$$TOTAL ARS"
else
  fail "POST /api/v1/facturas/upload → $STATUS"
  echo "  Body: $BODY"
fi

h "6. Clientes /me"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND/api/v1/clientes/me")
[ "$STATUS" = "200" ] && ok "GET /api/v1/clientes/me → 200" || fail "GET /api/v1/clientes/me → $STATUS"

h "7. API keys list"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND/api/v1/api-keys")
[ "$STATUS" = "200" ] && ok "GET /api/v1/api-keys → 200" || fail "GET /api/v1/api-keys → $STATUS"

# ─── Resumen ──────────────────────────────────────────────────────────────
echo
echo "══════════════════════════════"
echo "  Resultado: $PASS OK, $FAIL FAIL"
echo "══════════════════════════════"
[ "$FAIL" -eq 0 ] && echo "  Backend E2E: PASA" && exit 0 || echo "  Backend E2E: HAY ERRORES" && exit 1
