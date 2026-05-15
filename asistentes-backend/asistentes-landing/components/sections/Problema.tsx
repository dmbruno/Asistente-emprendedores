const DOLORES = [
  {
    icon: "⏱",
    titulo: "Perdés horas anotando facturas a mano",
    descripcion:
      "Cargar comprobantes cada mes te roba tiempo que podrías usar para vender más o simplemente descansar.",
  },
  {
    icon: "❌",
    titulo: "Un dígito mal y te cambia todo",
    descripcion:
      "Un error en el total o el CUIT y te pasás del tope de categoría, pagás más IVA del que corresponde o perdés crédito fiscal.",
  },
  {
    icon: "🌫",
    titulo: "No sabés cómo va tu negocio",
    descripcion:
      "Sin claridad de cuánto facturaste, gastaste o ganaste en el mes, tomás decisiones a ciegas.",
  },
];

export function Problema() {
  return (
    <section className="bg-crema px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <span className="inline-block rounded-full bg-oscuro/5 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-oscuro/50">
            El problema
          </span>
          <h2 className="mt-4 font-display text-4xl font-bold text-oscuro md:text-5xl">
            Así está hoy tu administración
          </h2>
          <p className="mx-auto mt-4 max-w-md text-slate-500">
            Lo hacés solo, con planillas o de memoria. Y siempre quedás con la duda de si los números cierran.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {DOLORES.map((d) => (
            <div
              key={d.titulo}
              className="card-glow group rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300"
            >
              <div className="mb-4 text-3xl">{d.icon}</div>
              <h3 className="font-display text-lg font-bold text-oscuro">{d.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{d.descripcion}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
