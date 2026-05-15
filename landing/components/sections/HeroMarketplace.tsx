"use client";

/**
 * Hero de la home — vista marketplace.
 *
 * En lugar de mostrar un mockup específico de un agente (como hace
 * components/sections/Hero.tsx, que es del Contable), acá mostramos
 * una grilla de agentes disponibles. Cada card linkea a su página
 * de detalle.
 *
 * Cuando agregues un agente nuevo, sumalo al array AGENTES de abajo.
 */

type Agent = {
  icon: string;
  nombre: string;
  tagline: string;
  href: string;
  comingSoon?: boolean;
};

const AGENTES: Agent[] = [
  {
    icon: "🧾",
    nombre: "Agente Contable",
    tagline: "Digitaliza facturas + valida AFIP desde WhatsApp",
    href: "/servicios/facturacion",
  },
  {
    icon: "💬",
    nombre: "Asistente de Atención",
    tagline: "Vendedor IA 24/7 personalizado para tu negocio",
    href: "/servicios/atencion",
  },
  {
    icon: "✨",
    nombre: "Próximamente",
    tagline: "Nuevos agentes en camino. ¿Tenés una idea? Contanos.",
    href: "#contacto",
    comingSoon: true,
  },
];

export function HeroMarketplace() {
  return (
    <section className="relative overflow-hidden bg-oscuro bg-grid pt-28 pb-20 sm:pb-28 lg:min-h-screen lg:pt-32 lg:pb-32">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute left-1/4 top-0 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-verde-600/15 blur-[140px]" />
      <div className="pointer-events-none absolute right-0 top-1/2 h-[350px] w-[350px] -translate-y-1/2 rounded-full bg-dorado-600/8 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-verde-800/10 blur-[80px]" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 lg:flex-row lg:items-center lg:gap-16">

        {/* ── Left column ── */}
        <div className="flex-1 text-center lg:text-left">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-verde-600/30 bg-verde-600/10 px-4 py-1.5 text-xs font-medium tracking-wide text-verde-400">
            <span className="h-1.5 w-1.5 animate-pulse2 rounded-full bg-verde-400" />
            Marketplace de Agentes IA
          </div>

          {/* Headline */}
          <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[5rem]">
            Agentes IA que{" "}
            <span className="relative whitespace-nowrap">
              <span className="relative z-10 text-verde-400">trabajan</span>
              <span className="absolute -inset-x-2 -inset-y-1 -z-10 rounded-xl bg-verde-600/15 blur-sm" />
            </span>
            {" "}por vos
          </h1>

          <p className="mx-auto mt-6 max-w-[480px] text-base leading-relaxed text-white/55 lg:mx-0 lg:text-lg">
            Conectados a tu WhatsApp, listos para tu negocio. Elegí el agente que necesitás
            — nosotros lo configuramos y empieza a trabajar en minutos.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
            <a
              href="#servicios"
              className="group relative overflow-hidden rounded-full bg-verde-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-verde-900/50 transition-all hover:bg-verde-500 hover:shadow-verde-800/60"
            >
              Ver agentes
              <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
            </a>
            <a
              href="#contacto"
              className="rounded-full border border-white/15 px-7 py-3.5 text-sm font-medium text-white/60 transition-colors hover:border-white/30 hover:text-white"
            >
              Hablemos →
            </a>
          </div>

          {/* Stats */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-4 sm:gap-x-8 lg:justify-start">
            {[
              { value: "WhatsApp", label: "sin apps extra" },
              { value: "BYOK", label: "tu propia API key" },
              { value: "24/7", label: "trabajando" },
            ].map((s) => (
              <div key={s.label} className="text-center lg:text-left">
                <div className="font-display text-xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-white/35">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right column — grilla de agentes ── */}
        <div className="w-full flex-1 lg:max-w-md">
          <div className="flex flex-col gap-4">
            {AGENTES.map((a, i) => (
              <AgentCard key={a.nombre} agent={a} index={i} />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom fade to crema */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-crema to-transparent" />
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// AgentCard
// ────────────────────────────────────────────────────────────────────────

function AgentCard({ agent, index }: { agent: Agent; index: number }) {
  const isComing = agent.comingSoon;

  // Stagger del fadeUp via inline style (las animaciones existen en globals.css)
  const animationDelay = `${0.2 + index * 0.15}s`;

  const inner = (
    <>
      {/* Glow ring (solo en hover, sutil) */}
      <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-verde-500/0 via-verde-500/0 to-verde-500/0 opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative flex items-start gap-4">
        {/* Icono */}
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl ring-1 ${
            isComing
              ? "bg-white/5 ring-white/10"
              : "bg-verde-500/15 ring-verde-500/30"
          }`}
        >
          {agent.icon}
        </div>

        {/* Texto */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-bold text-white">
              {agent.nombre}
            </h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                isComing
                  ? "bg-dorado-400/15 text-dorado-400 ring-dorado-400/30"
                  : "bg-verde-500/20 text-verde-400 ring-verde-500/30"
              }`}
            >
              {isComing ? "Próximamente" : "Disponible"}
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-white/50">
            {agent.tagline}
          </p>
        </div>

        {/* Arrow indicator (solo si es clickable) */}
        {!isComing && (
          <span className="self-center text-verde-400 transition-transform group-hover:translate-x-1">
            →
          </span>
        )}
      </div>
    </>
  );

  const className = `group relative block rounded-2xl border bg-white/[0.03] p-5 backdrop-blur-sm transition-all duration-300 ${
    isComing
      ? "border-white/8 cursor-default"
      : "border-white/8 hover:border-verde-600/40 hover:bg-white/[0.06]"
  }`;

  // La card "Próximamente" no es link
  if (isComing) {
    return (
      <div
        className={className}
        style={{ animation: `fadeUp 0.6s ease-out ${animationDelay} both` }}
      >
        {inner}
      </div>
    );
  }

  return (
    <a
      href={agent.href}
      className={className}
      style={{ animation: `fadeUp 0.6s ease-out ${animationDelay} both` }}
    >
      {inner}
    </a>
  );
}
