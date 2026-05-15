import type { ReactNode } from "react";

// ────────────────────────────────────────────────────────────────────────
// CATÁLOGO DE AGENTES
// ────────────────────────────────────────────────────────────────────────
// Para sumar un agente nuevo:
//   1. Agregalo al array AGENTES de abajo.
//   2. Si está activo, creá su página en app/servicios/<slug>/page.tsx.
//   3. Si está "Próximamente", marcá comingSoon: true y NO crees página.
//   4. Sumá la ruta a app/sitemap.ts cuando salga.
// ────────────────────────────────────────────────────────────────────────

type Feature = {
  icon: string | ReactNode;
  titulo: string;
  desc: string;
};

type Agente = {
  slug: string;
  emoji: string;
  nombre: string;
  subtitulo: string;
  descripcionCorta: string;
  features: Feature[];
  ctaLabel: string;
  ctaHref: string;
  footerNote: string;
  comingSoon?: boolean;
};

const IcoRI = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-verde-600">
    <circle cx="9" cy="9" r="2.2" />
    <circle cx="15" cy="15" r="2.2" />
    <path d="M16 8L8 16" />
  </svg>
);

const IcoResumen = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-verde-600">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <line x1="9" y1="10" x2="9" y2="10" strokeWidth="2.5" />
    <line x1="13" y1="10" x2="13" y2="10" strokeWidth="2.5" />
    <line x1="17" y1="10" x2="17" y2="10" strokeWidth="2.5" />
  </svg>
);

const AGENTES: Agente[] = [
  {
    slug: "contable",
    emoji: "🧾",
    nombre: "Agente Contable",
    subtitulo: "Facturación · AFIP · Registros",
    descripcionCorta:
      "Digitaliza tus facturas desde WhatsApp, las valida con AFIP y te da un panel con métricas, todo sin abrir planillas.",
    features: [
      { icon: "📸", titulo: "Foto por WhatsApp", desc: "Mandás la imagen de la factura sin abrir ninguna app extra." },
      { icon: "🤖", titulo: "Extracción con IA", desc: "Detecta proveedor, CUIT, monto, fecha, tipo y alícuotas de IVA en segundos." },
      { icon: "🏛️", titulo: "Validación AFIP", desc: "Cruza el CUIT del emisor contra el padrón oficial automáticamente." },
      { icon: "📄", titulo: "PDF de Factura C", desc: "Genera el comprobante con QR oficial y te lo manda por WhatsApp." },
      { icon: "📊", titulo: "Panel con métricas", desc: "Totales del período, alerta de tope para monotributistas y posición de IVA para RI." },
      { icon: <IcoRI />, titulo: "Responsable Inscripto", desc: "Discrimina IVA al 21%, 10,5% y 27% y calcula tu posición mensual." },
      { icon: "📥", titulo: "Export para contador", desc: "Descargá el CSV del mes con un click y mandáselo directo." },
      { icon: <IcoResumen />, titulo: "Resumen por WhatsApp", desc: "Mandá 'resumen' al agente y recibís los totales del mes al instante." },
    ],
    ctaLabel: "Quiero probarlo →",
    ctaHref: "/servicios/facturacion",
    footerNote: "Disponible ya · Sin contratos · Cancelá cuando quieras",
  },
  {
    slug: "atencion",
    emoji: "💬",
    nombre: "Asistente de Atención",
    subtitulo: "Ventas · Soporte · Captura de leads",
    descripcionCorta:
      "Un bot de WhatsApp con la personalidad de tu negocio. Atiende, asesora y captura leads 24/7, con tu catálogo como base.",
    features: [
      { icon: "🎭", titulo: "Habla con tu tono", desc: "Definís personalidad, reglas y vocabulario. Suena como vos, no como un robot." },
      { icon: "📚", titulo: "Consulta tu catálogo", desc: "Conectado a un Google Doc tuyo: servicios, precios, info del negocio." },
      { icon: "🤖", titulo: "IA con razonamiento", desc: "Entiende contexto, no se inventa cosas y deriva a una persona cuando hace falta." },
      { icon: "📥", titulo: "Captura leads", desc: "Guarda los contactos interesados en un Google Sheet con todo el contexto." },
      { icon: "🎙️", titulo: "Entiende audios", desc: "Los clientes que mandan notas de voz también son atendidos. Whisper transcribe en segundos." },
      { icon: "🛡️", titulo: "Filtros y guardrails", desc: "Bloquea contenido inapropiado y nunca expone datos sensibles." },
      { icon: "🔑", titulo: "BYOK", desc: "Corre con tu propia API key de OpenAI o Anthropic. Costos transparentes." },
      { icon: "🚀", titulo: "Hosting en Railway", desc: "Lo desplegamos en tu cuenta de Railway. Controlás vos." },
    ],
    ctaLabel: "Solicitar mi agente →",
    ctaHref: "/servicios/atencion",
    footerNote: "Servicio a medida · Cotización en 24hs · BYOK",
  },
];

