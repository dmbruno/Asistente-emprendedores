const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:3000";

export function CTAWaitlist() {
  return (
    <section id="waitlist" className="relative overflow-hidden bg-crema px-4 py-24">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-verde-50 via-crema to-dorado-400/10" />

      <div className="relative mx-auto max-w-2xl text-center">
        <span className="inline-block rounded-full bg-oscuro/5 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-oscuro/40">
          Trial gratuito
        </span>

        <h2 className="mt-4 font-display text-4xl font-bold text-oscuro md:text-5xl">
          Empezá hoy,<br className="hidden sm:block" /> sin tarjeta de crédito
        </h2>

        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-500">
          Creá tu cuenta, conectá tu WhatsApp y empezá a registrar facturas en minutos.
          Completamente gratis.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href={`${DASHBOARD_URL}/login`}
            className="rounded-full bg-verde-600 px-8 py-4 text-sm font-semibold text-white shadow-md shadow-verde-900/20 transition-colors hover:bg-verde-500"
          >
            Crear cuenta gratis →
          </a>
          <a
            href="#agentes"
            className="rounded-full border border-slate-200 bg-white px-8 py-4 text-sm font-medium text-slate-600 transition-colors hover:border-verde-300 hover:text-verde-700"
          >
            Ver qué incluye
          </a>
        </div>

        {/* Trust signals */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          {[
            "✓ Sin tarjeta de crédito",
            "✓ Cancelás cuando querés",
            "✓ Configuración en 5 minutos",
          ].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
