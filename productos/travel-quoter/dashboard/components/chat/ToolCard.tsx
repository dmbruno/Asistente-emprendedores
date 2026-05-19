"use client";

type ToolCardProps = {
  name: string;
  result: Record<string, unknown> | null;
};

export function ToolCard({ name, result }: ToolCardProps) {
  if (!result) return <ToolLoading name={name} />;

  if (name === "search_flights") return <FlightsCard data={result} />;
  if (name === "search_hotels") return <HotelsCard data={result} />;
  if (name === "build_quote")   return <QuoteCard data={result} />;
  if (name === "send_quote_email") return <EmailSentCard data={result} />;
  return null;
}

function ToolLoading({ name }: { name: string }) {
  const labels: Record<string, string> = {
    search_flights:  "Buscando vuelos...",
    search_hotels:   "Buscando hoteles...",
    build_quote:     "Armando cotización...",
    send_quote_email:"Enviando email...",
  };
  return (
    <div className="my-1 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-blink"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </span>
      <span className="text-xs text-slate-400">{labels[name] ?? name}</span>
    </div>
  );
}

// ── Vuelos ───────────────────────────────────────────────────────────────────

type DatePrice = { date: string; price: number };

function FlightsCard({ data }: { data: Record<string, unknown> }) {
  const note = data.note as string | undefined;
  const origin = data.origin as string | undefined;
  const destination = data.destination as string | undefined;
  const requestedDate = data.requested_date as string | undefined;
  const cheapestDate = data.cheapest_date as string | undefined;
  const savingsUsd = data.savings_usd as number | undefined;
  const allDates = (data.all_dates_prices as DatePrice[]) ?? [];

  const fmt = (iso: string) => {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
  };

  if (note && allDates.length === 0) {
    return (
      <p className="my-1 rounded-lg bg-dorado-50 border border-dorado-200 px-3 py-1.5 text-xs text-dorado-700">
        ⚠ {note}
      </p>
    );
  }

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/>
          </svg>
          {origin && destination ? `${origin} → ${destination}` : "Comparativa de vuelos"} · ±3 días
        </div>
        <div className="flex items-center gap-2">
          {savingsUsd && savingsUsd > 0 && (
            <span className="rounded-full bg-verde-100 px-2 py-0.5 text-[11px] font-semibold text-verde-700">
              Ahorrás USD {savingsUsd} cambiando fecha
            </span>
          )}
          <span className="text-[10px] text-slate-400">
            {new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {/* Tabla de precios */}
      {allDates.length > 0 && (
        <div className="divide-y divide-slate-50">
          {allDates.map(({ date, price }) => {
            const isRequested = date === requestedDate;
            const isCheapest = date === cheapestDate;
            const isBoth = isRequested && isCheapest;
            return (
              <div
                key={date}
                className={`flex items-center justify-between gap-2 px-3 py-2 sm:px-4 ${
                  isCheapest ? "bg-verde-50" : isRequested ? "bg-slate-50" : ""
                }`}
              >
                <div className="min-w-0">
                  <span className={`text-xs ${isCheapest || isRequested ? "font-semibold text-slate-800" : "text-slate-500"}`}>
                    {fmt(date)}
                  </span>
                  {(isBoth || isRequested || isCheapest) && (
                    <span className={`ml-1.5 text-[10px] ${isCheapest ? "text-verde-600" : "text-slate-400"}`}>
                      {isBoth ? "pedida · más barata" : isRequested ? "pedida" : "más barata"}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className={`font-display text-sm font-bold ${isCheapest ? "text-verde-600" : "text-slate-800"}`}>
                    USD {price.toLocaleString("es-AR")}
                  </span>
                  {isCheapest && <span className="text-sm">✅</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {note && (
        <p className="border-t border-dorado-100 bg-dorado-50 px-4 py-2 text-[11px] text-dorado-700">
          ⚠ {note}
        </p>
      )}
    </div>
  );
}

// ── Hoteles ──────────────────────────────────────────────────────────────────

function HotelsCard({ data }: { data: Record<string, unknown> }) {
  const hotels = (data.hotels as unknown[]) ?? [];
  const note = data.note as string | undefined;
  const destination = data.destination as string | undefined;

  return (
    <div className="my-1 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span className="text-xs text-slate-600">
          Hoteles{destination ? ` en ${destination}` : ""} consultados · {hotels.length} opciones
        </span>
      </div>
      {note && (
        <p className="w-full rounded-lg bg-dorado-50 border border-dorado-200 px-3 py-1.5 text-xs text-dorado-700">
          ⚠ {note}
        </p>
      )}
    </div>
  );
}

// ── Boarding Pass (Quote) ─────────────────────────────────────────────────────

type Quote = {
  quote_id: string;
  trip_name: string;
  passenger_name: string;
  currency: string;
  total: number;
  breakdown: {
    flight: { airline: string; amount: number; slices: unknown[] };
    hotel: { name: string; stars?: number; nights: number; amount: number };
  };
  notes?: string;
};

function QuoteCard({ data }: { data: Record<string, unknown> }) {
  const q = data.quote as Quote;
  if (!q) return null;
  const { flight, hotel } = q.breakdown;

  // Extraer origen/destino del trip_name si viene con "→"
  const tripParts = q.trip_name?.split("→").map((s: string) => s.trim()) ?? [];
  const origin = tripParts[0] ?? "—";
  const destination = tripParts[1] ?? "—";

  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-verde-200 shadow-md shadow-verde-900/5">
      {/* Header */}
      <div className="bg-[#0b0f0b] px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
              Cotización · {q.quote_id}
            </p>
            <h3 className="mt-0.5 font-display text-base font-bold text-white">{q.trip_name}</h3>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-verde-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/>
            </svg>
          </div>
        </div>

        {/* Route visual */}
        <div className="mt-4 flex items-center gap-3">
          <div className="text-center">
            <p className="font-display text-xl font-bold text-white">{origin.slice(0, 3).toUpperCase()}</p>
            <p className="text-[10px] text-white/40">{origin}</p>
          </div>
          <div className="flex flex-1 items-center gap-1">
            <div className="h-px flex-1 bg-white/10" />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/>
            </svg>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <div className="text-center">
            <p className="font-display text-xl font-bold text-white">{destination.slice(0, 3).toUpperCase()}</p>
            <p className="text-[10px] text-white/40">{destination}</p>
          </div>
        </div>
      </div>

      {/* Dashed divider (boarding pass style) */}
      <div className="relative border-t-2 border-dashed border-verde-100 bg-white">
        <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-slate-50 border border-verde-200" />
        <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-slate-50 border border-verde-200" />
      </div>

      {/* Body */}
      <div className="bg-white px-5 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pasajero</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800">{q.passenger_name}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Aerolínea</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800">{flight.airline}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Vuelo</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800">
              {q.currency} {flight.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Hotel</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800">
              {hotel.name} · {hotel.nights}n
            </p>
            <p className="text-xs text-slate-400">
              {q.currency} {hotel.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {q.notes && (
          <p className="mt-3 text-xs text-slate-400 italic">{q.notes}</p>
        )}

        {/* Total */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-verde-50 border border-verde-100 px-4 py-3">
          <span className="text-sm font-semibold text-verde-800">Total estimado</span>
          <span className="font-display text-xl font-bold text-verde-700">
            {q.currency} {q.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Email enviado ─────────────────────────────────────────────────────────────

function EmailSentCard({ data }: { data: Record<string, unknown> }) {
  if (data.sent) {
    return (
      <div className="my-1 flex items-center gap-2.5 rounded-xl border border-verde-200 bg-verde-50 px-4 py-2.5">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span className="text-sm text-verde-800">
          Cotización enviada a <strong>{data.to as string}</strong>
        </span>
      </div>
    );
  }
  return (
    <div className="my-1 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5">
      <span className="text-sm text-red-700">Error al enviar: {data.error as string}</span>
    </div>
  );
}
