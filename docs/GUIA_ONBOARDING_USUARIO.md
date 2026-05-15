# Guía de configuración inicial — Asistente Contable IA

> Esta guía es para el usuario final. Completá los 4 pasos y vas a tener tu asistente listo para registrar facturas por WhatsApp.

---

## Antes de empezar

Necesitás tener a mano:
- Tu **número de WhatsApp** activo (el que vas a usar para mandar las facturas)
- Tu **CUIT** (con guiones: `20-12345678-1`)
- Tu **condición fiscal**: si sos monotributista, también la categoría actual (A, B, C…)
- Una **API key de IA** (Google Gemini es gratis y funciona muy bien — instrucciones abajo)

---

## Paso 1 — Conectar WhatsApp

1. Ingresá al dashboard y andá a **WhatsApp** en el menú lateral.
2. Vas a ver un **código QR** en pantalla.
3. En tu celular, abrí WhatsApp → Dispositivos vinculados → Vincular dispositivo.
4. Escaneá el QR con la cámara.
5. En unos segundos el estado pasa a **"Conectado"** ✅

> **Importante:** el número que vinculás es el que vas a usar para mandar fotos de facturas. Puede ser tu número personal o uno dedicado al negocio.

---

## Paso 2 — Configurar tu condición fiscal

1. Andá a **Configuración** en el menú lateral.
2. Completá los campos:

### Si sos Monotributista

| Campo | Qué poner |
|-------|-----------|
| Condición fiscal | `Monotributista` |
| Categoría | Tu categoría actual (A, B, C… hasta K) |
| CUIT | Tu CUIT con guiones: `20-12345678-1` |
| Razón social | Tu nombre y apellido o nombre de fantasía |

> La categoría es importante: el asistente te va a avisar cuando estés cerca del **tope anual de facturación** de tu categoría.

### Si sos Responsable Inscripto (RI)

| Campo | Qué poner |
|-------|-----------|
| Condición fiscal | `Responsable Inscripto` |
| CUIT | Tu CUIT con guiones: `30-12345678-9` |
| Razón social | Nombre de tu empresa o nombre y apellido |

> El asistente va a calcular tu **posición de IVA mensual** (débito – crédito) y te la va a mostrar en el dashboard y por WhatsApp cuando pidas el resumen.

3. Guardá los cambios.

---

## Paso 3 — Configurar la API key de IA

El asistente usa inteligencia artificial para leer las facturas que le mandás. Necesitás una API key de alguno de estos servicios:

### Opción A — Google Gemini ⭐ (recomendado para empezar, tiene capa gratuita)

1. Andá a [aistudio.google.com](https://aistudio.google.com) e iniciá sesión con tu cuenta Google.
2. Hacé clic en **"Get API key"** → **"Create API key"**.
3. Copiá la key generada (empieza con `AIza...`).
4. En el dashboard, andá a **API Keys** → seleccioná `Google Gemini` → pegá la key → Guardar.

> Google Gemini tiene un plan gratuito con límite mensual. Si mandás muchas facturas por mes, puede que necesites activar el plan de pago desde la misma consola.

### Opción B — Anthropic Claude (de pago, muy precisa)

1. Creá una cuenta en [console.anthropic.com](https://console.anthropic.com).
2. Cargá crédito (desde USD 5).
3. Andá a **API Keys** → **Create Key** → copiá la key (empieza con `sk-ant-...`).
4. En el dashboard, andá a **API Keys** → seleccioná `Anthropic Claude` → pegá la key → Guardar.

### Opción C — OpenAI (de pago)

1. Creá una cuenta en [platform.openai.com](https://platform.openai.com).
2. Cargá crédito.
3. Andá a **API Keys** → **Create new secret key** → copiá la key (empieza con `sk-...`).
4. En el dashboard, andá a **API Keys** → seleccioná `OpenAI` → pegá la key → Guardar.

> **Tu API key es tuya.** El asistente la guarda encriptada y la usa exclusivamente para procesar tus facturas. Nosotros no tenemos acceso a tu cuenta ni a tu saldo.

---

## Paso 4 — Probá con tu primera factura

¡Ya estás listo! Mandá una foto de una factura al WhatsApp que vinculaste.

El asistente te va a responder con un resumen:

```
✅ Compra detectada (confianza 94%)

📋 Factura B N° 0001-00012345
🏢 Proveedor S.A.
📅 2026-05-10
💰 $15.000,00 ARS

Respondé SI para confirmar o NO para descartar.
```

- Respondé **SI** para confirmar y registrar la factura.
- Respondé **NO** para descartarla.

---

## Comandos disponibles por WhatsApp

| Comando | Qué hace |
|---------|----------|
| 📷 Foto de factura | La lee y te pide confirmación |
| `resumen` | Te muestra ventas, compras y neto del mes/año |
| `ayuda` | Te muestra todos los comandos |
| `si` / `no` | Confirmar o descartar la última factura |

### Solo Monotributistas
| Comando | Qué hace |
|---------|----------|
| `factura a [nombre] $[monto] [concepto]` | Emite una Factura C |

### Solo Responsables Inscriptos
| Comando | Qué hace |
|---------|----------|
| `emitir factura` | Inicia el proceso para emitir una Factura A o B |

---

## Preguntas frecuentes

**¿Qué pasa si la foto está borrosa o cortada?**
El asistente va a avisarte que no pudo leer bien la imagen y te va a pedir una foto más clara. Siempre podés subir la factura manualmente desde el dashboard.

**¿Puedo mandar facturas en PDF?**
Sí, si usás Anthropic Claude o OpenAI. Si usás Google Gemini necesitás mandar una foto (Gemini no procesa PDFs directamente).

**¿Mis facturas están seguras?**
Sí. Se guardan en una base de datos privada accesible solo con tu cuenta. Tu API key está encriptada y nunca la podemos ver.

**¿El asistente registra las facturas automáticamente?**
No. Siempre te pide que confirmes antes de registrar. Si el CUIT de la factura no coincide con el tuyo, te avisa.

**¿Puedo ver todo desde el celular?**
Sí, el dashboard funciona en mobile. Pero el canal principal es WhatsApp — la mayoría de las operaciones las hacés desde ahí.

---

*¿Alguna duda? Escribinos por WhatsApp al número de soporte.*
