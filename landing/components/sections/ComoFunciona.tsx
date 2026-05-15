const PASOS = [
  {
    n: "01",
    emoji: "📱",
    titulo: "Conectás tu WhatsApp",
    descripcion:
      "Desde el panel escaneás un QR con tu WhatsApp. Nada cambia en tu número ni en tus chats. Listo en 30 segundos.",
    detalle: "Sin cambiar de número",
  },
  {
    n: "02",
    emoji: "🏢",
    titulo: "Cargás tu CUIT y datos fiscales",
    descripcion:
      "Ingresás tu CUIT, razón social y condición ante AFIP (Monotributista o Responsable Inscripto). Con eso el agente sabe qué facturas emitir y cómo registrar el IVA.",
    detalle: "Una sola vez",
  },
  {
    n: "03",
    emoji: "🔑",
    titulo: "Agregás tu API key de IA",
    descripcion:
      "Pegás tu propia API key de Anthropic, OpenAI o Google. Así la IA que lee tus facturas corre con tus créditos — sin costo oculto de nuestra parte.",
    detalle: "BYOK — traés tu propia key",
  },
  {
    n: "04",
    emoji: "📸",
    titulo: "Mandás la foto de la factura",
    descripcion:
      "Foto del comprobante + escribís 'compra' o 'venta'. En segundos te confirmamos los datos y te pedimos validación.",
    detalle: "Facturas A, B o C",
  },
  {
    n: "05",
    emoji: "📊",
    titulo: "Ves todo en el panel",
    descripcion:
      "Resumen del período, gráficos y exportación a Excel. Los monotributistas ven alerta de tope de categoría; los Responsables Inscriptos ven su posición de IVA (débito vs crédito fiscal).",
    detalle: "Web + WhatsApp integrados",
  },
];

export function ComoFunciona() {
  return (
    <section id="como-funciona" className="bg-oscuro px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <span className="inline-block rounded-full border border-verde-600/30 bg-verde-600/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-verde-400">
            Cómo funciona
          </span>
          <h2 className="mt-4 font-display text-4xl font-bold text-white md:text-5xl">
            Del cero al primer comprobante en minutos
          </h2>
          <p className="mx-auto mt-4 max-w-md text-white/50">
            Configurás una sola vez. Después, cada factura te lleva menos de 10 segundos.
          </p>
        </div>

        {/* Steps — 3 arriba, 2 abajo centrados */}
        <div className="mt-16 space-y-5">
          {/* Row 1: pasos 1, 2, 3 */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {PASOS.slice(0, 3).map((p) => (
              <StepCard key={p.n} paso={p} />
            ))}
          </div>
          {/* Row 2: pasos 4, 5 centrados */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:max-w-2xl md:mx-auto">
            {PASOS.slice(3).map((p) => (
              <StepCard key={p.n} paso={p} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StepCard({ paso }: { paso: (typeof PASOS)[0] }) {
  return (
    <div className="group relative rounded-2xl border border-white/8 bg-white/5 p-6 transition-all duration-300 hover:border-verde-600/40 hover:bg-white/8">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-verde-600/30 bg-verde-600/10">
          <span className="font-display text-sm font-bold text-verde-400">{paso.n}</span>
        </div>
        <span className="text-2xl">{paso.emoji}</span>
      </div>
      <h3 className="font-display text-lg font-bold text-white">{paso.titulo}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/50">{paso.descripcion}</p>
      <div className="mt-4 inline-block rounded-full bg-verde-600/10 px-3 py-1 text-xs text-verde-400">
        {paso.detalle}
      </div>
    </div>
  );
}
