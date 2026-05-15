# Instructivo: Configuración del Certificado AFIP para Facturación Electrónica

> **Para quién es esto:** Este instructivo está pensado para monotributistas que quieren emitir facturas electrónicas directamente desde la app, sin entrar a la página de AFIP cada vez.
>
> **Tiempo estimado:** 30–45 minutos la primera vez.
>
> **Lo que necesitás:** Clave Fiscal nivel 3 de ARCA (ex-AFIP).

---

## Resumen de pasos

1. Generar tu clave privada y solicitud de certificado (`.key` y `.csr`)
2. Subir el `.csr` a ARCA y descargar tu certificado (`.crt`)
3. Autorizar el certificado para el servicio de facturación
4. Crear el punto de venta para web services
5. Cargar el certificado en la app

---

## Paso 1 — Generar la clave privada y el certificado CSR

Este paso se hace **una sola vez** en tu computadora. Genera dos archivos:
- **`CUIT.key`** → tu clave privada (nunca la compartas con nadie)
- **`CUIT.csr`** → la solicitud que le vas a mandar a AFIP

### En Mac o Linux (Terminal):

```bash
# Reemplazá 27056793653 con tu CUIT sin guiones
CUIT=27056793653

# Generar clave privada
openssl genrsa -out $CUIT.key 2048

# Generar la solicitud de certificado
openssl req -new -key $CUIT.key -out $CUIT.csr \
  -subj "/C=AR/O=PropioIA/CN=$CUIT"
```

Al terminar vas a tener dos archivos en la carpeta donde corriste el comando.

### En Windows (PowerShell con OpenSSL instalado):

```powershell
$CUIT = "27056793653"
openssl genrsa -out "$CUIT.key" 2048
openssl req -new -key "$CUIT.key" -out "$CUIT.csr" -subj "/C=AR/O=PropioIA/CN=$CUIT"
```

> **¿No tenés OpenSSL?** En Windows podés descargarlo de [slproweb.com/products/Win32OpenSSL.html](https://slproweb.com/products/Win32OpenSSL.html) (versión "Light"). En Mac viene instalado por defecto.

---

## Paso 2 — Subir el CSR a ARCA y descargar el certificado

1. Ingresá a [arca.gob.ar](https://www.arca.gob.ar) con tu clave fiscal.

2. En el menú de servicios buscá **"Administración de Certificados Digitales"**.

3. Hacé clic en **"Agregar alias"** (o "Nuevo").

4. Completá:
   - **Alias**: un nombre descriptivo, por ejemplo `PropioIA`
   - **Archivo CSR**: subí el archivo `CUIT.csr` que generaste en el Paso 1

   > Si el portal te pide que pegues el contenido del archivo en lugar de subirlo, abrí el `.csr` con el Bloc de notas (Windows) o TextEdit (Mac) y copiá todo el texto, incluyendo las líneas `-----BEGIN CERTIFICATE REQUEST-----` y `-----END CERTIFICATE REQUEST-----`.

5. Hacé clic en **"Incorporar"** o **"Guardar"**.

6. ARCA va a generar tu certificado. Descargalo — es un archivo `.crt`.

   > Guardá este `.crt` junto con el `.key` del Paso 1. Los vas a necesitar en el Paso 5.

---

## Paso 3 — Autorizar el certificado para el servicio de facturación

Después de crear el alias, hay que decirle a ARCA qué servicio puede usar ese certificado.

1. Desde el menú principal de ARCA, buscá **"Administrador de Relaciones de Clave Fiscal"**.

2. Seleccioná tu propio CUIT como representado.

3. Hacé clic en **"Adherir Servicio"**.

4. Seleccioná como proveedor: **"Agencia de Recaudación y Control Aduanero"**.

5. Buscá y seleccioná el servicio: **"WSFE — Facturación Electrónica"** (puede aparecer como "Facturación Electrónica" o "WebServices").

6. En el paso siguiente te va a pedir que seleccionés el **alias** que creaste (ej. `PropioIA`). Seleccionalo y confirmá.

> **Importante:** Sin este paso, el sistema no puede autenticarse con AFIP y vas a ver el error "Computador no autorizado".

---

## Paso 4 — Crear el punto de venta para Web Services

AFIP requiere que las facturas emitidas por software usen un punto de venta específico para ese canal.

1. Desde el menú principal de ARCA, ingresá al servicio **"Comprobantes en Línea"** (o "Facturación Electrónica").

2. En el menú interno buscá **"ABM Puntos de Venta"** o **"Puntos de Venta / Emisión"**.

3. Hacé clic en **"Agregar"**.

4. Completá:
   - **Número**: `3` (si ya tenés puntos de venta 1 y 2, usá el siguiente disponible)
   - **Nombre de Fantasía**: cualquiera, por ejemplo `PropioIA WS`
   - **Sistema**: seleccioná **"Factura Electrónica - Monotributo - Web Services"**
   - **Dominio Asociado**: dejarlo vacío
   - **Domicilio**: seleccioná tu domicilio fiscal

5. Hacé clic en **"Aceptar"**.

> **Nota:** Los puntos de venta existentes (tipo "Factura en Línea" o "Factuweb") no sirven para la app — necesitás uno del tipo "Web Services".

---

## Paso 5 — Cargar el certificado en la app

Una vez que tenés los dos archivos listos:
- `CUIT.crt` (descargado de ARCA en el Paso 2)
- `CUIT.key` (generado en el Paso 1)

Enviáselos a soporte por un canal seguro (no por WhatsApp ni email). El equipo de PropioIA los carga en el sistema de forma encriptada y te confirma cuando está listo.

> **Próximamente:** Esta carga va a poder hacerse directamente desde el panel de la app sin necesidad de contactar a soporte.

---

## Verificación final

Para confirmar que todo funciona:

1. Mandá una foto de cualquier factura al WhatsApp de la app.
2. Confirmá la emisión cuando el sistema te la muestre.
3. Si ves el mensaje con el número de CAE (código de 14 dígitos), la factura fue registrada exitosamente en AFIP.

También podés verificarla en ARCA:
- Ingresá a **"Mis Comprobantes"** → **"Comprobantes Emitidos"**
- Filtrá por Tipo: **Factura C**, Punto de Venta: el número que creaste (ej. `3`)

---

## Preguntas frecuentes

**¿Qué pasa si pierdo el archivo `.key`?**
Hay que repetir el proceso desde el Paso 1. El `.key` es irrecuperable si no lo guardaste — es tu clave privada.

**¿Cada cuánto vence el certificado?**
El certificado de ARCA tiene validez de **2 años**. Cuando esté por vencer, la app te va a avisar.

**¿Puedo usar el mismo certificado en otro sistema?**
Sí, el certificado es tuyo. Pero no compartas el `.key` — ese archivo es como la contraseña maestra de tu firma digital.

**¿Es seguro mandar los archivos a soporte?**
Los archivos se encriptan antes de guardarse en la base de datos. Soporte nunca tiene acceso al `.key` en texto plano una vez cargado.

**Me aparece "Computador no autorizado"**
Faltó el Paso 3. Volvé a ARCA y asociá el alias al servicio WSFE.

**Me aparece "El punto de venta no está habilitado"**
Faltó el Paso 4, o el punto de venta creado no es del tipo "Web Services".

---

*Instructivo preparado por PropioIA · Versión 1.0 · Mayo 2026*
