export function Contacto() {
  const items = [
    {
      label: "Email",
      value: "dmbruno61@gmail.com",
      href: "mailto:dmbruno61@gmail.com",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      ),
    },
    {
      label: "Instagram",
      value: "@diegob_dev",
      href: "https://instagram.com/diegob_dev",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="6"/>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: "WhatsApp",
      value: "+54 387 505-1112",
      href: "https://wa.me/543875051112",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.553 4.122 1.523 5.854L.057 23.428a.75.75 0 0 0 .927.928l5.594-1.464A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.663-.52-5.183-1.427l-.362-.214-3.756.984.999-3.648-.235-.377A9.956 9.956 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        </svg>
      ),
    },
  ];

  return (
    <section id="contacto" className="bg-crema px-4 py-24">
      <div className="mx-auto max-w-5xl">

        <div className="text-center">
          <span className="inline-block rounded-full border border-oscuro/10 bg-oscuro/5 px-4 py-1 text-[11px] font-semibold uppercase tracking-widest text-oscuro/40">
            Contacto
          </span>
          <h2 className="mt-4 font-display text-4xl font-bold text-oscuro md:text-5xl">
            Hablemos
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-base text-slate-500">
            Tenés dudas sobre el producto, una sugerencia o querés conocer más. Escribinos por cualquier canal.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {items.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target={item.href.startsWith("http") ? "_blank" : undefined}
              rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="group flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center transition-all duration-200 hover:border-verde-300 hover:shadow-md hover:shadow-verde-900/6"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-400 transition-colors group-hover:border-verde-200 group-hover:bg-verde-50 group-hover:text-verde-600">
                {item.icon}
              </span>
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  {item.label}
                </div>
                <div className="mt-1 font-display text-base font-semibold text-oscuro transition-colors group-hover:text-verde-700">
                  {item.value}
                </div>
              </div>
            </a>
          ))}
        </div>

      </div>
    </section>
  );
}
