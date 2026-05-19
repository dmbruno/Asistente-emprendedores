"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

type KeysStatus = {
  has_anthropic_key: boolean;
  has_openai_key:    boolean;
  has_gemini_key:    boolean;
  has_serpapi:       boolean;
  anthropic_key_hint: string | null;
  openai_key_hint:    string | null;
  gemini_key_hint:    string | null;
  recipient_email:    string | null;
};

async function getToken() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function apiFetch(path: string, options?: RequestInit) {
  const token = await getToken();
  return fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });
}

const LLM_KEYS = [
  {
    id: "anthropic_api_key",
    label: "Anthropic — Claude",
    placeholder: "sk-ant-...",
    hint_field: "anthropic_key_hint",
    has_field: "has_anthropic_key",
    link: "https://console.anthropic.com",
    link_label: "console.anthropic.com",
    color: "verde",
  },
  {
    id: "openai_api_key",
    label: "OpenAI — GPT-4o",
    placeholder: "sk-...",
    hint_field: "openai_key_hint",
    has_field: "has_openai_key",
    link: "https://platform.openai.com/api-keys",
    link_label: "platform.openai.com",
    color: "cielo",
  },
  {
    id: "gemini_api_key",
    label: "Google — Gemini",
    placeholder: "AIza...",
    hint_field: "gemini_key_hint",
    has_field: "has_gemini_key",
    link: "https://aistudio.google.com/app/apikey",
    link_label: "aistudio.google.com",
    color: "dorado",
  },
] as const;

type LlmKeyId = "anthropic_api_key" | "openai_api_key" | "gemini_api_key";

