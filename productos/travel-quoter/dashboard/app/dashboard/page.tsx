"use client";

import { useCallback, useEffect, useState } from "react";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { SessionsSidebar, type ChatSession } from "@/components/chat/SessionsSidebar";

const SESSIONS_KEY = "tq:sessions";
const MAX_SESSIONS = 40;

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistSessions(sessions: ChatSession[]) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  } catch {}
}

function createNewSession(): ChatSession {
  const now = new Date().toISOString();
  return { id: genId(), title: "Nueva consulta", createdAt: now, updatedAt: now };
}

export default function DashboardPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Carga inicial desde localStorage (solo en cliente)
  useEffect(() => {
    const saved = loadSessions();
    if (saved.length > 0) {
      setSessions(saved);
      setActiveId(saved[0].id);
    } else {
      const first = createNewSession();
      setSessions([first]);
      setActiveId(first.id);
      persistSessions([first]);
    }
    setReady(true);
  }, []);

  const handleCreate = useCallback(() => {
    const s = createNewSession();
    setSessions((prev) => {
      const next = [s, ...prev];
      persistSessions(next);
      return next;
    });
    setActiveId(s.id);
  }, []);

  const handleSelect = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const handleDelete = useCallback((id: string) => {
    try { localStorage.removeItem(`tq:session:${id}`); } catch {}
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persistSessions(next);
      // Si se elimina la activa, ir a la siguiente disponible o crear una nueva
      if (id === activeId) {
        if (next.length > 0) {
          setActiveId(next[0].id);
        } else {
          const fresh = createNewSession();
          const withFresh = [fresh, ...next];
          persistSessions(withFresh);
          setActiveId(fresh.id);
          return withFresh;
        }
      }
      return next;
    });
  }, [activeId]);

  const handleTitleUpdate = useCallback((title: string) => {
    if (!activeId) return;
    const now = new Date().toISOString();
    setSessions((prev) => {
      const next = prev.map((s) =>
        s.id === activeId ? { ...s, title, updatedAt: now } : s
      );
      persistSessions(next);
      return next;
    });
  }, [activeId]);

  if (!ready) return null;

  const activeSession = sessions.find((s) => s.id === activeId) ?? sessions[0];

  return (
    <div className="flex h-full overflow-hidden">
      <SessionsSidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={handleSelect}
        onCreate={handleCreate}
        onDelete={handleDelete}
      />
      {activeSession && (
        <ChatWindow
          key={activeSession.id}
          sessionId={activeSession.id}
          onTitleUpdate={handleTitleUpdate}
        />
      )}
    </div>
  );
}
