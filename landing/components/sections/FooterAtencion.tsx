export function FooterAtencion() {
  return (
    <footer className="bg-oscuro px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <a href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-verde-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </span>
            <span className="font-display text-base font-bold text-white">
              Propio<span className="text-verde-400">IA</span>
            </span>
          </a>

          <nav className="flex flex-wrap justify-center gap-6">
            <a href="#como-funciona" className="text-sm text-white/40 transition-colors hover:text-white/70">
              Cómo funciona
            </a>
            <a href="#casos-de-uso" className="text-sm text-white/40 transition-colors hover:text-white/70">
              Casos de uso
            </a>
            <a href="#faq" className="text-sm text-white/40 transition-colors hover:text-white/70">
              FAQ
            </a>
            <a href="#contratar" className="text-sm text-white/40 transition-colors hover:text-white/70">
              Contratar
            </a>
          </nav>
        </div>

        <div className="mt-8 border-t border-white/8 pt-8 text-center text-xs text-white/20">
          © {new Date().getFullYear()} PropioIA — Hecho para emprendedores argentinos
        </div>
      </div>
    </footer>
  );
}
