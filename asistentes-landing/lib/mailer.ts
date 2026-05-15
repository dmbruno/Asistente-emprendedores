/**
 * Cliente SMTP con Nodemailer.
 *
 * Setup recomendado (Gmail App Password):
 *   1. Activar 2FA en la cuenta dmbruno61@gmail.com
 *   2. Ir a https://myaccount.google.com/apppasswords y generar una App Password
 *   3. Copiar la password de 16 dígitos en SMTP_PASS del .env.local
 *
 * Variables de entorno requeridas:
 *   SMTP_HOST   (ej: smtp.gmail.com)
 *   SMTP_PORT   (ej: 587)
 *   SMTP_USER   (ej: dmbruno61@gmail.com)
 *   SMTP_PASS   (App Password de 16 dígitos)
 *   MAIL_FROM   (ej: "PropioIA <dmbruno61@gmail.com>")
 *   MAIL_TO     (ej: dmbruno61@gmail.com)
 */
import nodemailer, { type Transporter } from "nodemailer";

let cached: Transporter | null = null;

function getTransporter(): Transporter {
  if (cached) return cached;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP_HOST, SMTP_USER o SMTP_PASS no configurados en .env.local"
    );
  }

  cached = nodemailer.createTransport({
    host,
    port,
    // 587 usa STARTTLS (secure: false). 465 usa SSL directo (secure: true).
    secure: port === 465,
    auth: { user, pass },
  });

  return cached;
}

export interface MailPayload {
  subject: string;
  text: string;
  html: string;
}

export async function sendMail(payload: MailPayload): Promise<void> {
  const from = process.env.MAIL_FROM ?? process.env.SMTP_USER;
  const to = process.env.MAIL_TO ?? process.env.SMTP_USER;

  if (!from || !to) {
    throw new Error("MAIL_FROM/MAIL_TO no configurados");
  }

  await getTransporter().sendMail({
    from,
    to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
}
