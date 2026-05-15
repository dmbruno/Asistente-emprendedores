import type { Metadata } from "next";

import { CTAWaitlist } from "@/components/sections/CTAWaitlist";
import { ComoFunciona } from "@/components/sections/ComoFunciona";
import { FAQ } from "@/components/sections/FAQ";
import { Footer } from "@/components/sections/Footer";
import { Hero } from "@/components/sections/Hero";
import { Navbar } from "@/components/sections/Navbar";
import { Pricing } from "@/components/sections/Pricing";
import { Problema } from "@/components/sections/Problema";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://propio-ia-landing.vercel.app";

export const metadata: Metadata = {
  title: "Agente Contable — Digitalizá tus facturas desde WhatsApp",
  description:
    "Mandá una foto a tu WhatsApp y la factura queda cargada con monto, CUIT, fecha y todo lo que necesitás para tu contador. Validación automática en AFIP.",
  alternates: { canonical: `${SITE_URL}/servicios/facturacion` },
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "PropioIA",
    title: "Agente Contable — PropioIA",
    description:
      "Tu agente de IA para digitalizar facturas desde WhatsApp y validarlas en AFIP. Para monotributistas y Responsables Inscriptos.",
    url: `${SITE_URL}/servicios/facturacion`,
  },
};

export default function AgenteContablePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <ParaQuien />
        <Problema />
        <FeaturesContable />
        <ComoFunciona />
        <Pricing />
        <FAQ />
        <CTAWaitlist />
      </main>
      <Footer />
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────
// PARA QUIÉN — monotributistas + RI
// ────────────────────────────────────────────────────────────────────────

function ParaQuien() {
  const perfiles = [
    {
      titulo: "Monotributistas",
      icon: "📋",
      desc: "Emite Facturas C automáticamente, te avisa cuando estás cerca del tope de tu categoría y te arma el reporte del mes para vos o tu contador.",
      highlights: ["Facturas C con QR oficial", "Alerta de tope de categoría", "Export Excel del período"],
    },
    {
      titulo: "Responsables Inscriptos",
      icon: "📊",
      desc: "Discrimina IVA al 21%, 10,5% y 27%. Calcula tu posición mensual entre débito y crédito fiscal. Cero cuentas a mano.",
      highlights: ["Discriminación de IVA automática", "Posición mensual de IVA", "Facturas A y B"],
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
            Pensado para tu condición fiscal
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-slate-500">
            El agente se adapta a si sos Monotributista o Responsable Inscripto. Cambia lo que necesita cambiar.
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
                <h3 className="font-display text-xl font-bold text-oscuro">
                  {p.titulo}
                </h3>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-500">
                {p.desc}
              </p>
              <ul className="mt-5 space-y-2">
                {p.highlights.map((h) => (
                  <li
                    key={h}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-verde-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
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
// FEATURES — todas las capacidades del Contable, en grilla
// ────────────────────────────────────────────────────────────────────────

function FeaturesContable() {
  const features = [
    { icon: "📸", titulo: "Foto por WhatsApp", desc: "Mandás la imagen de la factura sin abrir ninguna app extra." },
    { icon: "🤖", titulo: "Extracción con IA", desc: "Detecta proveedor, CUIT, monto, fecha, tipo y alícuotas de IVA en segundos." },
    { icon: "🏛️", titulo: "Validación AFIP", desc: "Cruza el CUIT del emisor contra el padrón oficial automáticamente." },
    { icon: "📄", titulo: "PDF de Factura C", desc: "Genera el comprobante con QR oficial y te lo manda por WhatsApp." },
    { icon: "📊", titulo: "Panel con métricas", desc: "Totales del período, alerta de tope para monotributistas y posición de IVA para RI." },
    { icon: "💼", titulo: "Responsable Inscripto", desc: "Discrimina IVA al 21%, 10,5% y 27% y calcula tu posición mensual." },
    { icon: "📥", titulo: "Export para contador", desc: "Descargá el CSV del mes con un click y mandáselo directo." },
    { icon: "💬", titulo: "Resumen por WhatsApp", desc: "Mandá 'resumen' al agente y recibís los totales del mes al instante." },
  ];

  return (
    <section className="bg-oscuro px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <span className="inline-block rounded-full border border-verde-600/30 bg-verde-600/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-verde-400">
            Capacidades
          </span>
          <h2 className="mt-4 font-display text-4xl font-bold text-white md:text-5xl">
            Todo lo que hace<br className="hidden sm:block" /> el Agente Contable
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-white/50">
            Un asistente que digitaliza, valida y organiza tus facturas desde WhatsApp,
            sin que tengas que abrir ninguna planilla.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.titulo}
              className="rounded-2xl border border-white/8 bg-white/5 p-5 transition-all duration-300 hover:border-verde-600/40 hover:bg-white/8"
            >
              <div className="text-2xl">{f.icon}</div>
              <h3 className="mt-3 font-display text-sm font-bold text-white">
                {f.titulo}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-white/50">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
