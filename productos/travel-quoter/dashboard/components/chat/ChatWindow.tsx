"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { MessageBubble, type Message, type ToolEvent } from "./MessageBubble";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

const SUGGESTIONS = [
  "Quiero viajar a Miami en agosto para 2 personas",
  "Buscame vuelos de Buenos Aires a Europa en julio",
  "Necesito una cotización para Cancún, salida el 15 de marzo",
  "¿Cuánto cuesta un viaje a Nueva York por una semana?",
];

function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

type Provider = "anthropic" | "openai" | "gemini";

const PROVIDERS: { id: Provider; label: string; model: string; color: string; activeClass: string }[] = [
  { id: "anthropic", label: "Claude",  model: "claude-opus-4-6",   color: "verde",  activeClass: "bg-verde-600 text-white border-verde-600" },
  { id: "openai",    label: "GPT-4o",  model: "gpt-4o",            color: "slate",  activeClass: "bg-slate-800 text-white border-slate-800" },
  { id: "gemini",    label: "Gemini",  model: "gemini-2.0-flash",  color: "cielo",  activeClass: "bg-cielo-500 text-white border-cielo-500" },
];

type KeysStatus = {
  has_anthropic_key: boolean;
  has_openai_key: boolean;
  has_gemini_key: boolean;
};

const MAX_STORED_MESSAGES = 60;

function sessionStorageKey(sessionId: string) {
  return `tq:session:${sessionId}`;
}

function loadMessages(sessionId: string): Message[] {
  try {
    const raw = localStorage.getItem(sessionStorageKey(sessionId));
    if (!raw) return [];
    const parsed: Message[] = JSON.parse(raw);
    return parsed.map((m) => ({ ...m, streaming: false }));
  } catch {
    return [];
  }
}

function saveMessages(sessionId: string, msgs: Message[]) {
  try {
    const toSave = msgs.slice(-MAX_STORED_MESSAGES).map((m) => ({ ...m, streaming: false }));
    localStorage.setItem(sessionStorageKey(sessionId), JSON.stringify(toSave));
  } catch { /* localStorage lleno — ignorar */ }
}

type ChatWindowProps = {
  sessionId: string;
  initialProvider?: Provider;
  onTitleUpdate?: (title: string) => void;
};

