import { supabaseAdmin } from '@/lib/supabase-admin';
import { fmtDate, fmtDatetime, fmtNumber, fmtPct, fmtPesos } from '@/lib/format';

interface Factura {
  id: string;
  cliente_id: string;
  estado: string;
  tipo: string;
  total: number | null;
  fecha: string | null;
  created_at: string;
}

interface FacturasData {
  facturas: Factura[];
  total: number;
  byEstado: Record<string, number>;
  byTipo: Record<string, { count: number; totalAmount: number }>;
  daily: { date: string; count: number }[];
  recent: Factura[];
}

async function getData(): Promise<FacturasData> {
  const fallback: FacturasData = {
    facturas: [],
    total: 0,
    byEstado: {},
    byTipo: {},
    daily: [],
    recent: [],
  };

  try {
    const { data, error } = await supabaseAdmin
      .from('facturas')
      .select('id, cliente_id, estado, tipo, total, fecha, created_at')
      .order('created_at', { ascending: false });

    if (error || !data) return fallback;

    const facturas: Factura[] = data;

    const byEstado: Record<string, number> = {};
    const byTipo: Record<string, { count: number; totalAmount: number }> = {};

    for (const f of facturas) {
      const e = (f.estado ?? 'desconocido').toLowerCase();
      byEstado[e] = (byEstado[e] ?? 0) + 1;

      const t = (f.tipo ?? 'otro').toLowerCase();
      if (!byTipo[t]) byTipo[t] = { count: 0, totalAmount: 0 };
      byTipo[t].count++;
      byTipo[t].totalAmount += f.total ?? 0;
    }

    // Daily counts for last 30 days
    const now = new Date();
    const daily: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const count = facturas.filter((f) => (f.created_at ?? '').startsWith(dateStr)).length;
      daily.push({ date: dateStr, count });
    }

    const recent = facturas.slice(0, 20);

    return {
      facturas,
      total: facturas.length,
      byEstado,
      byTipo,
      daily,
      recent,
    };
  } catch {
    return fallback;
  }
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; dimColor: string }> = {
  pendiente_revision: { label: 'Pendiente', color: '#d97706', dimColor: 'rgba(217,119,6,0.15)' },
  confirmada: { label: 'Confirmada', color: '#10b981', dimColor: 'rgba(16,185,129,0.15)' },
  corregida: { label: 'Corregida', color: '#6366f1', dimColor: 'rgba(99,102,241,0.15)' },
  rechazada: { label: 'Rechazada', color: '#ef4444', dimColor: 'rgba(239,68,68,0.15)' },
};

function estadoConfig(estado: string): { label: string; color: string; dimColor: string } {
  return ESTADO_CONFIG[(estado ?? '').toLowerCase()] ?? {
    label: estado ?? 'Otro',
    color: '#6b7280',
    dimColor: 'rgba(107,114,128,0.15)',
  };
}

function tipoLabel(tipo: string): string {
  const t = (tipo ?? '').toLowerCase();
  if (t === 'compra') return 'Compra';
  if (t === 'venta') return 'Venta';
  return tipo ?? 'Otro';
}

function tipoColor(tipo: string): { bg: string; text: string } {
  const t = (tipo ?? '').toLowerCase();
  if (t === 'venta') return { bg: 'rgba(217, 119, 6, 0.15)', text: '#d97706' };
  if (t === 'compra') return { bg: 'rgba(99,102,241,0.15)', text: '#6366f1' };
  return { bg: 'rgba(107,114,128,0.15)', text: '#6b7280' };
}