export default function ConfiguracionPage() {
  const [status, setStatus] = useState<KeysStatus | null>(null);
  const [keys, setKeys] = useState<Record<LlmKeyId, string>>({
    anthropic_api_key: "", openai_api_key: "", gemini_api_key: "",
  });
  const [recipientEmail, setRecipientEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const refreshStatus = () =>
    apiFetch("/api/v1/keys").then((r) => r.json()).then(setStatus).catch(() => setError("No se pudo cargar la configuración."));

  useEffect(() => { refreshStatus(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(""); setSaved(false);
    const body: Record<string, string> = {};
    if (keys.anthropic_api_key) body.anthropic_api_key = keys.anthropic_api_key;
    if (keys.openai_api_key)    body.openai_api_key    = keys.openai_api_key;
    if (keys.gemini_api_key)    body.gemini_api_key    = keys.gemini_api_key;
    // recipient_email siempre se incluye (puede ser string vacío para borrar)
    body.recipient_email = recipientEmail;
    if (!Object.keys(body).length) { setSaving(false); return; }

    const res = await apiFetch("/api/v1/keys", { method: "PUT", body: JSON.stringify(body) });
    setSaving(false);
    if (!res.ok) { setError("Error al guardar. Verificá las keys."); return; }
    setSaved(true);
    setKeys({ anthropic_api_key: "", openai_api_key: "", gemini_api_key: "" });
    refreshStatus();
  };

  const handleDeleteAll = async () => {
    if (!confirm("¿Seguro? Se eliminan todas las API keys guardadas.")) return;
    setDeleting(true);
    await apiFetch("/api/v1/keys", { method: "DELETE" });
    setDeleting(false);
    refreshStatus();
  };

  const handleDeleteSingle = async (keyName: string) => {
    setDeletingKey(keyName);
    await apiFetch(`/api/v1/keys/${keyName}`, { method: "DELETE" });
    setDeletingKey(null);
    refreshStatus();
  };

  const hasAnyKey = status && (status.has_anthropic_key || status.has_openai_key || status.has_gemini_key);
  const hasAnyInput = Object.values(keys).some(Boolean);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-slate-900">Configuración</h1>
        <p className="mt-1 text-sm text-slate-500">
          Las API keys se guardan encriptadas y solo las usamos para procesar tus cotizaciones.
        </p>
      </div>

      {/* Cards de estado */}
      {status && (
        <div className="mb-6 space-y-3">
          {/* LLM keys */}
          <div className="grid grid-cols-3 gap-3">
            {LLM_KEYS.map((k) => (
              <KeyStatusCard
                key={k.id}
                label={k.label}
                active={(status as any)[k.has_field]}
                hint={(status as any)[k.hint_field]}
                color={k.color}
                onDelete={(status as any)[k.has_field] ? () => handleDeleteSingle(k.id.replace("_api_key", "")) : undefined}
                deleting={deletingKey === k.id.replace("_api_key", "")}
              />
            ))}
          </div>

          {/* SerpAPI — plataforma */}
          <div className={`rounded-2xl border p-4 ${status.has_serpapi ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-white"}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-slate-600">Google Flights &amp; Hotels</p>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">Plataforma</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${status.has_serpapi ? "bg-verde-500" : "bg-slate-300"}`} />
                  <span className={`text-xs font-medium ${status.has_serpapi ? "text-verde-700" : "text-slate-400"}`}>
                    {status.has_serpapi ? "Conectado — vuelos y hoteles reales via SerpAPI" : "Sin configurar — mostrará datos de ejemplo"}
                  </span>
                </div>
              </div>
              {status.has_serpapi && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-display text-base font-bold text-slate-800">Actualizar API keys</h2>
        <p className="mt-1 text-xs text-slate-400">
          Necesitás al menos una key de LLM para usar el chat. Dejá vacíos los campos que no querés cambiar.
        </p>

        <div className="mt-5 space-y-5">
          {LLM_KEYS.map((k) => (
            <KeyField
              key={k.id}
              label={k.label}
              placeholder={(status as any)?.[k.hint_field] ? `···· ${(status as any)[k.hint_field]}` : k.placeholder}
              value={keys[k.id as LlmKeyId]}
              onChange={(v) => setKeys((prev) => ({ ...prev, [k.id]: v }))}
              link={k.link}
              linkLabel={k.link_label}
            />
          ))}
        </div>

        {/* Email destino */}
        <div className="mt-6 border-t border-slate-100 pt-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Email destino de cotizaciones
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder={status?.recipient_email ?? "tucorreo@agencia.com"}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-verde-400 focus:outline-none focus:ring-2 focus:ring-verde-400/20 transition-all"
            />
            <p className="mt-1 text-xs text-slate-400">
              El agente usará este email por defecto al enviar cotizaciones.
              {status?.recipient_email && (
                <span className="ml-1 text-verde-600 font-medium">Configurado: {status.recipient_email}</span>
              )}
            </p>
          </div>
        </div>

        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
        {saved && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-verde-50 border border-verde-100 px-3 py-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span className="text-xs text-verde-700 font-medium">Keys guardadas correctamente</span>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          {hasAnyKey && (
            <button type="button" onClick={handleDeleteAll} disabled={deleting}
              className="text-xs text-red-400 transition-colors hover:text-red-600 disabled:opacity-40">
              {deleting ? "Eliminando..." : "Eliminar todas las keys"}
            </button>
          )}
          <button type="submit" disabled={saving || !hasAnyInput}
            className="ml-auto rounded-xl bg-verde-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-verde-500 disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>

      {/* Info */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-xs font-semibold text-slate-600">¿Cómo funciona?</h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Tus keys de LLM se encriptan con Fernet antes de guardarse. La búsqueda de vuelos y hoteles
          corre sobre Google Flights/Hotels (SerpAPI) — configurado a nivel de plataforma, sin costo extra para vos.
          Vos pagás directamente a Anthropic, OpenAI o Google por el uso del modelo que elijas.
        </p>
      </div>
    </div>
  );
}

function KeyField({ label, placeholder, value, onChange, link, linkLabel }: {
  label: string; placeholder: string; value: string;
  onChange: (v: string) => void; link?: string; linkLabel?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-verde-400 focus:outline-none focus:ring-2 focus:ring-verde-400/20 transition-all"
      />
      {link && (
        <p className="mt-1 text-xs text-slate-400">
          Obtenela en{" "}
          <a href={link} target="_blank" rel="noopener noreferrer" className="text-verde-600 hover:underline">{linkLabel}</a>
        </p>
      )}
    </div>
  );
}

function KeyStatusCard({ label, active, hint, color, onDelete, deleting }: {
  label: string; active: boolean; hint: string | null; color: string;
  onDelete?: () => void; deleting?: boolean;
}) {
  const activeBg = color === "cielo" ? "border-cielo-200 bg-cielo-50"
    : color === "dorado" ? "border-dorado-200 bg-dorado-50"
    : color === "verde" ? "border-verde-200 bg-verde-50"
    : "border-slate-200 bg-white";
  const dot = color === "cielo" ? "bg-cielo-500" : color === "dorado" ? "bg-dorado-500" : color === "verde" ? "bg-verde-500" : "bg-slate-300";
  const text = active
    ? color === "cielo" ? "text-cielo-700" : color === "dorado" ? "text-dorado-700" : color === "verde" ? "text-verde-700" : "text-slate-600"
    : "text-slate-400";

  return (
    <div className={`rounded-2xl border p-4 ${active ? activeBg : "border-slate-200 bg-white"}`}>
      <div className="flex items-start justify-between gap-1">
        <p className="text-xs font-semibold text-slate-600 leading-snug">{label}</p>
        {active && onDelete && (
          <button
            onClick={onDelete}
            disabled={deleting}
            title="Eliminar esta key"
            className="shrink-0 rounded-full p-0.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-400 disabled:opacity-40"
          >
            {deleting ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            )}
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${active ? dot : "bg-slate-300"}`} />
        <span className={`text-xs font-medium ${text}`}>
          {active ? `···· ${hint}` : "No configurada"}
        </span>
      </div>
    </div>
  );
}
