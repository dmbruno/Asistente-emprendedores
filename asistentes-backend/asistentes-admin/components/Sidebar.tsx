'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

function OverviewIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function FacturasIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { href: '/overview', label: 'Overview', icon: <OverviewIcon /> },
  { href: '/usuarios', label: 'Usuarios', icon: <UsersIcon /> },
  { href: '/facturas', label: 'Facturas', icon: <FacturasIcon /> },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const width = collapsed ? '60px' : '220px';

  return (
    <aside
      className="flex flex-col h-screen flex-shrink-0 transition-all duration-300 overflow-hidden"
      style={{
        width,
        minWidth: width,
        backgroundColor: 'var(--admin-sidebar)',
        borderRight: '1px solid var(--admin-border)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--admin-border)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--admin-accent)' }}
        >
          <span className="font-display text-white text-sm font-bold">P</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-display font-bold text-sm whitespace-nowrap" style={{ color: 'var(--admin-sidebar-text)' }}>
              PropioIA
            </p>
            <p className="text-[10px] whitespace-nowrap" style={{ color: 'var(--admin-sidebar-muted)' }}>
              Control Panel
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-hidden">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 relative group"
              style={{
                backgroundColor: isActive ? 'var(--admin-accent-dim)' : 'transparent',
                color: isActive ? 'var(--admin-accent)' : 'var(--admin-sidebar-muted)',
                justifyContent: collapsed ? 'center' : undefined,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)';
                  e.currentTarget.style.color = 'var(--admin-sidebar-text)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--admin-sidebar-muted)';
                }
              }}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <span className="flex-1 whitespace-nowrap font-medium">{item.label}</span>
              )}
              {!collapsed && isActive && (
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: 'var(--admin-accent)' }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-2 py-3 space-y-0.5 flex-shrink-0"
        style={{ borderTop: '1px solid var(--admin-border)' }}
      >
        {/* Logout */}
        <a
          href="/api/auth/logout"
          title={collapsed ? 'Cerrar sesión' : undefined}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
          style={{
            color: 'var(--admin-sidebar-muted)',
            justifyContent: collapsed ? 'center' : undefined,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.12)';
            e.currentTarget.style.color = 'var(--admin-danger)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--admin-sidebar-muted)';
          }}
        >
          <span className="flex-shrink-0"><LogOutIcon /></span>
          {!collapsed && <span className="whitespace-nowrap">Cerrar sesión</span>}
        </a>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
          style={{
            color: 'var(--admin-sidebar-muted)',
            justifyContent: collapsed ? 'center' : undefined,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.color = 'var(--admin-sidebar-text)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--admin-sidebar-muted)';
          }}
        >
          <span className="flex-shrink-0">
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </span>
          {!collapsed && <span className="whitespace-nowrap text-xs">Colapsar panel</span>}
        </button>
      </div>
    </aside>
  );
}
