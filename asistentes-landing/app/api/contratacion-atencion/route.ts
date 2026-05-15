/**
 * POST /api/contratacion-atencion
 *
 * Recibe el formulario de contratación del Asistente de Atención.
 * Valida con Zod y envía un mail a la casilla configurada.
 *
 * Respuestas:
 *   200 { ok: true }                       → solicitud recibida
 *   400 { ok: false, errors: ... }         → payload inválido
 *   500 { ok: false, error: "..." }        → fallo de envío
 */
import { ContratacionAtencionSchema } from "@/lib/schemas";
import { sendMail } from "@/lib/mailer";

// Node runtime: necesitamos nodemailer (no es compatible con Edge)
export const runtime = "nodejs";

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "JSON inválido" },
      { status: 400 }
    );
  }

  const parsed = ContratacionAtencionSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Honeypot: si vino texto en "website" es un bot.
  // Devolvemos 200 para no avisarle que detectamos el truco.
  if (data.website) {
    console.warn("[contratacion-atencion] honeypot disparado");
    return Response.json({ ok: true });
  }

  try {
    await sendMail({
      subject: `🤖 Nueva solicitud — Asistente de Atención (${data.negocio})`,
      text: buildPlainText(data),
      html: buildHtml(data),
    });
    return Response.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[contratacion-atencion] error enviando mail:", msg);
    return Response.json(
      { ok: false, error: "No pudimos enviar tu solicitud. Probá de nuevo en un rato." },
      { status: 500 }
    );
  }
}

// ────────────────────────────────────────────────────────────────────────
// Templates de mail
// ────────────────────────────────────────────────────────────────────────

type Payload = Parameters<typeof ContratacionAtencionSchema.parse>[0] extends infer T
  ? T
  : never;

function buildPlainText(d: Record<string, string | undefined>): string {
  return [
    `Nueva solicitud de contratación — Asistente de Atención`,
    `─────────────────────────────────────────────`,
    ``,
    `CONTACTO`,
    `Nombre:    ${d.nombre}`,
    `Email:     ${d.email}`,
    `WhatsApp:  ${d.whatsapp}`,
    ``,
    `NEGOCIO`,
    `Nombre:    ${d.negocio}`,
    `Rubro:     ${d.rubro}`,
    ``,
    `PERSONALIDAD DEL BOT`,
    d.personalidadBot ?? "",
    ``,
    `IDEA / QUÉ TIENE QUE HACER`,
    d.ideaServicio ?? "",
    ``,
    `─────────────────────────────────────────────`,
    `Recibido: ${new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}`,
  ].join("\n");
}

function buildHtml(d: Record<string, string | undefined>): string {
  const esc = (s: string | undefined) =>
    (s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
    );

  return `
<!DOCTYPE html>
<html lang="es-AR">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #fafaf5; color: #0b0f0b; margin: 0; padding: 24px; }
    .card { max-width: 640px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
    .header { background: #0b0f0b; color: #fff; padding: 20px 24px; }
    .header h1 { margin: 0; font-size: 18px; font-weight: 700; }
    .header p { margin: 4px 0 0; font-size: 12px; color: rgba(255,255,255,.5); }
    .section { padding: 18px 24px; border-bottom: 1px solid #f1f5f9; }
    .section:last-child { border-bottom: none; }
    .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin: 0 0 8px; }
    .row { display: flex; gap: 12px; margin: 6px 0; font-size: 14px; }
    .row strong { color: #475569; min-width: 90px; }
    .row span { color: #0b0f0b; }
    .text { font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap; margin: 0; }
    .footer { padding: 14px 24px; background: #f8fafc; color: #64748b; font-size: 12px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; background: #16a34a; color: #fff; font-size: 11px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>🤖 Nueva solicitud — Asistente de Atención</h1>
      <p><span class="badge">Pendiente</span> &nbsp;${esc(d.negocio)}</p>
    </div>

    <div class="section">
      <p class="label">Contacto</p>
      <div class="row"><strong>Nombre:</strong> <span>${esc(d.nombre)}</span></div>
      <div class="row"><strong>Email:</strong> <span><a href="mailto:${esc(d.email)}">${esc(d.email)}</a></span></div>
      <div class="row"><strong>WhatsApp:</strong> <span>${esc(d.whatsapp)}</span></div>
    </div>

    <div class="section">
      <p class="label">Negocio</p>
      <div class="row"><strong>Nombre:</strong> <span>${esc(d.negocio)}</span></div>
      <div class="row"><strong>Rubro:</strong> <span>${esc(d.rubro)}</span></div>
    </div>

    <div class="section">
      <p class="label">Personalidad del bot</p>
      <p class="text">${esc(d.personalidadBot)}</p>
    </div>

    <div class="section">
      <p class="label">Idea / qué tiene que hacer</p>
      <p class="text">${esc(d.ideaServicio)}</p>
    </div>

    <div class="footer">
      Recibido el ${new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })} · PropioIA
    </div>
  </div>
</body>
</html>`.trim();
}
