import type { ReactNode } from "react";

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

type Feature = {
  icon: string | ReactNode;
  titulo: string;
  desc: string;
};

const FEATURES: Feature[] = [
  {
    icon: "📸",
    titulo: "Foto por WhatsApp",
    desc: "Mandás la imagen de la factura sin abrir ninguna app extra.",
  },
  {
    icon: "🤖",
    titulo: "Extracción con IA",
    desc: "Detecta proveedor, CUIT, monto, fecha, tipo y alícuotas de IVA en segundos.",
  },
  {
    icon: "🏛️",
    titulo: "Validación AFIP",
    desc: "Cruza el CUIT del emisor contra el padrón oficial automáticamente.",
  },
  {
    icon: "📄",
    titulo: "PDF de Factura C",
    desc: "Genera el comprobante con QR oficial y te lo manda por WhatsApp.",
  },
  {
    icon: "📊",
    titulo: "Panel con métricas",
    desc: "Totales del período, alerta de tope para monotributistas y posición de IVA para Responsables Inscriptos.",
  },
  {
    icon: <IcoRI />,
    titulo: "Responsable Inscripto",
    desc: "Discrimina IVA al 21%, 10,5% y 27% y calcula tu posición mensual entre débito y crédito fiscal automáticamente.",
  },
  {
    icon: "📥",
    titulo: "Export para contador",
    desc: "Descargá el CSV del mes con un click y mandáselo directo.",
  },
  {
    icon: <IcoResumen />,
    titulo: "Resumen por WhatsApp",
    desc: "Mandá 'resumen' al agente y recibís los totales del mes al instante, sin abrir el panel.",
  },
];

export function Servicios() {
  return (
    <section id="servicios" className="bg-crema px-4 py-24">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="text-center">
          <span className="inline-block rounded-full border border-oscuro/10 bg-oscuro/5 px-4 py-1 text-[11px] font-semibold uppercase tracking-widest text-oscuro/40">
            Agente disponible
          </span>
          <h2 className="mt-4 font-display text-4xl font-bold text-oscuro md:text-5xl">
            Todo lo que hace<br className="hidden sm:block" /> el Agente Contable
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-slate-500">
            Un asistente que digitaliza, valida y organiza tus facturas desde WhatsApp,
            sin que tengas que abrir ninguna planilla.
          </p>
        </div>

        {/* ── Featured agent: Contable ── */}
        <div className="mt-14 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          {/* Card header */}
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-oscuro to-[#1a271a] px-6 py-5 sm:px-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-verde-500/20 text-2xl ring-1 ring-verde-500/30">
                🧾
              </div>
              <div>
                <div className="font-display text-xl font-bold text-white">Agente Contable</div>
                <div className="mt-0.5 text-sm text-white/50">Facturación · AFIP · Registros</div>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-verde-500/20 px-3 py-1 text-xs font-semibold text-verde-400 ring-1 ring-verde-500/30">
              ● Disponible
            </span>
          </div>

          {/* Features grid — 4 columnas en desktop: 2 filas de 4, balanceado */}
          <div className="grid grid-cols-1 gap-px bg-slate-100/80 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.titulo}
                className="group flex items-start gap-3 bg-white p-5 transition-colors hover:bg-slate-50/70 sm:p-6"
              >
                <span className="mt-0.5 shrink-0 text-xl leading-none">
                  {f.icon}
                </span>
                <div>
                  <div className="font-display text-sm font-bold text-oscuro">{f.titulo}</div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Card footer CTA */}
          <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-slate-500">
                Disponible ya · Sin contratos · Cancelá cuando quieras
              </p>
              <a
                href="#waitlist"
                className="inline-flex items-center gap-2 rounded-full bg-verde-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-verde-900/20 transition-colors hover:bg-verde-500"
              >
                Quiero probarlo →
              </a>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
