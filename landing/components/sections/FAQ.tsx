const PREGUNTAS = [
  {
    q: "¿Cómo conecto mi WhatsApp?",
    a: "Te damos un QR en el panel. Lo escaneás desde tu WhatsApp y empezás a mandar fotos al toque. No hace falta instalar nada extra.",
  },
  {
    q: "¿Necesito cambiar de número?",
    a: "No. Usás tu mismo número de siempre. El asistente funciona dentro de tu WhatsApp actual.",
  },
  {
    q: "¿Para quién es este producto?",
    a: "Para monotributistas y Responsables Inscriptos. Los monotributistas emiten Facturas C y ven alerta de tope de categoría. Los RI emiten Facturas A o B con IVA discriminado y ven su posición mensual (débito vs crédito fiscal) en el panel y por WhatsApp.",
  },
  {
    q: "¿Qué tipo de facturas procesa?",
    a: "Facturas A, B y C. También tickets y comprobantes informales (los identifica y te avisa si no son válidos para AFIP).",
  },
  {
    q: "¿Quién paga los tokens de IA?",
    a: "Vos cargás tu propia API key (Anthropic, OpenAI o Google). Así tenés costos transparentes y control total. No pagamos por vos ni tenemos margen oculto.",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Sí. Cada cliente ve solo lo suyo, las API keys se guardan encriptadas y las imágenes van a un bucket privado. Sin acceso cruzado entre cuentas.",
  },
  {
    q: "¿Puedo cancelar cuando quiero?",
    a: "Sí, cuando querés, sin contactar a nadie y sin cobros extra. Los datos quedan exportables en Excel.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="bg-oscuro px-4 py-24">
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
          {PREGUNTAS.map((p) => (
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
