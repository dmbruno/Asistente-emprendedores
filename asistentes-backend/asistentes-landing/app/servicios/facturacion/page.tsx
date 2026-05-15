import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Digitalizador de Facturación",
  description:
    "Mandá una foto a tu WhatsApp y la factura queda cargada con monto, CUIT, fecha y todo lo que necesitás para tu contador.",
};

export default function ServicioFacturacionPage() {
  // TODO: detalle del servicio (cómo funciona en profundidad, casos de uso, FAQ específica).
  return (
    <main className="mx-auto max-w-3xl px-4 py-20">
      <h1 className="text-4xl font-semibold">Digitalizador de Facturación</h1>
      <p className="mt-6 text-lg text-slate-600">
        Mandá una foto a tu WhatsApp y la factura queda cargada en tu panel.
      </p>
      <p className="mt-12 text-sm text-slate-500">🔧 Página en construcción.</p>
    </main>
  );
}