function Sparkline({ data }: { data: { date: string; count: number }[] }) {
  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const W = 260;
  const H = 48;
  const step = W / (data.length - 1);

  const points = data.map((d, i) => {
    const x = i * step;
    const y = H - (d.count / maxVal) * H;
    return `${x},${y}`;
  });

  const polyline = points.join(' ');

  // Area under the line
  const areaPoints = `0,${H} ${polyline} ${W},${H}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: `${H}px` }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16a34a" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#16a34a" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#sparkGrad)" />
      <polyline
        points={polyline}
        fill="none"
        stroke="#16a34a"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function FacturasPage() {
  const data = await getData();

  const ESTADOS_ORDER = ['pendiente_revision', 'confirmada', 'corregida', 'rechazada'];

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--admin-text)' }}>
          Facturas
        </h1>
        <span
          className="font-mono text-xs px-2.5 py-1 rounded-full"
          style={{ backgroundColor: 'var(--admin-accent-dim)', color: 'var(--admin-accent)' }}
        >
          {fmtNumber(data.total)}
        </span>
      </div>

      {/* Estado cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {ESTADOS_ORDER.map((eKey) => {
          const count = data.byEstado[eKey] ?? 0;
          const cfg = estadoConfig(eKey);
          const pct = data.total > 0 ? (count / data.total) * 100 : 0;
          return (
            <div
              key={eKey}
              className="rounded-xl p-5 space-y-4"
              style={{ backgroundColor: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--admin-muted)' }}>
                  {cfg.label}
                </span>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: cfg.color }}
                />
              </div>
              <p className="font-mono text-3xl font-bold" style={{ color: cfg.color }}>
                {fmtNumber(count)}
              </p>
              <div className="space-y-1.5">
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: cfg.color, opacity: 0.7 }}
                  />
                </div>
                <p className="text-xs font-mono" style={{ color: 'var(--admin-dim)' }}>
                  {fmtPct(count, data.total)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two column */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* By tipo */}
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
        >
          <p className="font-display font-semibold text-sm" style={{ color: 'var(--admin-text)' }}>
            Por tipo
          </p>
          <div className="space-y-3">
            {Object.entries(data.byTipo).length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>Sin datos</p>
            ) : (
              Object.entries(data.byTipo)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([tipo, info]) => {
                  const tc = tipoColor(tipo);
                  return (
                    <div
                      key={tipo}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5"
                      style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--admin-border)' }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: tc.bg, color: tc.text }}
                        >
                          {tipoLabel(tipo)}
                        </span>
                        <span className="font-mono text-xs" style={{ color: 'var(--admin-muted)' }}>
                          {fmtNumber(info.count)} docs
                        </span>
                      </div>
                      <span className="font-mono text-sm font-bold" style={{ color: 'var(--admin-accent)' }}>
                        {fmtPesos(info.totalAmount)}
                      </span>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Sparkline */}
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
        >
          <div className="flex items-center justify-between">
            <p className="font-display font-semibold text-sm" style={{ color: 'var(--admin-text)' }}>
              Altas diarias
            </p>
            <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>últimos 30 días</span>
          </div>
          {data.daily.length > 1 ? (
            <div className="pt-2">
              <Sparkline data={data.daily} />
              <div className="flex justify-between mt-2">
                <span className="font-mono text-xs" style={{ color: 'var(--admin-dim)' }}>
                  {data.daily[0]?.date ? fmtDate(data.daily[0].date + 'T00:00:00') : ''}
                </span>
                <span className="font-mono text-xs" style={{ color: 'var(--admin-dim)' }}>
                  {data.daily[data.daily.length - 1]?.date
                    ? fmtDate(data.daily[data.daily.length - 1].date + 'T00:00:00')
                    : ''}
                </span>
              </div>
            </div>
          ) : (
            <div className="h-12 flex items-center">
              <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>Sin datos suficientes</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Facturas Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--admin-border)' }}>
          <p className="font-display font-semibold text-sm" style={{ color: 'var(--admin-text)' }}>
            Facturas recientes
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                {['CLIENTE', 'TIPO', 'ESTADO', 'TOTAL', 'FECHA', 'CREADA'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs uppercase tracking-widest font-medium"
                    style={{ color: 'var(--admin-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recent.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs" style={{ color: 'var(--admin-muted)' }}>
                    Sin facturas
                  </td>
                </tr>
              ) : (
                data.recent.map((f) => {
                  const tc = tipoColor(f.tipo);
                  const ec = estadoConfig(f.estado);
                  const clientShort = f.cliente_id
                    ? `${f.cliente_id.slice(0, 8)}…`
                    : '—';
                  return (
                    <tr key={f.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs" style={{ color: 'var(--admin-muted)' }}>
                          {clientShort}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: tc.bg, color: tc.text }}
                        >
                          {tipoLabel(f.tipo)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: ec.dimColor, color: ec.color }}
                        >
                          {ec.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="font-mono text-sm"
                          style={{ color: f.total != null && f.total > 0 ? 'var(--admin-accent)' : 'var(--admin-dim)' }}
                        >
                          {f.total != null ? fmtPesos(f.total) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs" style={{ color: 'var(--admin-muted)' }}>
                          {f.fecha ? fmtDate(f.fecha) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs" style={{ color: 'var(--admin-dim)' }}>
                          {fmtDatetime(f.created_at)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
