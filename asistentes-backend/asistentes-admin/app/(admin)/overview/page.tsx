import { supabaseAdmin } from '@/lib/supabase-admin';
import { fmtDate, fmtNumber, fmtPct, initials } from '@/lib/format';

interface Cliente {
  id: string;
  email: string;
  plan: string;
  condicion_fiscal: string;
  razon_social: string | null;
  created_at: string;
  updated_at: string;
}

interface Factura {
  cliente_id: string;
  estado: string;
  tipo: string;
  created_at: string;
  total: number | null;
}

interface OverviewData {
  totalUsers: number;
  activeUsers: number;
  newThisWeek: number;
  newLastWeek: number;
  weekGrowthPct: number;
  byPlan: { trial: number; solo: number; negocio: number };
  byCondicion: { monotributo: number; responsable_inscripto: number };
  monthly: { label: string; count: number }[];
  totalFacturas: number;
  byEstado: { pendiente_revision: number; confirmada: number; corregida: number; rechazada: number };
  recentUsers: (Cliente & { facturas_count: number })[];
  fetchedAt: Date;
}

async function getData(): Promise<OverviewData> {
  const fallback: OverviewData = {
    totalUsers: 0,
    activeUsers: 0,
    newThisWeek: 0,
    newLastWeek: 0,
    weekGrowthPct: 0,
    byPlan: { trial: 0, solo: 0, negocio: 0 },
    byCondicion: { monotributo: 0, responsable_inscripto: 0 },
    monthly: [],
    totalFacturas: 0,
    byEstado: { pendiente_revision: 0, confirmada: 0, corregida: 0, rechazada: 0 },
    recentUsers: [],
    fetchedAt: new Date(),
  };

  try {
    const [{ data: clientes, error: cErr }, { data: facturas, error: fErr }] = await Promise.all([
      supabaseAdmin
        .from('clientes')
        .select('id, email, plan, condicion_fiscal, razon_social, created_at, updated_at')
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('facturas')
        .select('cliente_id, estado, tipo, created_at, total'),
    ]);

    if (cErr || fErr || !clientes) return fallback;

    const now = new Date();

    // Active users: updated_at in last 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const activeUsers = clientes.filter(
      (c) => new Date(c.updated_at) >= sevenDaysAgo
    ).length;

    // This week: Monday 00:00 to now
    const dayOfWeek = now.getDay(); // 0=Sun,1=Mon,...
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);

    const lastMonday = new Date(monday);
    lastMonday.setDate(monday.getDate() - 7);

    const newThisWeek = clientes.filter(
      (c) => new Date(c.created_at) >= monday
    ).length;

    const newLastWeek = clientes.filter((c) => {
      const d = new Date(c.created_at);
      return d >= lastMonday && d < monday;
    }).length;

    const weekGrowthPct = Math.round(
      ((newThisWeek - newLastWeek) / Math.max(newLastWeek, 1)) * 100
    );

    // By plan
    const byPlan = { trial: 0, solo: 0, negocio: 0 };
    for (const c of clientes) {
      const p = (c.plan ?? '').toLowerCase();
      if (p === 'trial') byPlan.trial++;
      else if (p === 'solo') byPlan.solo++;
      else if (p === 'negocio') byPlan.negocio++;
    }

    // By condicion
    const byCondicion = { monotributo: 0, responsable_inscripto: 0 };
    for (const c of clientes) {
      const cf = (c.condicion_fiscal ?? '').toLowerCase();
      if (cf === 'monotributo') byCondicion.monotributo++;
      else if (cf === 'responsable_inscripto' || cf === 'ri') byCondicion.responsable_inscripto++;
    }

    // Monthly: last 6 months
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthly: { label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const count = clientes.filter((c) => {
        const cd = new Date(c.created_at);
        return cd.getFullYear() === year && cd.getMonth() === month;
      }).length;
      monthly.push({ label: monthNames[month], count });
    }

    // Facturas
    const allFacturas: Factura[] = facturas ?? [];
    const totalFacturas = allFacturas.length;
    const byEstado = { pendiente_revision: 0, confirmada: 0, corregida: 0, rechazada: 0 };
    for (const f of allFacturas) {
      const e = (f.estado ?? '').toLowerCase();
      if (e === 'pendiente_revision') byEstado.pendiente_revision++;
      else if (e === 'confirmada') byEstado.confirmada++;
      else if (e === 'corregida') byEstado.corregida++;
      else if (e === 'rechazada') byEstado.rechazada++;
    }

    // Recent users top 8 with facturas count
    const facturasByClient: Record<string, number> = {};
    for (const f of allFacturas) {
      facturasByClient[f.cliente_id] = (facturasByClient[f.cliente_id] ?? 0) + 1;
    }

    const recentUsers = clientes.slice(0, 8).map((c) => ({
      ...c,
      facturas_count: facturasByClient[c.id] ?? 0,
    }));

    return {
      totalUsers: clientes.length,
      activeUsers,
      newThisWeek,
      newLastWeek,
      weekGrowthPct,
      byPlan,
      byCondicion,
      monthly,
      totalFacturas,
      byEstado,
      recentUsers,
      fetchedAt: new Date(),
    };
  } catch {
    return fallback;
  }
}

