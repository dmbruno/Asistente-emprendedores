import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { fmtDate, fmtNumber, initials } from '@/lib/format';

interface Cliente {
  id: string;
  email: string;
  plan: string;
  condicion_fiscal: string;
  categoria_monotributo: string | null;
  cuit: string | null;
  razon_social: string | null;
  created_at: string;
  updated_at: string;
}

interface UsuariosData {
  clientes: (Cliente & { facturas_count: number })[];
  total: number;
}

async function getData(plan?: string, condicion?: string): Promise<UsuariosData> {
  const fallback: UsuariosData = { clientes: [], total: 0 };

  try {
    let query = supabaseAdmin
      .from('clientes')
      .select('id, email, plan, condicion_fiscal, categoria_monotributo, cuit, razon_social, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (plan && plan !== 'todos') {
      query = query.eq('plan', plan);
    }
    if (condicion && condicion !== 'todos') {
      query = query.eq('condicion_fiscal', condicion);
    }

    const [{ data: clientes, error: cErr }, { data: facturas, error: fErr }] = await Promise.all([
      query,
      supabaseAdmin.from('facturas').select('cliente_id'),
    ]);

    if (cErr || !clientes) return fallback;

    const facturasByClient: Record<string, number> = {};
    for (const f of facturas ?? []) {
      facturasByClient[f.cliente_id] = (facturasByClient[f.cliente_id] ?? 0) + 1;
    }

    const mapped = clientes.map((c) => ({
      ...c,
      facturas_count: facturasByClient[c.id] ?? 0,
    }));

    return { clientes: mapped, total: mapped.length };
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

function condicionLabel(cf: string): string {
  const v = (cf ?? '').toLowerCase();
  if (v === 'monotributo') return 'Mono';
  if (v === 'responsable_inscripto' || v === 'ri') return 'R.I.';
  return cf ?? '—';
}

function condicionBadgeColor(cf: string): { bg: string; text: string } {
  const v = (cf ?? '').toLowerCase();
  if (v === 'monotributo') return { bg: 'rgba(99,102,241,0.15)', text: '#6366f1' };
  return { bg: 'rgba(217,119,6,0.10)', text: '#d97706' };
}

interface PageProps {
  searchParams: { plan?: string; condicion?: string };
}

const PLAN_FILTERS = [
  { value: 'todos', label: 'Todos' },
  { value: 'trial', label: 'Trial' },
  { value: 'solo', label: 'Solo' },
  { value: 'negocio', label: 'Negocio' },
];

const CONDICION_FILTERS = [
  { value: 'todos', label: 'Todos' },
  { value: 'monotributo', label: 'Monotributo' },
  { value: 'responsable_inscripto', label: 'R.I.' },
];

export default async function UsuariosPage({ searchParams }: PageProps) {
  const activePlan = searchParams.plan ?? 'todos';
  const activeCondicion = searchParams.condicion ?? 'todos';

  const data = await getData(
    activePlan !== 'todos' ? activePlan : undefined,
    activeCondicion !== 'todos' ? activeCondicion : undefined
  );

  function filterHref(plan: string, condicion: string): string {
    const params = new URLSearchParams();
    if (plan !== 'todos') params.set('plan', plan);
    if (condicion !== 'todos') params.set('condicion', condicion);
    const q = params.toString();
    return `/usuarios${q ? '?' + q : ''}`;
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--admin-text)' }}>
          Usuarios
        </h1>
        <span
          className="font-mono text-xs px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: 'var(--admin-accent-dim)',
            color: 'var(--admin-accent)',
          }}
        >
          {fmtNumber(data.total)}
        </span>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-6">
        {/* Plan filters */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs uppercase tracking-widest mr-1" style={{ color: 'var(--admin-dim)' }}>
            Plan:
          </span>
          {PLAN_FILTERS.map((f) => {
            const isActive = activePlan === f.value;
            return (
              <Link
                key={f.value}
                href={filterHref(f.value, activeCondicion)}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  backgroundColor: isActive ? 'var(--admin-accent-dim)' : 'transparent',
                  color: isActive ? 'var(--admin-accent)' : 'var(--admin-muted)',
                  border: isActive ? '1px solid rgba(22,163,74,0.35)' : '1px solid transparent',
                  fontWeight: isActive ? '600' : '400',
                }}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        <div className="w-px h-4" style={{ backgroundColor: 'var(--admin-border)' }} />

        {/* Condicion filters */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs uppercase tracking-widest mr-1" style={{ color: 'var(--admin-dim)' }}>
            Condición:
          </span>
          {CONDICION_FILTERS.map((f) => {
            const isActive = activeCondicion === f.value;
            return (
              <Link
                key={f.value}
                href={filterHref(activePlan, f.value)}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  backgroundColor: isActive ? 'var(--admin-accent-dim)' : 'transparent',
                  color: isActive ? 'var(--admin-accent)' : 'var(--admin-muted)',
                  border: isActive ? '1px solid rgba(22,163,74,0.35)' : '1px solid transparent',
                  fontWeight: isActive ? '600' : '400',
                }}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                {['#', 'USUARIO', 'PLAN', 'CONDICIÓN', 'CATEGORÍA', 'CUIT', 'FACTURAS', 'ALTA'].map((h) => (
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
              {data.clientes.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ color: 'var(--admin-dim)' }}
                      >
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      <p className="text-sm" style={{ color: 'var(--admin-muted)' }}>
                        No hay usuarios con estos filtros
                      </p>
                      <Link
                        href="/usuarios"
                        className="text-xs underline"
                        style={{ color: 'var(--admin-accent)' }}
                      >
                        Ver todos los usuarios
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                data.clientes.map((u, idx) => {
                  const colors = planColor(u.plan);
                  const avatarBg = planAvatarBg(u.plan);
                  const cfColors = condicionBadgeColor(u.condicion_fiscal);
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs" style={{ color: 'var(--admin-dim)' }}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                          style={{ backgroundColor: colors.bg, color: colors.text }}
                        >
                          {u.plan ?? 'trial'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: cfColors.bg, color: cfColors.text }}
                        >
                          {condicionLabel(u.condicion_fiscal)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs" style={{ color: 'var(--admin-muted)' }}>
                          {(u.condicion_fiscal ?? '').toLowerCase() === 'monotributo'
                            ? (u.categoria_monotributo ?? '—')
                            : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs" style={{ color: 'var(--admin-dim)' }}>
                          {u.cuit ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="font-mono text-sm"
                          style={{ color: u.facturas_count > 0 ? 'var(--admin-accent)' : 'var(--admin-dim)' }}
                        >
                          {u.facturas_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
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
    </div>
  );
}