// ────────────────────────────────────────────────────────────────────────
// SECTION
// ────────────────────────────────────────────────────────────────────────

export function Servicios() {
  return (
    <section id="servicios" className="bg-crema px-4 py-24">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center">
          <span className="inline-block rounded-full border border-oscuro/10 bg-oscuro/5 px-4 py-1 text-[11px] font-semibold uppercase tracking-widest text-oscuro/40">
            Agentes disponibles
          </span>
          <h2 className="mt-4 font-display text-4xl font-bold text-oscuro md:text-5xl">
            Un agente para cada parte<br className="hidden sm:block" /> de tu negocio
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-slate-500">
            Cada agente está pensado para una tarea concreta. Elegís el que necesitás, lo configuramos para vos y empieza a trabajar.
          </p>
        </div>

        {/* Lista de agentes */}
        <div className="mt-14 space-y-8">
          {AGENTES.map((a) => (
            <AgenteCard key={a.slug} agente={a} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// AgenteCard — card reusable
// ────────────────────────────────────────────────────────────────────────

function AgenteCard({ agente }: { agente: Agente }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-oscuro to-[#1a271a] px-6 py-5 sm:px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-verde-500/20 text-2xl ring-1 ring-verde-500/30">
            {agente.emoji}
          </div>
          <div>
            <div className="font-display text-xl font-bold text-white">{agente.nombre}</div>
            <div className="mt-0.5 text-sm text-white/50">{agente.subtitulo}</div>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
            agente.comingSoon
              ? "bg-dorado-400/15 text-dorado-400 ring-dorado-400/30"
              : "bg-verde-500/20 text-verde-400 ring-verde-500/30"
          }`}
        >
          {agente.comingSoon ? "● Próximamente" : "● Disponible"}
        </span>
      </div>

      {/* Descripción corta */}
      <p className="border-b border-slate-100 px-6 py-5 text-sm leading-relaxed text-slate-500 sm:px-8">
        {agente.descripcionCorta}
      </p>

      {/* Features grid */}
      <div className="grid grid-cols-1 gap-px bg-slate-100/80 sm:grid-cols-2 lg:grid-cols-4">
        {agente.features.map((f) => (
          <div
            key={f.titulo}
            className="flex items-start gap-3 bg-white p-5 transition-colors hover:bg-slate-50/70 sm:p-6"
          >
            <span className="mt-0.5 shrink-0 text-xl leading-none">{f.icon}</span>
            <div>
              <div className="font-display text-sm font-bold text-oscuro">{f.titulo}</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-slate-500">{agente.footerNote}</p>
          {agente.comingSoon ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-400">
              En camino
            </span>
          ) : (
            <a
              href={agente.ctaHref}
              className="inline-flex items-center gap-2 rounded-full bg-verde-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-verde-900/20 transition-colors hover:bg-verde-500"
            >
              {agente.ctaLabel}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
