import type { Metadata } from "next";

import { ContratacionForm } from "@/components/forms/ContratacionForm";
import { Footer } from "@/components/sections/Footer";
import { Navbar } from "@/components/sections/Navbar";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://propio-ia-landing.vercel.app";

export const metadata: Metadata = {
  title: "Asistente de Atención al Cliente",
  description:
    "Un bot de WhatsApp con IA que atiende, asesora y captura leads en tu nombre 24/7. Personalizado para tu negocio, con tu catálogo y tu tono.",
  alternates: { canonical: `${SITE_URL}/servicios/atencion` },
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "PropioIA",
    title: "Asistente de Atención al Cliente — PropioIA",
    description:
      "Bot de WhatsApp con IA personalizado para tu negocio. Atiende, asesora y captura leads 24/7.",
    url: `${SITE_URL}/servicios/atencion`,
  },
};

export default function AsistenteAtencionPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <ComoTrabaja />
        <CasosDeUso />
        <Entregables />
        <Proceso />
        <Contratacion />
        <FAQAtencion />
      </main>
      <Footer />
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
      <div className="pointer-events-none absolute left-1/4 top-0 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-verde-600/15 blur-[140px]" />
      <div className="pointer-events-none absolute right-0 top-1/2 h-[300px] w-[300px] -translate-y-1/2 rounded-full bg-dorado-600/8 blur-[100px]" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 lg:flex-row lg:items-center lg:gap-12">
        {/* ── Left ── */}
        <div className="flex-1 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-verde-600/30 bg-verde-600/10 px-4 py-1.5 text-xs font-medium tracking-wide text-verde-400">
            <span className="h-1.5 w-1.5 animate-pulse2 rounded-full bg-verde-400" />
            Servicio a medida · BYOK
          </div>

          <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
            Tu vendedor{" "}
            <span className="relative whitespace-nowrap">
              <span className="relative z-10 text-verde-400">24/7</span>
              <span className="absolute -inset-x-2 -inset-y-1 -z-10 rounded-xl bg-verde-600/15 blur-sm" />
            </span>{" "}
            en WhatsApp
          </h1>

          <p className="mx-auto mt-6 max-w-[500px] text-base leading-relaxed text-white/55 lg:mx-0 lg:text-lg">
            Un asistente de IA que conoce tu negocio, atiende a tus clientes con tu tono, consulta tu catálogo y te avisa cuando hay un lead caliente. Mientras vos hacés otra cosa.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
            <a
              href="#contratar"
              className="group rounded-full bg-verde-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-verde-900/50 transition-all hover:bg-verde-500"
            >
              Solicitar mi agente
              <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
            </a>
            <a
              href="#casos-de-uso"
              className="rounded-full border border-white/15 px-7 py-3.5 text-sm font-medium text-white/60 transition-colors hover:border-white/30 hover:text-white"
            >
              Ver casos de uso
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-4 sm:gap-x-8 lg:justify-start">
            {[
              { value: "24/7", label: "respondiendo" },
              { value: "Tu catálogo", label: "como base" },
              { value: "BYOK", label: "tu API key" },
            ].map((s) => (
              <div key={s.label} className="text-center lg:text-left">
                <div className="font-display text-xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-white/35">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right — mockup conversacional ── */}
        <div className="flex flex-1 items-center justify-center lg:justify-end">
          <div className="relative w-full max-w-[320px] animate-float">
            <div className="absolute -inset-4 rounded-[3rem] bg-verde-600/10 blur-xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#111b21] shadow-2xl shadow-black/70">
              <div className="flex items-center justify-between bg-[#111b21] px-4 pt-3 pb-1">
                <span className="text-[10px] text-white/30">9:41</span>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-3 rounded-sm bg-white/30" />
                  <div className="h-1.5 w-1.5 rounded-full border border-white/30" />
                </div>
              </div>

              {/* Header WA */}
              <div className="flex items-center gap-3 bg-[#1f2c34] px-4 py-2.5">
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-verde-500 to-verde-700 font-bold text-white text-xs shadow-md">
                  S
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-verde-400 ring-2 ring-[#1f2c34]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white leading-none">Sofia · Viajes y Turismo</div>
                  <div className="mt-0.5 text-[10px] text-verde-400">● en línea</div>
                </div>
              </div>

              {/* Chat */}
              <div className="flex flex-col gap-2 bg-[#0b1418] px-3 py-3" style={{ minHeight: "clamp(280px, 45vw, 400px)" }}>
                <div className="msg-animate msg-animate-1 self-center rounded-full bg-white/5 px-3 py-0.5 text-[10px] text-white/25">
                  HOY 14:08
                </div>

                {/* Cliente */}
                <div className="msg-animate msg-animate-2 self-end max-w-[230px]">
                  <div className="rounded-xl rounded-br-none bg-[#005c4b] px-3.5 py-2 text-[13px] text-white">
                    Hola! Estoy mirando algo para Brasil en febrero, ¿qué tienen?
                    <span className="ml-2 text-[9px] text-white/35">14:08 ✓✓</span>
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

                {/* Bot 1 */}
                <div className="msg-animate msg-animate-4 self-start max-w-[245px]">
                  <div className="rounded-xl rounded-bl-none bg-[#1f2c34] px-3 py-2.5 text-[13px] leading-relaxed text-white/90">
                    ¡Hola! Soy Sofia 👋 Bienvenido a Viajes y Turismo. ¿Cómo te llamás?
                    <div className="mt-1 text-right text-[9px] text-white/20">14:08 ✓✓</div>
                  </div>
                </div>

                {/* Cliente 2 */}
                <div className="msg-animate msg-animate-5 self-end max-w-[180px]">
                  <div className="rounded-xl rounded-br-none bg-[#005c4b] px-3.5 py-2 text-[13px] text-white">
                    Lucas, somos 2 adultos
                    <span className="ml-2 text-[9px] text-white/35">14:09 ✓✓</span>
                  </div>
                </div>

                {/* Bot 2 (con tool call simulado) */}
                <div className="msg-animate msg-animate-6 self-start max-w-[245px]">
                  <div className="rounded-xl rounded-bl-none bg-[#1f2c34] px-3 py-2.5 text-[13px] leading-relaxed text-white/90">
                    Genial Lucas! Tengo varios paquetes a Brasil para febrero. Para orientarme mejor, ¿tenés pensado un presupuesto aproximado por persona?
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-verde-400">
                      <span>📋</span>
                      <span>Consultado catálogo · Lead guardado</span>
                    </div>
                    <div className="mt-1 text-right text-[9px] text-white/20">14:09 ✓✓</div>
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
// CÓMO TRABAJA
// ────────────────────────────────────────────────────────────────────────

function ComoTrabaja() {
  const items = [
    {
      icon: "🎭",
      titulo: "Habla con tu tono",
      desc: "Definís la personalidad: cálida y cercana, formal, técnica. El bot se comporta como vos quieras, no como un robot genérico.",
    },
    {
      icon: "📚",
      titulo: "Consulta tu catálogo",
      desc: "Conectado a un Google Doc tuyo (servicios, precios, info del negocio). Nunca inventa: si no está en el catálogo, lo dice.",
    },
    {
      icon: "📥",
      titulo: "Captura leads",
      desc: "Cuando un cliente muestra interés real, guarda nombre, contacto y contexto en un Google Sheet. Tu equipo lo retoma desde ahí.",
    },
  ];

  return (
    <section className="bg-crema px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <span className="inline-block rounded-full bg-oscuro/5 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-oscuro/50">
            Cómo trabaja con vos
          </span>
          <h2 className="mt-4 font-display text-4xl font-bold text-oscuro md:text-5xl">
            Como un empleado nuevo,<br className="hidden sm:block" /> pero más rápido
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-500">
            Le mostrás cómo querés que hable y qué tiene que saber. Listo: empieza a atender solo.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {items.map((it) => (
            <div
              key={it.titulo}
              className="card-glow rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-verde-50 text-2xl ring-1 ring-verde-100">
                {it.icon}
              </div>
              <h3 className="mt-5 font-display text-lg font-bold text-oscuro">{it.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// CASOS DE USO
// ────────────────────────────────────────────────────────────────────────

function CasosDeUso() {
  const casos = [
    {
      icon: "✈️",
      rubro: "Agencia de viajes",
      ejemplo:
        "Sofia atiende consultas de destinos, recomienda paquetes según presupuesto y guarda los leads para que el equipo de ventas los retome.",
    },
    {
      icon: "🔧",
      rubro: "Taller mecánico",
      ejemplo:
        "Juan responde por horarios, precios de servicios comunes (cambio de aceite, alineación) y agenda turnos sin pasar por el teléfono.",
    },
    {
      icon: "🏠",
      rubro: "Inmobiliaria",
      ejemplo:
        "Carla filtra consultas, manda fichas de propiedades disponibles y captura los datos de quien quiere visitar.",
    },
    {
      icon: "🍕",
      rubro: "Restaurante / Delivery",
      ejemplo:
        "Toma pedidos, responde el menú del día, gestiona reservas y deriva las quejas a una persona real cuando hace falta.",
    },
  ];

  return (
    <section id="casos-de-uso" className="bg-oscuro px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <span className="inline-block rounded-full border border-verde-600/30 bg-verde-600/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-verde-400">
            Casos de uso
          </span>
          <h2 className="mt-4 font-display text-4xl font-bold text-white md:text-5xl">
            Para cualquier negocio<br className="hidden sm:block" /> que atiende por WhatsApp
          </h2>
          <p className="mx-auto mt-4 max-w-md text-white/50">
            El mismo agente, adaptado a tu rubro. Algunos ejemplos:
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {casos.map((c) => (
            <div
              key={c.rubro}
              className="group rounded-2xl border border-white/8 bg-white/5 p-6 transition-all duration-300 hover:border-verde-600/40 hover:bg-white/8"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{c.icon}</span>
                <h3 className="font-display text-lg font-bold text-white">{c.rubro}</h3>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-white/55">{c.ejemplo}</p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-lg text-center text-sm text-white/40">
          ¿No ves tu rubro? Igual lo armamos. Si tu negocio se maneja por WhatsApp, sirve.
        </p>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// QUÉ TE ENTREGAMOS
// ────────────────────────────────────────────────────────────────────────

function Entregables() {
  const entregables = [
    "Bot de WhatsApp configurado con tu personalidad y reglas",
    "Google Doc con tu catálogo (servicios / precios / info del negocio) editable por vos",
    "Google Sheet con CRM de leads capturados por el bot",
    "Integración con tu número de WhatsApp Business",
    "Hosting en Railway (cuenta tuya, controlás todo)",
    "Soporte por WhatsApp durante las primeras 2 semanas",
  ];

  return (
    <section className="bg-crema px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <span className="inline-block rounded-full bg-oscuro/5 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-oscuro/50">
            Qué te entregamos
          </span>
          <h2 className="mt-4 font-display text-4xl font-bold text-oscuro md:text-5xl">
            Todo listo para funcionar
          </h2>
        </div>

        <ul className="mx-auto mt-12 max-w-2xl space-y-3">
          {entregables.map((e) => (
            <li
              key={e}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4"
            >
              <svg
                className="mt-0.5 h-5 w-5 shrink-0 text-verde-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-sm leading-relaxed text-slate-700">{e}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// PROCESO
// ────────────────────────────────────────────────────────────────────────

function Proceso() {
  const pasos = [
    {
      n: "01",
      emoji: "📋",
      titulo: "Llenás el formulario",
      desc: "Nos contás de tu negocio, qué querés que haga el bot y cómo querés que hable. Tres minutos.",
      detalle: "Sin tarjeta, sin compromiso",
    },
    {
      n: "02",
      emoji: "💬",
      titulo: "Coordinamos por WhatsApp",
      desc: "Te escribimos en menos de 24hs para afinar detalles, mostrarte un demo y pasarte el presupuesto exacto.",
      detalle: "Cotización a medida",
    },
    {
      n: "03",
      emoji: "🔑",
      titulo: "Vos traés tu API key (BYOK)",
      desc: "El bot corre con tu propia API key de OpenAI/Anthropic. Costos transparentes, controlás vos lo que se consume.",
      detalle: "Sin margen oculto",
    },
    {
      n: "04",
      emoji: "🚀",
      titulo: "Lo armamos y desplegamos",
      desc: "Configuramos el bot, lo subimos a Railway con tu cuenta y lo conectamos a tu WhatsApp Business. En 3-5 días hábiles está activo.",
      detalle: "Hosting en tu cuenta",
    },
  ];

  return (
    <section className="bg-oscuro px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <span className="inline-block rounded-full border border-verde-600/30 bg-verde-600/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-verde-400">
            Cómo es el proceso
          </span>
          <h2 className="mt-4 font-display text-4xl font-bold text-white md:text-5xl">
            Del formulario al bot funcionando<br className="hidden sm:block" /> en menos de una semana
          </h2>
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
// FORM DE CONTRATACIÓN
// ────────────────────────────────────────────────────────────────────────

function Contratacion() {
  return (
    <section id="contratar" className="relative overflow-hidden bg-crema px-4 py-24">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-verde-50 via-crema to-dorado-400/10" />

      <div className="relative mx-auto max-w-3xl">
        <div className="text-center">
          <span className="inline-block rounded-full bg-oscuro/5 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-oscuro/50">
            Contratar mi agente
          </span>
          <h2 className="mt-4 font-display text-4xl font-bold text-oscuro md:text-5xl">
            Contanos tu idea
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-500">
            Tres minutos. Te respondemos por WhatsApp o mail con un demo y el presupuesto exacto para tu caso.
          </p>
        </div>

        <div className="mt-12">
          <ContratacionForm />
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// FAQ
// ────────────────────────────────────────────────────────────────────────

function FAQAtencion() {
  const preguntas = [
    {
      q: "¿Cuánto sale?",
      a: "Cotizamos según el alcance: cuán grande es tu catálogo, cuántas tools necesita el bot (ej. agendar turnos, consultar stock), volumen estimado de mensajes. Después de que llenás el formulario te pasamos el número exacto.",
    },
    {
      q: "¿Qué es BYOK?",
      a: "Bring Your Own Key. La IA del bot corre con tu propia API key de OpenAI o Anthropic. Pagás los tokens que consumís directo al proveedor — sin margen nuestro encima. Para un negocio chico arranca en USD 5-15 por mes.",
    },
    {
      q: "¿Cuánto tarda el setup?",
      a: "Entre 3 y 5 días hábiles desde que confirmamos el alcance, dependiendo de la complejidad. Si el catálogo es simple y no necesitás integraciones raras, suele estar en 3.",
    },
    {
      q: "¿Puedo editar el prompt después?",
      a: "Sí. El catálogo (Google Doc) lo editás vos cuando quieras y el bot lee la versión nueva a la siguiente consulta. Para cambios en la personalidad del bot, nos avisás y lo ajustamos sin costo extra durante las primeras 2 semanas.",
    },
    {
      q: "¿Necesito cambiar mi número de WhatsApp?",
      a: "No. El bot se enchufa a tu WhatsApp Business actual usando Evolution API. Tu número sigue siendo el mismo y los chats existentes no se tocan.",
    },
    {
      q: "¿Quién hostea el bot?",
      a: "Vos, en Railway. Te ayudamos a crear la cuenta con tu mail, desplegamos ahí y te entregamos los accesos. Controlás los costos de hosting (arranca en USD 5/mes) y podés bajar el bot cuando quieras sin depender de nosotros.",
    },
    {
      q: "¿Qué pasa si necesito una funcionalidad nueva después?",
      a: "Hablamos. Algunas cosas (ajustar el tono, agregar reglas) se hacen rápido y sin costo extra durante el período de soporte. Funcionalidades nuevas (ej. agregar agendar turnos a un bot que solo vendía) las cotizamos aparte.",
    },
  ];

  return (
    <section className="bg-oscuro px-4 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="inline-block rounded-full border border-verde-600/30 bg-verde-600/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-verde-400">
            FAQ
          </span>
          <h2 className="mt-4 font-display text-4xl font-bold text-white md:text-5xl">
            Preguntas frecuentes
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {preguntas.map((p) => (
            <details
              key={p.q}
              className="group overflow-hidden rounded-xl border border-white/8 bg-white/5 backdrop-blur-sm transition-all hover:border-verde-600/30"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-base font-semibold text-white">
                {p.q}
                <svg
                  className="faq-chevron h-4 w-4 shrink-0 text-verde-400"
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
              <p className="px-5 pb-4 text-sm leading-relaxed text-white/50">{p.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
