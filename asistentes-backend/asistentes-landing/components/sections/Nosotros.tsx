export function Nosotros() {
  return (
    <section id="nosotros" className="bg-oscuro px-4 py-24 relative overflow-hidden">
      {/* Subtle grid */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />

      <div className="relative mx-auto max-w-5xl">

        {/* Label */}
        <div className="text-center">
          <span className="inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/40">
            Quiénes somos
          </span>
        </div>

        {/* Headline */}
        <h2 className="mt-6 text-center font-display text-4xl font-bold leading-tight text-white md:text-5xl">
          Hacemos que la tecnología<br className="hidden sm:block" />
          <span className="text-verde-400"> trabaje por vos</span>
        </h2>

        {/* Intro text */}
        <div className="mx-auto mt-10 max-w-3xl space-y-5 text-center">
          <p className="text-lg leading-relaxed text-white/70">
            Somos un grupo de desarrolladores que sigue de cerca cada avance en
            inteligencia artificial — no para escribir sobre él, sino para convertirlo
            en algo que sirva mañana a la mañana.
          </p>
          <p className="text-base leading-relaxed text-white/45">
            Trabajamos sin jerarquías pesadas, en movimiento permanente, con una sola
            obsesión: reducir la distancia entre la tecnología de última generación
            y el emprendedor Argentino que todavía lleva las cuentas en una hoja de cálculo.
            La IA que usan las grandes corporaciones para optimizar millones
            también puede hacer que vos nunca más tengas que cargar una factura a mano.
          </p>
        </div>

        {/* Pillars */}
        <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/8 sm:grid-cols-3">
          {[
            {
              num: "01",
              titulo: "Tecnología de frontera",
              desc: "Usamos los mismos modelos de IA que las empresas del Fortune 500, adaptados a la escala de una Pyme.",
            },
            {
              num: "02",
              titulo: "Cambio constante",
              desc: "No nos quedamos quietos. Si hay un avance que le sirve a nuestros clientes, lo integramos.",
            },
            {
              num: "03",
              titulo: "Construido en Argentina",
              desc: "Entendemos el contexto local: AFIP, monotributo, Mercado Pago. No es un producto importado y traducido.",
            },
          ].map((p) => (
            <div key={p.num} className="flex flex-col gap-3 bg-white/3 px-6 py-7 transition-colors hover:bg-white/5">
              <span className="font-display text-xs font-bold tracking-widest text-verde-500/60">{p.num}</span>
              <div className="font-display text-base font-bold text-white">{p.titulo}</div>
              <p className="text-sm leading-relaxed text-white/40">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Evolution cards */}
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">

          {/* SaaS card */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/4 p-8 transition-all duration-300 hover:border-white/15 hover:bg-white/6">
            <div className="absolute right-6 top-6 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/30">
              Origen
            </div>
            <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/8">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
                <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
              </svg>
            </div>
            <div className="font-display text-xs font-bold uppercase tracking-widest text-white/30">SaaS</div>
            <div className="mt-1 font-display text-xl font-bold text-white">Software as a Service</div>
            <p className="mt-3 text-sm leading-relaxed text-white/50">
              Herramientas en la nube que podés usar desde cualquier dispositivo, sin instalar nada. Vos operás la herramienta; la herramienta no hace nada sola.
            </p>
          </div>

          {/* AaaS card */}
          <div className="group relative overflow-hidden rounded-2xl border border-verde-500/30 bg-verde-500/6 p-8 transition-all duration-300 hover:border-verde-500/50 hover:bg-verde-500/10">
            <div className="absolute right-6 top-6 rounded-full border border-verde-500/30 bg-verde-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-verde-400">
              Ahora
            </div>
            <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-verde-500/30 bg-verde-500/15">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-verde-400">
                <path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/><path d="M22 2 12 12"/><circle cx="22" cy="2" r="2"/>
              </svg>
            </div>
            <div className="font-display text-xs font-bold uppercase tracking-widest text-verde-500/70">AaaS</div>
            <div className="mt-1 font-display text-xl font-bold text-white">Agent as a Service</div>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Un agente de IA que opera y ejecuta tareas por vos — sin que tengas que abrir nada. No es una herramienta que usás; es un colaborador que trabaja mientras vos hacés otra cosa.
            </p>
          </div>
        </div>

        {/* Mission pull quote */}
        <div className="mt-10 rounded-2xl border border-dorado-600/20 bg-dorado-600/6 px-8 py-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
            <div className="shrink-0">
              <div className="h-px w-12 bg-dorado-600/60 md:h-12 md:w-px" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold leading-snug text-white md:text-xl">
                Nuestra misión es que cualquier emprendedor Argentino tenga acceso a la automatización inteligente que antes solo tenían las grandes empresas.
              </p>
              <p className="mt-3 text-sm text-white/40">
                Empezamos por la contabilidad — la tarea que más tiempo roba y menos valor genera. Seguimos desde ahí.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
