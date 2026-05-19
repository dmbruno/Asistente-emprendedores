import type { Metadata } from "next";
import { FooterProducto } from "@/components/sections/FooterProducto";
import { NavbarProducto } from "@/components/sections/NavbarProducto";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://propio-ia-landing.vercel.app";

const DASHBOARD_URL = "https://cotizador-viajes-xi.vercel.app";

export const metadata: Metadata = {
  title: "Cotizador de Viajes — Cotizá viajes con IA en minutos",
  description:
    "Describís el viaje, la IA busca vuelos y hoteles reales, y generás una cotización profesional lista para enviar. Para agencias y agentes de turismo.",
  alternates: { canonical: `${SITE_URL}/servicios/cotizador` },
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "PropioIA",
    title: "Cotizador de Viajes — PropioIA",
    description:
      "Agente IA para agencias de viajes. Cotizá vuelos + hoteles reales y enviá presupuestos profesionales en minutos.",
    url: `${SITE_URL}/servicios/cotizador`,
  },
};

export default function TravelQuoterPage() {
  return (
    <>
      <NavbarProducto />
      <main>
        <Hero />
        <ParaQuien />
        <ComoFunciona />
        <Features />
        <Modelo />
        <FAQCotizador />
        <CTA />
      </main>
      <FooterProducto />
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────
// HERO
// ────────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden bg-oscuro bg-grid pt-28 pb-20 sm:pt-32 sm:pb-24">
      {/* Glows */}
      <div className="pointer-events-none absolute left-1/4 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-verde-600/15 blur-[140px]" />
      <div className="pointer-events-none absolute right-0 top-1/2 h-[350px] w-[350px] -translate-y-1/2 rounded-full bg-dorado-600/8 blur-[100px]" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-12 px-4 lg:flex-row lg:items-center lg:gap-16">
        {/* ── Left ── */}
        <div className="flex-1 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-verde-600/30 bg-verde-600/10 px-4 py-1.5 text-xs font-medium tracking-wide text-verde-400">
            <span className="h-1.5 w-1.5 animate-pulse2 rounded-full bg-verde-400" />
            Agente IA para turismo · BYOK
          </div>

          <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
            Cotizá viajes{" "}
            <span className="relative whitespace-nowrap">
              <span className="relative z-10 text-verde-400">en minutos</span>
              <span className="absolute -inset-x-2 -inset-y-1 -z-10 rounded-xl bg-verde-600/15 blur-sm" />
            </span>
            {" "}con IA
          </h1>

          <p className="mx-auto mt-6 max-w-[500px] text-base leading-relaxed text-white/55 lg:mx-0 lg:text-lg">
            Describís el viaje en lenguaje natural. La IA busca vuelos y hoteles reales, armás la cotización y la mandás por email al cliente. Sin planillas, sin copiar precios a mano.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
            <a
              href={DASHBOARD_URL}
              className="group rounded-full bg-verde-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-verde-900/50 transition-all hover:bg-verde-500"
            >
              Empezar gratis
              <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
            </a>
            <a
              href="#como-funciona"
              className="rounded-full border border-white/15 px-7 py-3.5 text-sm font-medium text-white/60 transition-colors hover:border-white/30 hover:text-white"
            >
              Ver cómo funciona
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-4 sm:gap-x-8 lg:justify-start">
            {[
              { value: "Vuelos reales", label: "Google Flights" },
              { value: "Hoteles reales", label: "Google Hotels" },
              { value: "BYOK", label: "tu API key de IA" },
            ].map((s) => (
              <div key={s.label} className="text-center lg:text-left">
                <div className="font-display text-lg font-bold text-white">{s.value}</div>
                <div className="text-xs text-white/35">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right — mockup de cotización ── */}
        <div className="flex flex-1 items-center justify-center lg:justify-end">
          <div className="relative w-full max-w-[360px] animate-float">
            <div className="absolute -inset-4 rounded-[3rem] bg-verde-600/10 blur-xl" />

            {/* Quote card mockup */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl shadow-black/70">
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-white/8 bg-[#161b22] px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-verde-500/20 ring-1 ring-verde-500/30 text-base">
                  ✈️
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">Cotización</div>
                  <div className="text-xs font-bold text-white">Viaje a Miami — Jul 2026</div>
                </div>
                <div className="ml-auto rounded-full bg-verde-500/20 px-2 py-0.5 text-[10px] font-semibold text-verde-400 ring-1 ring-verde-500/30">
                  Lista
                </div>
              </div>

              {/* Chat area */}
              <div className="flex flex-col gap-2.5 px-3 py-3">
                {/* User */}
                <div className="msg-animate msg-animate-1 self-end max-w-[260px]">
                  <div className="rounded-xl rounded-br-none bg-verde-600/80 px-3 py-2 text-[12px] leading-relaxed text-white">
                    Buenos Aires → Miami, 20/7, 7 noches, 2 adultos
                    <div className="mt-0.5 text-right text-[9px] text-white/40">10:22</div>
                  </div>
                </div>

                {/* Thinking */}
                <div className="msg-animate msg-animate-2 self-start">
                  <div className="flex items-center gap-1 rounded-xl rounded-bl-none bg-white/5 px-3 py-2.5">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>

                {/* Quote card result */}
                <div className="msg-animate msg-animate-3 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                  <div className="border-b border-white/8 px-3.5 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">✈️ Vuelo</span>
                      <span className="font-display text-sm font-bold text-verde-400">USD 892</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-white/70">LATAM · EZE→MIA · 20/7 · Directo</div>
                  </div>
                  <div className="border-b border-white/8 px-3.5 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">🏨 Hotel</span>
                      <span className="font-display text-sm font-bold text-verde-400">USD 1.540</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-white/70">Grand Hyatt Miami · 7 noches · ★★★★★</div>
                  </div>
                  <div className="px-3.5 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white">Total estimado</span>
                      <span className="font-display text-base font-extrabold text-verde-400">USD 2.432</span>
                    </div>
                  </div>
                </div>

                {/* Send button */}
                <div className="msg-animate msg-animate-4 self-start max-w-[260px]">
                  <div className="rounded-xl rounded-bl-none bg-white/5 px-3 py-2.5 text-[12px] leading-relaxed text-white/80">
                    Cotización lista. ¿La enviamos a tu email?
                    <div className="mt-2 flex gap-2">
                      <span className="rounded-full bg-verde-600 px-3 py-1 text-[10px] font-semibold text-white">Enviar →</span>
                      <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-medium text-white/50">Modificar</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-dorado-500/20 blur-2xl" />
            <div className="absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-verde-500/25 blur-2xl" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-crema to-transparent" />
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// PARA QUIÉN
// ────────────────────────────────────────────────────────────────────────

function ParaQuien() {
  const perfiles = [
    {
      titulo: "Agencias de viajes",
      icon: "🏢",
      desc: "Receptivas, mayoristas o minoristas que manejan múltiples consultas por día. El agente las procesa en paralelo y reduce el tiempo de respuesta de horas a minutos.",
      highlights: [
        "Múltiples cotizaciones simultáneas",
        "Historial de consultas por sesión",
        "Email profesional con un click",
      ],
    },
    {
      titulo: "Agentes independientes",
      icon: "🧳",
      desc: "Profesionales que trabajan solos y necesitan eficiencia. Configurás tu API key una sola vez y el agente hace el trabajo pesado de buscar precios y armar presupuestos.",
      highlights: [
        "Setup en menos de 5 minutos",
        "Sin personal extra necesario",
        "Costo de IA directamente con el proveedor",
      ],
    },
  ];

  return (
    <section className="bg-crema px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <span className="inline-block rounded-full border border-oscuro/10 bg-oscuro/5 px-4 py-1 text-[11px] font-semibold uppercase tracking-widest text-oscuro/40">
            Para quién es
          </span>
          <h2 className="mt-4 font-display text-4xl font-bold text-oscuro md:text-5xl">
            Pensado para el sector turismo
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-500">
            Tanto si manejás decenas de consultas por día como si trabajás solo, el flujo se adapta a tu ritmo.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
          {perfiles.map((p) => (
            <div
              key={p.titulo}
              className="card-glow rounded-2xl border border-slate-200 bg-white p-7 transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{p.icon}</span>
                <h3 className="font-display text-xl font-bold text-oscuro">{p.titulo}</h3>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-500">{p.desc}</p>
              <ul className="mt-5 space-y-2">
                {p.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm text-slate-700">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-verde-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// CÓMO FUNCIONA
// ────────────────────────────────────────────────────────────────────────

function ComoFunciona() {
  const pasos = [
    {
      n: "01",
      emoji: "💬",
      titulo: "Describís el viaje",
      desc: "Le contás al agente el destino, fechas, cantidad de pasajeros y cualquier preferencia. En lenguaje natural, como le hablarías a un colega.",
      detalle: "Sin formularios estructurados",
    },
    {
      n: "02",
      emoji: "🔍",
      titulo: "La IA busca opciones reales",
      desc: "El agente consulta Google Flights y Google Hotels en tiempo real. Te presenta las mejores opciones con precios actualizados, sin datos inventados.",
      detalle: "Vuelos y hoteles verificados",
    },
    {
      n: "03",
      emoji: "📋",
      titulo: "Elegís y cotizás",
      desc: "Seleccionás la combinación de vuelo + hotel que mejor se ajusta al cliente. El agente arma la cotización completa con el total del paquete.",
      detalle: "Cotización en un solo paso",
    },
    {
      n: "04",
      emoji: "📧",
      titulo: "Enviás por email",
      desc: "Con un solo mensaje le pedís al agente que envíe la cotización. El cliente recibe un email profesional con todos los detalles del viaje.",
      detalle: "Email automático al cliente",
    },
  ];

  return (
    <section id="como-funciona" className="bg-oscuro px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <span className="inline-block rounded-full border border-verde-600/30 bg-verde-600/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-verde-400">
            Cómo funciona
          </span>
          <h2 className="mt-4 font-display text-4xl font-bold text-white md:text-5xl">
            Del pedido del cliente<br className="hidden sm:block" /> al presupuesto enviado
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white/50">
            Cuatro pasos. El agente hace el trabajo pesado; vos tomás las decisiones.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {pasos.map((p) => (
            <div
              key={p.n}
              className="group relative rounded-2xl border border-white/8 bg-white/5 p-6 transition-all duration-300 hover:border-verde-600/40 hover:bg-white/8"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-verde-600/30 bg-verde-600/10">
                  <span className="font-display text-sm font-bold text-verde-400">{p.n}</span>
                </div>
                <span className="text-2xl">{p.emoji}</span>
              </div>
              <h3 className="font-display text-lg font-bold text-white">{p.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{p.desc}</p>
              <div className="mt-4 inline-block rounded-full bg-verde-600/10 px-3 py-1 text-xs text-verde-400">
                {p.detalle}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// FEATURES
// ────────────────────────────────────────────────────────────────────────

function Features() {
  const features = [
    { icon: "✈️", titulo: "Vuelos reales", desc: "Busca en Google Flights con precios actualizados. Nada inventado ni desactualizado." },
    { icon: "🏨", titulo: "Hoteles reales", desc: "Consulta Google Hotels con disponibilidad, estrellas, ubicación y precio por noche." },
    { icon: "📧", titulo: "Email automático", desc: "El agente envía la cotización al cliente con un email profesional y detallado." },
    { icon: "🤖", titulo: "Multi-modelo", desc: "Elegís entre Claude (Anthropic), GPT-4o (OpenAI) o Gemini (Google) según tu preferencia." },
    { icon: "🔐", titulo: "BYOK", desc: "Traés tu propia API key. Los costos van directamente al proveedor que elegís, sin margen nuestro." },
    { icon: "📅", titulo: "Flexibilidad de fechas", desc: "El agente puede explorar fechas alternativas para encontrar el mejor precio del período." },
    { icon: "💬", titulo: "Chat conversacional", desc: "Cada consulta es una conversación. Podés modificar, pedir alternativas o ajustar el paquete." },
    { icon: "📂", titulo: "Historial de sesiones", desc: "Todas tus cotizaciones quedan guardadas por sesión. Retomás cualquier consulta cuando quieras." },
  ];

  return (
    <section className="bg-crema px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <span className="inline-block rounded-full border border-oscuro/10 bg-oscuro/5 px-4 py-1 text-[11px] font-semibold uppercase tracking-widest text-oscuro/40">
            Capacidades
          </span>
          <h2 className="mt-4 font-display text-4xl font-bold text-oscuro md:text-5xl">
            Todo lo que hace<br className="hidden sm:block" /> el Cotizador de Viajes
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-slate-500">
            Un agente que busca, compara, calcula y envía. Vos elegís la mejor opción para tu cliente.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.titulo}
              className="card-glow rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:border-verde-200"
            >
              <div className="text-2xl">{f.icon}</div>
              <h3 className="mt-3 font-display text-sm font-bold text-oscuro">{f.titulo}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// MODELO DE PRECIOS
// ────────────────────────────────────────────────────────────────────────

function Modelo() {
  return (
    <section className="bg-oscuro px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <span className="inline-block rounded-full border border-verde-600/30 bg-verde-600/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-verde-400">
            Modelo de precios
          </span>
          <h2 className="mt-4 font-display text-4xl font-bold text-white md:text-5xl">
            Pagás solo lo que usás
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white/50">
            Sin cuotas mensuales ocultas. La plataforma es gratuita; el costo de IA va directo al proveedor que elegís.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            {
              titulo: "Plataforma",
              precio: "Gratis",
              desc: "La app, el chat, el historial de sesiones y el envío de emails no tienen costo de suscripción.",
              items: ["Chat con el agente", "Historial de cotizaciones", "Envío de emails", "Múltiples modelos de IA"],
              destacado: false,
            },
            {
              titulo: "API de IA (BYOK)",
              precio: "~USD 0,01–0,10",
              sufijo: "por cotización",
              desc: "Traés tu propia API key de Anthropic, OpenAI o Google. Pagás directamente a ellos según el uso.",
              items: ["Claude Sonnet / Opus", "GPT-4o / GPT-4o mini", "Gemini Pro / Flash", "Vos controlás el gasto"],
              destacado: true,
            },
            {
              titulo: "Búsqueda de precios",
              precio: "Plataforma",
              desc: "La búsqueda en Google Flights y Hotels está cubierta por PropioIA. Sin costo extra para vos.",
              items: ["Google Flights en tiempo real", "Google Hotels con disponibilidad", "Sin límite de búsquedas", "Incluido en la plataforma"],
              destacado: false,
            },
          ].map((plan) => (
            <div
              key={plan.titulo}
              className={`rounded-2xl border p-6 ${
                plan.destacado
                  ? "border-verde-600/40 bg-verde-600/10"
                  : "border-white/8 bg-white/5"
              }`}
            >
              {plan.destacado && (
                <div className="mb-3 inline-block rounded-full bg-verde-600/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-verde-400">
                  Principal costo
                </div>
              )}
              <h3 className="font-display text-lg font-bold text-white">{plan.titulo}</h3>
              <div className="mt-2">
                <span className="font-display text-3xl font-extrabold text-white">{plan.precio}</span>
                {plan.sufijo && (
                  <span className="ml-1 text-sm text-white/40">{plan.sufijo}</span>
                )}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/50">{plan.desc}</p>
              <ul className="mt-5 space-y-2">
                {plan.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-white/70">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-verde-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// FAQ
// ────────────────────────────────────────────────────────────────────────

function FAQCotizador() {
  const preguntas = [
    {
      q: "¿Los precios de vuelos y hoteles son reales?",
      a: "Sí. El agente consulta Google Flights y Google Hotels en tiempo real. Los precios que muestra corresponden a lo que encontraría un usuario buscando en ese momento. Igual que siempre, los precios finales los confirma la aerolínea o el hotel al momento de reservar.",
    },
    {
      q: "¿Qué es BYOK y por qué funciona así?",
      a: "Bring Your Own Key. El agente de IA corre con tu propia API key de Anthropic, OpenAI o Google. Lo configurás una sola vez en la sección de Configuración. De esta forma los costos de IA van directamente al proveedor y vos tenés visibilidad total de lo que gastás.",
    },
    {
      q: "¿Cuánto me cuesta por cotización?",
      a: "Depende del modelo de IA que uses. Con Claude Haiku o GPT-4o mini una cotización completa (incluyendo la búsqueda y el email) sale entre USD 0,01 y USD 0,05. Con modelos más potentes como Claude Sonnet u Opus puede llegar a USD 0,10–0,20. La plataforma en sí no tiene costo.",
    },
    {
      q: "¿Puedo probar antes de poner mi API key?",
      a: "Podés crear una cuenta y explorar la interfaz. Para hacer cotizaciones reales necesitás configurar al menos una API key de LLM. La búsqueda de vuelos y hoteles (SerpAPI) está cubierta por la plataforma.",
    },
    {
      q: "¿El agente entiende el español argentino?",
      a: "Sí. El agente está configurado para entender fechas en formato argentino (15/8 = 15 de agosto), nombres de ciudades locales y variaciones del español rioplatense. Podés escribirle como le escribirías a un colega.",
    },
    {
      q: "¿Qué información incluye el email de cotización?",
      a: "El email al cliente incluye: nombre del pasajero, vuelo seleccionado (aerolínea, ruta, fecha, precio), hotel (nombre, noches, precio total) y el total del paquete. Todo con un diseño profesional listo para enviar.",
    },
  ];

  return (
    <section id="faq" className="bg-crema px-4 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="inline-block rounded-full border border-oscuro/10 bg-oscuro/5 px-4 py-1 text-[11px] font-semibold uppercase tracking-widest text-oscuro/40">
            FAQ
          </span>
          <h2 className="mt-4 font-display text-4xl font-bold text-oscuro md:text-5xl">
            Preguntas frecuentes
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {preguntas.map((p) => (
            <details
              key={p.q}
              className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-verde-200"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-oscuro">
                {p.q}
                <svg
                  className="faq-chevron h-4 w-4 shrink-0 text-verde-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <p className="px-5 pb-4 text-sm leading-relaxed text-slate-500">{p.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// CTA FINAL
// ────────────────────────────────────────────────────────────────────────

function CTA() {
  return (
    <section className="relative overflow-hidden bg-oscuro px-4 py-24">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-verde-600/10 blur-[120px]" />

      <div className="relative mx-auto max-w-2xl text-center">
        <span className="inline-block rounded-full border border-verde-600/30 bg-verde-600/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-verde-400">
          Empezar
        </span>
        <h2 className="mt-6 font-display text-4xl font-bold text-white md:text-5xl">
          Tu próxima cotización,<br className="hidden sm:block" /> en minutos
        </h2>
        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-white/50">
          Creá tu cuenta, configurá tu API key y empezá a cotizar viajes con precios reales. Sin planes de suscripción, sin compromiso.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href={DASHBOARD_URL}
            className="group rounded-full bg-verde-600 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-verde-900/50 transition-all hover:bg-verde-500"
          >
            Crear cuenta gratis
            <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
          </a>
          <a
            href="#faq"
            className="rounded-full border border-white/15 px-8 py-4 text-sm font-medium text-white/60 transition-colors hover:border-white/30 hover:text-white"
          >
            Ver preguntas frecuentes
          </a>
        </div>
        <p className="mt-6 text-xs text-white/30">
          Necesitás una API key de Anthropic, OpenAI o Google para usar el agente.
        </p>
      </div>
    </section>
  );
}
