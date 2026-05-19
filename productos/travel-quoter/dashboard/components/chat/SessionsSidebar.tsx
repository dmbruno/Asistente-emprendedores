"use client";

import { useEffect, useState } from "react";

export type ChatSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
};

function relativeDate(iso: string): string {
  const now = new Date();
  const d = new Date(iso);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return "Esta semana";
  if (diffDays < 30) return "Este mes";
  return "Más antiguo";
}

function groupSessions(sessions: ChatSession[]): { label: string; items: ChatSession[] }[] {
  const groups: Record<string, ChatSession[]> = {};
  const order = ["Hoy", "Ayer", "Esta semana", "Este mes", "Más antiguo"];
  for (const s of sessions) {
    const label = relativeDate(s.updatedAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(s);
  }
  return order.filter((l) => groups[l]).map((l) => ({ label: l, items: groups[l] }));
}

export function SessionsSidebar({ sessions, activeId, onSelect, onCreate, onDelete }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const grouped = groupSessions(sessions);

  return (
    <aside className="hidden md:flex md:flex-col w-52 shrink-0 border-r border-white/5 bg-[#0d130d] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-4 pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-white/25">
          Consultas
        </span>
        <button
          onClick={onCreate}
          title="Nueva consulta"
          className="flex h-6 w-6 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/8 hover:text-verde-400"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1 space-y-4">
        {grouped.length === 0 && (
          <p className="px-4 text-[11px] text-white/20 mt-4">No hay consultas aún</p>
        )}
        {grouped.map(({ label, items }) => (
          <div key={label}>
            <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/20">
              {label}
            </p>
            {items.map((s) => {
              const active = s.id === activeId;
              return (
                <div
                  key={s.id}
                  className={`group relative mx-1.5 mb-0.5 flex cursor-pointer items-start gap-2 rounded-lg px-2.5 py-2 transition-all ${
                    active
                      ? "bg-verde-600/15 text-verde-400"
                      : "text-white/40 hover:bg-white/5 hover:text-white/70"
                  }`}
                  onClick={() => onSelect(s.id)}
                  onMouseEnter={() => setHoveredId(s.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <svg
                    width="12" height="12"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="mt-0.5 shrink-0 opacity-50"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span className="flex-1 truncate text-[12px] leading-snug">
                    {s.title}
                  </span>
                  {/* Botón eliminar */}
                  {hoveredId === s.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                      title="Eliminar"
                      className="shrink-0 rounded p-0.5 text-white/20 transition-colors hover:text-red-400"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
