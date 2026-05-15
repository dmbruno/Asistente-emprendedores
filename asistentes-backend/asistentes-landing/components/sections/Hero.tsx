"use client";

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-oscuro bg-grid">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute left-1/4 top-0 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-verde-600/15 blur-[140px]" />
      <div className="pointer-events-none absolute right-0 top-1/2 h-[350px] w-[350px] -translate-y-1/2 rounded-full bg-dorado-600/8 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-verde-800/10 blur-[80px]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center gap-8 px-4 pb-20 pt-24 sm:pb-28 sm:pt-28 lg:flex-row lg:items-center lg:gap-16">

        {/* ── Left column ── */}
        <div className="flex-1 text-center lg:text-left">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-verde-600/30 bg-verde-600/10 px-4 py-1.5 text-xs font-medium tracking-wide text-verde-400">
            <span className="h-1.5 w-1.5 animate-pulse2 rounded-full bg-verde-400" />
            Nuevos cupos disponibles
          </div>

          {/* Headline */}
          <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[5rem]">
            El agente que{" "}
            <span className="relative whitespace-nowrap">
              <span className="relative z-10 text-verde-400">administra</span>
              <span className="absolute -inset-x-2 -inset-y-1 -z-10 rounded-xl bg-verde-600/15 blur-sm" />
            </span>
            {" "}tu negocio
          </h1>

          <p className="mx-auto mt-6 max-w-[480px] text-base leading-relaxed text-white/55 lg:mx-0 lg:text-lg">
            Un asistente IA conectado a tu WhatsApp que registra facturas, valida datos en AFIP
            y te mantiene al día — sin planillas, sin apps extra, sin burocracia.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
            <a
              href="#waitlist"
              className="group relative overflow-hidden rounded-full bg-verde-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-verde-900/50 transition-all hover:bg-verde-500 hover:shadow-verde-800/60"
            >
              Probar gratis
              <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
            </a>
            <a
              href="#agentes"
              className="rounded-full border border-white/15 px-7 py-3.5 text-sm font-medium text-white/60 transition-colors hover:border-white/30 hover:text-white"
            >
              Ver agentes →
            </a>
          </div>

          {/* Stats */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-4 sm:gap-x-8 lg:justify-start">
            {[
              { value: "5 seg", label: "por factura" },
              { value: "AFIP", label: "validación automática" },
              { value: "WhatsApp", label: "sin apps extra" },
            ].map((s) => (
              <div key={s.label} className="text-center lg:text-left">
                <div className="font-display text-xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-white/35">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right column — WhatsApp mockup ── */}
        <div className="flex flex-1 items-center justify-center lg:justify-end">
          <div className="relative w-full max-w-[320px] animate-float">

            {/* Outer glow ring */}
            <div className="absolute -inset-4 rounded-[3rem] bg-verde-600/10 blur-xl" />

            {/* Phone frame */}
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#111b21] shadow-2xl shadow-black/70">

              {/* Status bar */}
              <div className="flex items-center justify-between bg-[#111b21] px-4 pt-3 pb-1">
                <span className="text-[10px] text-white/30">9:41</span>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-3 rounded-sm bg-white/30" />
                  <div className="h-1.5 w-1.5 rounded-full border border-white/30" />
                </div>
              </div>

              {/* WhatsApp header */}
              <div className="flex items-center gap-3 bg-[#1f2c34] px-4 py-2.5">
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-verde-500 to-verde-700 font-bold text-white text-xs shadow-md">
                  IA
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-verde-400 ring-2 ring-[#1f2c34]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white leading-none">Asistente Contable</div>
                  <div className="mt-0.5 text-[10px] text-verde-400">● en línea</div>
                </div>
              </div>

              {/* Chat */}
              <div className="flex flex-col gap-2 bg-[#0b1418] px-3 py-3" style={{ minHeight: 'clamp(280px, 45vw, 380px)' }}>

                {/* Time separator */}
                <div className="msg-animate msg-animate-1 self-center rounded-full bg-white/5 px-3 py-0.5 text-[10px] text-white/25">
                  HOY 10:23
                </div>

                {/* User sends photo */}
                <div className="msg-animate msg-animate-2 self-end">
                  <div className="overflow-hidden rounded-xl rounded-br-none bg-[#005c4b] max-w-[200px]">
                    {/* Fake image thumbnail */}
                    <div className="relative flex h-20 w-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white/40">
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <span className="absolute bottom-1.5 right-2 text-[9px] text-white/40">factura.jpg</span>
                    </div>
                    <div className="flex items-center justify-between px-2.5 py-1.5">
                      <span className="text-[10px] text-white/60">compra</span>
                      <span className="text-[9px] text-white/30">10:23 ✓✓</span>
                    </div>
                  </div>
                </div>

                {/* Bot typing */}
                <div className="msg-animate msg-animate-3 self-start">
                  <div className="flex items-center gap-1 rounded-xl rounded-bl-none bg-[#1f2c34] px-3 py-2.5">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>

                {/* Bot — data extracted */}
                <div className="msg-animate msg-animate-4 self-start">
                  <div className="rounded-xl rounded-bl-none bg-[#1f2c34] px-3 py-2.5 max-w-[235px]">
                    <div className="mb-2 flex items-center gap-1.5">
                      <span className="text-xs">📋</span>
                      <span className="text-xs font-semibold text-verde-400">Factura detectada</span>
                    </div>
                    <div className="space-y-1 text-[11px] leading-relaxed">
                      <div className="flex justify-between gap-3">
                        <span className="text-white/40">Proveedor</span>
                        <span className="font-medium text-white">Farmacity SA</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-white/40">Total</span>
                        <span className="font-bold text-verde-300">$4.850,00</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-white/40">CUIT</span>
                        <span className="font-mono text-[10px] text-white/70">30-71002829-4</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-white/40">Tipo</span>
                        <span className="text-white/80">Factura A</span>
                      </div>
                      <div className="mt-1.5 border-t border-white/8 pt-1.5 text-white/50">
                        ¿Registro como <span className="font-semibold text-white/70">compra</span>?
                      </div>
                    </div>
                    <div className="mt-1.5 text-right text-[9px] text-white/20">10:24 ✓✓</div>
                  </div>
                </div>

                {/* User confirms */}
                <div className="msg-animate msg-animate-5 self-end">
                  <div className="rounded-xl rounded-br-none bg-[#005c4b] px-3.5 py-2 text-sm font-medium text-white">
                    sí
                    <span className="ml-2 text-[9px] text-white/35">10:24 ✓✓</span>
                  </div>
                </div>

                {/* Bot — confirmed */}
                <div className="msg-animate msg-animate-6 self-start">
                  <div className="rounded-xl rounded-bl-none bg-[#1f2c34] px-3 py-2.5 max-w-[230px]">
                    <div className="text-xs text-white leading-relaxed">
                      ✅ <span className="font-semibold">Factura guardada</span>
                      <div className="mt-1 text-[10px] text-white/45">
                        Farmacity SA · $4.850,00 ARS<br />
                        Compra · 29 Abr 2026 · AFIP ✓
                      </div>
                    </div>
                    <div className="mt-1 text-right text-[9px] text-white/20">10:24 ✓✓</div>
                  </div>
                </div>

              </div>
            </div>

            {/* Decorative orbs */}
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-dorado-500/20 blur-2xl" />
            <div className="absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-verde-500/25 blur-2xl" />
          </div>
        </div>
      </div>

      {/* Bottom fade to crema */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-crema to-transparent" />
    </section>
  );
}