function planColor(plan: string): { bg: string; text: string } {
  const p = (plan ?? '').toLowerCase();
  if (p === 'negocio') return { bg: 'rgba(16,185,129,0.15)', text: '#10b981' };
  if (p === 'solo') return { bg: 'rgba(217,119,6,0.15)', text: '#d97706' };
  return { bg: 'rgba(107,114,128,0.15)', text: '#6b7280' };
}

function planAvatarBg(plan: string): string {
  const p = (plan ?? '').toLowerCase();
  if (p === 'negocio') return '#10b981';
  if (p === 'solo') return '#d97706';
  return '#6b7280';
}

function estadoColor(estado: string): string {
  const e = (estado ?? '').toLowerCase();
  if (e === 'confirmada') return '#10b981';
  if (e === 'corregida') return '#6366f1';
  if (e === 'rechazada') return '#ef4444';
  return '#d97706'; // pendiente_revision
}

function estadoLabel(estado: string): string {
  const map: Record<string, string> = {
    pendiente_revision: 'Pendiente',
    confirmada: 'Confirmada',
    corregida: 'Corregida',
    rechazada: 'Rechazada',
  };
  return map[estado] ?? estado;
}

function BarChart({ data }: { data: { label: string; count: number }[] }) {
  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const barWidth = 32;
  const gap = 12;
  const chartHeight = 80;
  const labelHeight = 20;
  const valueHeight = 14;
  const totalHeight = chartHeight + labelHeight + valueHeight + 8;
  const totalWidth = data.length * (barWidth + gap) - gap;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      className="w-full"
      style={{ height: `${totalHeight}px`, maxHeight: `${totalHeight}px` }}
    >
      {data.map((d, i) => {
        const x = i * (barWidth + gap);
        const barH = Math.max((d.count / maxVal) * chartHeight, d.count === 0 ? 0 : 4);
        const barY = chartHeight - barH + valueHeight + 4;

        return (
          <g key={d.label}>
            {/* Background bar */}
            <rect
              x={x}
              y={valueHeight + 4}
              width={barWidth}
              height={chartHeight}
              rx={4}
              fill="rgba(22,163,74,0.06)"
            />
            {/* Actual bar */}
            <rect
              x={x}
              y={barY}
              width={barWidth}
              height={barH}
              rx={4}
              fill="rgba(22,163,74,0.75)"
            />
            {/* Value above */}
            <text
              x={x + barWidth / 2}
              y={valueHeight}
              textAnchor="middle"
              fontSize={9}
              fill="rgba(22,163,74,0.9)"
              fontFamily="var(--font-space-mono), monospace"
            >
              {d.count}
            </text>
            {/* Month label below */}
            <text
              x={x + barWidth / 2}
              y={totalHeight - 2}
              textAnchor="middle"
              fontSize={9}
              fill="rgba(107,114,128,0.9)"
              fontFamily="var(--font-outfit), sans-serif"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default async function OverviewPage() {
  const data = await getData();

  const activePct = data.totalUsers > 0
    ? Math.round((data.activeUsers / data.totalUsers) * 100)
    : 0;

  const totalPlan = data.byPlan.trial + data.byPlan.solo + data.byPlan.negocio;
  const trialPct = totalPlan > 0 ? (data.byPlan.trial / totalPlan) * 100 : 0;
  const soloPct = totalPlan > 0 ? (data.byPlan.solo / totalPlan) * 100 : 0;
  const negovioPct = totalPlan > 0 ? (data.byPlan.negocio / totalPlan) * 100 : 0;

  const totalCondicion = data.byCondicion.monotributo + data.byCondicion.responsable_inscripto;

  const estadoEntries = [
    { key: 'pendiente_revision', label: 'Pendiente', color: '#d97706', count: data.byEstado.pendiente_revision },
    { key: 'confirmada', label: 'Confirmada', color: '#10b981', count: data.byEstado.confirmada },
    { key: 'corregida', label: 'Corregida', color: '#6366f1', count: data.byEstado.corregida },
    { key: 'rechazada', label: 'Rechazada', color: '#ef4444', count: data.byEstado.rechazada },
  ];

  const now = data.fetchedAt;
  const updatedStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--admin-text)' }}>
          Overview
        </h1>
        <span className="font-mono text-xs" style={{ color: 'var(--admin-muted)' }}>
          Actualizado: {updatedStr}
        </span>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Card 1: Total Users */}
        <div
          className="rounded-xl p-5 space-y-3"
          style={{ backgroundColor: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
        >
          <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--admin-muted)' }}>
            Usuarios Totales
          </p>
          <p className="font-mono text-3xl font-bold" style={{ color: 'var(--admin-accent)' }}>
            {fmtNumber(data.totalUsers)}
          </p>
          <p className="text-xs" style={{ color: 'var(--admin-dim)' }}>
            todos los registros
          </p>
        </div>

        {/* Card 2: Active Users */}
        <div
          className="rounded-xl p-5 space-y-3"
          style={{ backgroundColor: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
        >
          <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--admin-muted)' }}>
            Activos (7 Días)
          </p>
          <p className="font-mono text-3xl font-bold" style={{ color: '#10b981' }}>
            {fmtNumber(data.activeUsers)}
          </p>
          <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>
            <span className="font-mono">{activePct}%</span> del total
          </p>
        </div>

        {/* Card 3: New This Week */}
        <div
          className="rounded-xl p-5 space-y-3"
          style={{ backgroundColor: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
        >
          <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--admin-muted)' }}>
            Nuevos Esta Semana
          </p>
          <p className="font-mono text-3xl font-bold" style={{ color: 'var(--admin-accent)' }}>
            {fmtNumber(data.newThisWeek)}
          </p>
          <div className="flex items-center gap-1.5">
            {data.weekGrowthPct >= 0 ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
            <span
              className="font-mono text-xs font-bold"
              style={{ color: data.weekGrowthPct >= 0 ? '#10b981' : '#ef4444' }}
            >
              {data.weekGrowthPct >= 0 ? '+' : ''}{data.weekGrowthPct}%
            </span>
            <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>vs semana anterior</span>
          </div>
        </div>

        {/* Card 4: Facturas */}
        <div
          className="rounded-xl p-5 space-y-3"
          style={{ backgroundColor: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
        >
          <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--admin-muted)' }}>
            Facturas Totales
          </p>
          <p className="font-mono text-3xl font-bold" style={{ color: 'var(--admin-accent)' }}>
            {fmtNumber(data.totalFacturas)}
          </p>
          <p className="text-xs" style={{ color: 'var(--admin-dim)' }}>
            documentos procesados
          </p>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[60%_40%]">
        {/* Bar Chart */}
        <div
          className="rounded-xl p-5"
          style={{ backgroundColor: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
        >
          <p className="font-display font-semibold text-sm mb-5" style={{ color: 'var(--admin-text)' }}>
            Altas por mes
          </p>
          {data.monthly.length > 0 ? (
            <BarChart data={data.monthly} />
          ) : (
            <div className="h-24 flex items-center justify-center">
              <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>Sin datos</p>
            </div>
          )}
        </div>

        {/* Right col: two stacked cards */}
        <div className="space-y-4">
          {/* Plan distribution */}
          <div
            className="rounded-xl p-5 space-y-4"
            style={{ backgroundColor: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
          >
            <p className="font-display font-semibold text-sm" style={{ color: 'var(--admin-text)' }}>
              Por plan
            </p>
            {/* Stacked bar */}
            <div className="h-2 rounded-full overflow-hidden flex" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <div style={{ width: `${trialPct}%`, backgroundColor: '#6b7280' }} />
              <div style={{ width: `${soloPct}%`, backgroundColor: '#d97706' }} />
              <div style={{ width: `${negovioPct}%`, backgroundColor: '#10b981' }} />
            </div>
            {/* Legend rows */}
            <div className="space-y-2">
              {[
                { label: 'Trial', count: data.byPlan.trial, color: '#6b7280' },
                { label: 'Solo', count: data.byPlan.solo, color: '#d97706' },
                { label: 'Negocio', count: data.byPlan.negocio, color: '#10b981' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
                    <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>{row.label}</span>
                  </div>
                  <span className="font-mono text-xs font-bold" style={{ color: 'var(--admin-text)' }}>
                    {fmtNumber(row.count)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Condición fiscal */}
          <div
            className="rounded-xl p-5 space-y-4"
            style={{ backgroundColor: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
          >
            <p className="font-display font-semibold text-sm" style={{ color: 'var(--admin-text)' }}>
              Condición fiscal
            </p>
            <div className="space-y-3">
              {[
                { label: 'Monotributista', count: data.byCondicion.monotributo },
                { label: 'Resp. Inscripto', count: data.byCondicion.responsable_inscripto },
              ].map((row) => {
                const pct = totalCondicion > 0 ? (row.count / totalCondicion) * 100 : 0;
                return (
                  <div key={row.label} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>{row.label}</span>
                      <span className="font-mono text-xs" style={{ color: 'var(--admin-text)' }}>
                        {fmtNumber(row.count)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: 'var(--admin-accent)' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Users Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--admin-border)' }}>
          <p className="font-display font-semibold text-sm" style={{ color: 'var(--admin-text)' }}>
            Altas recientes
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                {['USUARIO', 'PLAN', 'CONDICIÓN', 'FACTURAS', 'ALTA'].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs uppercase tracking-widest font-medium"
                    style={{ color: 'var(--admin-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recentUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-xs" style={{ color: 'var(--admin-muted)' }}>
                    Sin usuarios
                  </td>
                </tr>
              ) : (
                data.recentUsers.map((u) => {
                  const colors = planColor(u.plan);
                  const avatarBg = planAvatarBg(u.plan);
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-mono text-sm font-bold"
                            style={{ backgroundColor: avatarBg, color: '#000' }}
                          >
                            {initials(u.razon_social ?? u.email)}
                          </div>
                          <div>
                            <p className="text-xs font-medium" style={{ color: 'var(--admin-text)' }}>
                              {u.email}
                            </p>
                            {u.razon_social && (
                              <p className="text-xs" style={{ color: 'var(--admin-muted)' }}>
                                {u.razon_social}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                          style={{ backgroundColor: colors.bg, color: colors.text }}
                        >
                          {u.plan ?? 'trial'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs" style={{ color: 'var(--admin-muted)' }}>
                          {(u.condicion_fiscal ?? '').toLowerCase() === 'monotributo' ? 'Mono' : 'R.I.'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="font-mono text-sm"
                          style={{ color: u.facturas_count > 0 ? 'var(--admin-accent)' : 'var(--admin-dim)' }}
                        >
                          {u.facturas_count}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs" style={{ color: 'var(--admin-muted)' }}>
                          {fmtDate(u.created_at)}
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

      {/* Facturas por estado */}
      <div>
        <p className="font-display font-semibold text-sm mb-3" style={{ color: 'var(--admin-text)' }}>
          Facturas por estado
        </p>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {estadoEntries.map((e) => (
            <div
              key={e.key}
              className="rounded-xl p-5 space-y-2"
              style={{ backgroundColor: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: e.color }}
                />
                <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--admin-muted)' }}>
                  {e.label}
                </span>
              </div>
              <p className="font-mono text-3xl font-bold" style={{ color: e.color }}>
                {fmtNumber(e.count)}
              </p>
              <p className="text-xs" style={{ color: 'var(--admin-dim)' }}>
                {fmtPct(e.count, data.totalFacturas)} del total
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
