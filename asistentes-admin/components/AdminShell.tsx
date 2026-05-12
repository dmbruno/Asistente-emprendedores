'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--admin-bg)' }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — fixed drawer on mobile, static on desktop */}
      <div
        className={`fixed md:static z-40 h-full flex-shrink-0 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar />
      </div>

      {/* Right side */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div
          className="flex items-center gap-3 px-4 py-3 md:hidden flex-shrink-0"
          style={{
            backgroundColor: 'var(--admin-sidebar)',
            borderBottom: '1px solid var(--admin-border)',
          }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
            className="flex flex-col justify-center gap-[5px] p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--admin-sidebar-muted)' }}
          >
            <span className="block h-[1.5px] w-5 rounded-full bg-current" />
            <span className="block h-[1.5px] w-5 rounded-full bg-current" />
            <span className="block h-[1.5px] w-5 rounded-full bg-current" />
          </button>

          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--admin-accent)' }}
          >
            <span className="font-display text-white text-xs font-bold">P</span>
          </div>

          <span className="font-display font-bold text-sm" style={{ color: 'var(--admin-sidebar-text)' }}>
            PropioIA
          </span>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-grid">
          {children}
        </main>
      </div>
    </div>
  );
}
