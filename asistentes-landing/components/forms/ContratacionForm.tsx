"use client";

/**
 * Formulario de contratación del Asistente de Atención.
 *
 * - Validación client-side con Zod (mismo schema que el server).
 * - Honeypot anti-spam (campo "website" invisible).
 * - Envía POST a /api/contratacion-atencion.
 * - Estados: idle / submitting / success / error.
 */
import { useState, type FormEvent } from "react";
import {
  ContratacionAtencionSchema,
  RUBROS,
} from "@/lib/schemas";

type FieldErrors = Partial<Record<string, string>>;

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export function ContratacionForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [errors, setErrors] = useState<FieldErrors>({});

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setStatus({ kind: "submitting" });

    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      nombre: String(fd.get("nombre") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      whatsapp: String(fd.get("whatsapp") ?? "").trim(),
      negocio: String(fd.get("negocio") ?? "").trim(),
      rubro: String(fd.get("rubro") ?? ""),
      personalidadBot: String(fd.get("personalidadBot") ?? "").trim(),
      ideaServicio: String(fd.get("ideaServicio") ?? "").trim(),
      website: String(fd.get("website") ?? ""), // honeypot
    };

    const parsed = ContratacionAtencionSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const [key, msgs] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (msgs && msgs.length > 0) fieldErrors[key] = msgs[0];
      }
      setErrors(fieldErrors);
      setStatus({ kind: "idle" });
      return;
    }

    try {
      const res = await fetch("/api/contratacion-atencion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus({
          kind: "error",
          message:
            (data && data.error) ||
            "No pudimos enviar tu solicitud. Probá de nuevo en un rato.",
        });
        return;
      }

      form.reset();
      setStatus({ kind: "success" });
    } catch {
      setStatus({
        kind: "error",
        message: "Error de conexión. Revisá tu internet y probá de nuevo.",
      });
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // SUCCESS STATE
  // ────────────────────────────────────────────────────────────────────
  if (status.kind === "success") {
    return (
      <div className="rounded-2xl border border-verde-200 bg-verde-50/50 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-verde-600 text-white">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="mt-4 font-display text-2xl font-bold text-oscuro">
          ¡Listo, ya nos llegó!
        </h3>
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-600">
          Recibimos tu solicitud. Te vamos a contactar en las próximas 24hs por mail o WhatsApp para coordinar los detalles y armarte el agente.
        </p>
        <button
          type="button"
          onClick={() => setStatus({ kind: "idle" })}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-verde-300 hover:text-verde-700"
        >
          Enviar otra solicitud
        </button>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────
  // FORM
  // ────────────────────────────────────────────────────────────────────
  const submitting = status.kind === "submitting";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm"
    >
      {/* Honeypot — no debería ser visible para humanos */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Tu nombre" name="nombre" error={errors.nombre} required>
          <input
            type="text"
            name="nombre"
            placeholder="Juan Pérez"
            autoComplete="name"
            disabled={submitting}
            className={baseInput(!!errors.nombre)}
          />
        </Field>

        <Field label="Email" name="email" error={errors.email} required>
          <input
            type="email"
            name="email"
            placeholder="juan@minegocio.com"
            autoComplete="email"
            disabled={submitting}
            className={baseInput(!!errors.email)}
          />
        </Field>

        <Field label="WhatsApp" name="whatsapp" error={errors.whatsapp} required hint="Con código de país, ej: +54 387 555 1234">
          <input
            type="tel"
            name="whatsapp"
            placeholder="+54 387 555 1234"
            autoComplete="tel"
            disabled={submitting}
            className={baseInput(!!errors.whatsapp)}
          />
        </Field>

        <Field label="Nombre del negocio" name="negocio" error={errors.negocio} required>
          <input
            type="text"
            name="negocio"
            placeholder="Viajes y Turismo"
            disabled={submitting}
            className={baseInput(!!errors.negocio)}
          />
        </Field>

        <Field label="Rubro" name="rubro" error={errors.rubro} required wide>
          <select
            name="rubro"
            disabled={submitting}
            defaultValue=""
            className={baseInput(!!errors.rubro)}
          >
            <option value="" disabled>
              Elegí tu rubro
            </option>
            {RUBROS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="¿Cómo querés que sea el bot?"
          name="personalidadBot"
          error={errors.personalidadBot}
          required
          wide
          hint="Nombre, tono, estilo. Ej: 'Sofia, vendedora cálida y profesional, tutea, usa emojis con moderación'."
        >
          <textarea
            name="personalidadBot"
            rows={3}
            placeholder="Quiero que se llame Sofia, sea cálida y profesional, que tutee y use emojis con moderación..."
            disabled={submitting}
            className={baseInput(!!errors.personalidadBot)}
          />
        </Field>

        <Field
          label="¿Qué tiene que hacer el bot? Contanos tu idea"
          name="ideaServicio"
          error={errors.ideaServicio}
          required
          wide
          hint="Qué hace tu negocio, qué consultas recibís más seguido, qué querés que el bot conteste. No hace falta detalle técnico — escribilo como se lo contarías a un empleado nuevo."
        >
          <textarea
            name="ideaServicio"
            rows={6}
            placeholder="Tengo una agencia de viajes. Quiero un bot que atienda consultas por WhatsApp, recomiende destinos según el presupuesto, consulte mis paquetes vigentes y guarde el contacto de quienes muestran interés..."
            disabled={submitting}
            className={baseInput(!!errors.ideaServicio)}
          />
        </Field>
      </div>

      {/* Error global */}
      {status.kind === "error" && (
        <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {status.message}
        </div>
      )}

      <div className="mt-7 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-400">
          Te respondemos en menos de 24hs · No se cobra nada hasta confirmar el alcance.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-full bg-verde-600 px-7 py-3 text-sm font-semibold text-white shadow-md shadow-verde-900/20 transition-colors hover:bg-verde-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Enviando…
            </>
          ) : (
            <>
              Enviar solicitud
              <span aria-hidden>→</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Subcomponentes
// ────────────────────────────────────────────────────────────────────────

function Field({
  label,
  name,
  error,
  required,
  wide,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  wide?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={name} className={`flex flex-col gap-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-sm font-semibold text-oscuro">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
      {hint && !error && <span className="text-xs text-slate-400">{hint}</span>}
      {error && <span className="text-xs font-medium text-rose-600">{error}</span>}
    </label>
  );
}

function baseInput(hasError: boolean): string {
  return [
    "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-oscuro",
    "placeholder:text-slate-400",
    "focus:outline-none focus:ring-2 focus:ring-offset-1",
    "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
    "transition-colors",
    hasError
      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200"
      : "border-slate-200 focus:border-verde-500 focus:ring-verde-200",
  ].join(" ");
}
