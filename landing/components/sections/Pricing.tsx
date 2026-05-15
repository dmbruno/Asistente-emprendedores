const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:3000";

const PLANES = [
  {
    nombre: "Trial",
    precio: "Gratis",
    precioAnterior: undefined,
    detalle: "Para conocer el producto",
    features: [
      "WhatsApp dedicado",
      "Dashboard web",
      "Hasta 5 facturas/mes",
      "Validación AFIP",
    ],
    destacado: false,
    cta: "Crear cuenta gratis",
    href: `${DASHBOARD_URL}/login`,
  },
  {
    nombre: "Solo",
    precio: "$49.999",
    precioAnterior: "$71.427",
    detalle: "por mes · sin sorpresas",
    features: [
      "Todo lo del Trial",
      "Hasta 80 facturas/mes",
      "Export Excel del período",
      "Alerta de tope de categoría e IVA para RI",
      "PDF de factura por WhatsApp",
    ],
    destacado: true,
    cta: "Empezar ahora",
    href: `${DASHBOARD_URL}/dashboard/suscripcion`,
  },
  {
    nombre: "Negocio",
    precio: "$69.999",
    precioAnterior: "$99.998",
    detalle: "por mes",
    features: [
      "Todo lo de Solo",
      "Facturas ilimitadas",
      "Soporte prioritario por WhatsApp",
    ],
    destacado: false,
    cta: "Empezar ahora",
    href: `${DASHBOARD_URL}/dashboard/suscripcion`,
  },
];

export function Pricing() {
  return (
    <section id="precios" className="bg-crema px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <span className="inline-block rounded-full bg-oscuro/5 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-oscuro/50">
            Precios
          </span>
          <h2 className="mt-4 font-display text-4xl font-bold text-oscuro md:text-5xl">
            Probás gratis, seguís si te sirve
          </h2>
          <p className="mx-auto mt-4 max-w-md text-slate-500">
            Sin tarjeta. Sin letra chica. Cancelás cuando querés.
          </p>
          <p className="mx-auto mt-2 max-w-sm text-xs text-slate-400">
            Para monotributistas y Responsables Inscriptos.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {PLANES.map((p) => (
            <div
              key={p.nombre}
              className={`card-glow relative flex flex-col overflow-hidden rounded-2xl border bg-white p-6 transition-all duration-300 ${
                p.destacado
                  ? "border-verde-400 shadow-lg shadow-verde-900/10"
                  : "border-slate-200"
              }`}
            >
              {p.destacado && (
                <>
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-verde-500 to-verde-300" />
                  <span className="absolute right-4 top-4 rounded-full bg-verde-600 px-2.5 py-0.5 text-xs font-bold text-white">
                    Popular
                  </span>
                </>
              )}

              <div className="font-display text-sm font-bold uppercase tracking-widest text-oscuro/40">
                {p.nombre}
              </div>
              <div className="mt-3 flex items-end gap-2">
                <span className="font-display text-3xl font-extrabold text-oscuro">
                  {p.precio}
                </span>
                {p.precioAnterior && (
                  <span className="mb-1 text-sm text-slate-400 line-through">
                    {p.precioAnterior}
                  </span>
                )}
              </div>
              {p.precioAnterior && (
                <span className="mt-1 inline-block w-fit rounded-full bg-verde-100 px-2 py-0.5 text-xs font-bold text-verde-700">
                  30% OFF — precio de lanzamiento
                </span>
              )}
              <div className="mt-1 text-sm text-slate-400">{p.detalle}</div>

              <ul className="mt-6 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
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
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={p.href}
                className={`mt-6 block rounded-full px-4 py-3 text-center text-sm font-semibold transition-colors ${
                  p.destacado
                    ? "bg-verde-600 text-white hover:bg-verde-500"
                    : "border border-slate-200 text-oscuro hover:bg-slate-50"
                }`}
              >
                {p.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