export function ChatWindow({ sessionId, initialProvider = "anthropic", onTitleUpdate }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(() => loadMessages(sessionId));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState<Provider>(initialProvider);
  const titleSetRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Persistir mensajes al cambiar (excepto durante streaming)
  useEffect(() => {
    if (!loading) saveMessages(sessionId, messages);
  }, [messages, loading, sessionId]);

  useEffect(() => {
      (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/keys`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const status: KeysStatus = await res.json();
        if (status.has_anthropic_key) setProvider("anthropic");
        else if (status.has_openai_key) setProvider("openai");
        else if (status.has_gemini_key) setProvider("gemini");
      } catch { /* silent */ }
    })();
  }, [sessionId]);

  const adjustTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setError("");

    const userMsg: Message = { id: nanoid(), role: "user", content: text.trim() };
    // Informar el título de la sesión con el primer mensaje del usuario
    if (!titleSetRef.current && onTitleUpdate) {
      titleSetRef.current = true;
      onTitleUpdate(text.trim().slice(0, 60));
    }
    const assistantId = nanoid();
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true,
      toolEvents: [],
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Sesión expirada. Volvé a iniciar sesión."); setLoading(false); return; }

    // Historial en formato API (solo role + content string)
    const history = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    }));

    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: history, provider }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `Error ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEventType = "";

      const update = (fn: (m: Message) => Message) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? fn(m) : m))
        );

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const raw = line.slice(6).trim();
            let data: Record<string, unknown> = {};
            try { data = JSON.parse(raw); } catch { continue; }

            if (currentEventType === "text_delta") {
              const delta = (data.text as string) ?? "";
              update((m) => ({ ...m, content: m.content + delta }));
            } else if (currentEventType === "tool_start") {
              const ev: ToolEvent = { id: nanoid(), name: data.name as string, result: null };
              update((m) => ({ ...m, toolEvents: [...(m.toolEvents ?? []), ev] }));
            } else if (currentEventType === "tool_result") {
              const name = data.name as string;
              const result = data.result as Record<string, unknown>;
              update((m) => ({
                ...m,
                toolEvents: (m.toolEvents ?? []).map((ev) =>
                  ev.name === name && ev.result === null ? { ...ev, result } : ev
                ),
              }));
            } else if (currentEventType === "done") {
              update((m) => ({ ...m, streaming: false }));
            } else if (currentEventType === "error") {
              setError((data.message as string) ?? "Error del agente");
              update((m) => ({ ...m, streaming: false }));
            }
          }
        }
      }

      update((m) => ({ ...m, streaming: false }));
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
        );
      } else {
        const msg = err instanceof Error ? err.message : "Error inesperado";
        setError(msg);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false, content: m.content || "" } : m))
        );
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleNewChat = () => {
    if (loading) abortRef.current?.abort();
    setMessages([]);
    setError("");
    setInput("");
    titleSetRef.current = false;
    try { localStorage.removeItem(sessionStorageKey(sessionId)); } catch { /* noop */ }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3.5 shrink-0">
        <div>
          <h1 className="font-display text-base font-bold text-slate-900">Cotizador de viajes</h1>
          <p className="text-xs text-slate-400">Describí tu viaje y el agente arma el presupuesto</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 2v6h6"/><path d="M21 12A9 9 0 0 0 6 5.3L3 8"/>
              <path d="M21 22v-6h-6"/><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/>
            </svg>
            Nueva consulta
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="chat-scroll flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {messages.length === 0 ? (
          <EmptyState onSuggestion={(s) => sendMessage(s)} />
        ) : (
          <div className="mx-auto max-w-2xl space-y-5">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 md:px-8">
        <div className="mx-auto max-w-2xl">
          {/* Provider selector */}
          <div className="mb-3 flex items-center gap-1.5">
            <span className="text-xs text-slate-400 mr-1">Modelo:</span>
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id)}
                disabled={loading}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                  provider === p.id
                    ? p.activeClass
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-verde-400 focus-within:ring-2 focus-within:ring-verde-400/15 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => { setInput(e.target.value); adjustTextarea(); }}
              onKeyDown={handleKeyDown}
              placeholder="Describí tu viaje (destino, fechas, pasajeros)..."
              disabled={loading}
              className="flex-1 resize-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
              style={{ maxHeight: "140px" }}
            />
            {loading ? (
              <button
                onClick={handleStop}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-600 transition-colors hover:bg-slate-300"
                title="Detener"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2"/>
                </svg>
              </button>
            ) : (
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-verde-600 text-white transition-colors hover:bg-verde-500 disabled:opacity-40"
                title="Enviar (Enter)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            Enter para enviar · Shift+Enter para nueva línea
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onSuggestion }: { onSuggestion: (s: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full py-16 px-4">
      {/* Icon */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0b0f0b] shadow-lg shadow-black/20">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/>
        </svg>
      </div>

      <h2 className="font-display text-xl font-bold text-slate-900">
        ¿A dónde querés viajar?
      </h2>
      <p className="mt-2 max-w-xs text-center text-sm text-slate-500">
        Contame el destino, las fechas y cuántos pasajeros. Armo el presupuesto completo con vuelos y hotel.
      </p>

      {/* Suggestions */}
      <div className="mt-8 w-full max-w-lg grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-600 transition-all hover:border-verde-300 hover:bg-verde-50 hover:text-verde-800 hover:shadow-sm"
          >
            <span className="mr-2 text-verde-500">✈</span>
            {s}
          </button>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="mt-8 text-center text-xs text-slate-400">
        Necesitás tu Anthropic API key configurada en{" "}
        <a href="/dashboard/configuracion" className="text-verde-600 hover:underline">
          Configuración
        </a>{" "}
        para empezar.
      </p>
    </div>
  );
}
