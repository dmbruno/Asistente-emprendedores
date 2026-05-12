"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

const PROVEEDORES = [
  {
    id: "anthropic",
    nombre: "Anthropic (Claude)",
    placeholder: "sk-ant-api03-...",
    descripcion: "Usada para extraer datos de tus facturas con visión IA.",
    link: "https://console.anthropic.com/settings/keys",
    linkLabel: "Anthropic Console",
  },
  {
    id: "openai",
    nombre: "OpenAI (GPT-4o)",
    placeholder: "sk-proj-...",
    descripcion: "Alternativa a Claude para extracción de facturas.",
    link: "https://platform.openai.com/api-keys",
    linkLabel: "OpenAI Platform",
  },
  {
    id: "google",
    nombre: "Google (Gemini)",
    placeholder: "AIza...",
    descripcion: "Alternativa a Claude con Gemini Vision.",
    link: "https://aistudio.google.com/app/apikey",
    linkLabel: "Google AI Studio",
  },
];

interface ApiKey {
  id: string;
  provider: string;
  key_hint: string;
  created_at: string;
  last_used_at: string | null;
}

type Estado = "idle" | "guardando" | "ok" | "error";

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [cargando, setCargando] = useState(true);

  // Form por proveedor
  const [providerActivo, setProviderActivo] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState("");
  const [mostrarKey, setMostrarKey] = useState(false);
  const [estado, setEstado] = useState<Estado>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Eliminación
  const [eliminando, setEliminando] = useState<string | null>(null);

  useEffect(() => {
    cargarKeys();
  }, []);

  function cargarKeys() {
    setCargando(true);
    fetch(`${API_URL}/api/v1/api-keys`)
      .then((r) => r.json())
      .then((d) => setKeys(d.items || []))
      .finally(() => setCargando(false));
  }

  function abrirForm(provider: string) {
    setProviderActivo(provider);
    setInputKey("");
    setMostrarKey(false);
    setEstado("idle");
    setErrorMsg(null);
  }

  function cerrarForm() {
    setProviderActivo(null);
    setInputKey("");
    setEstado("idle");
    setErrorMsg(null);
  }

  async function guardar() {
    if (!inputKey.trim() || !providerActivo) return;
    setEstado("guardando");
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerActivo, api_key: inputKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al guardar");

      setEstado("ok");
      setTimeout(() => {
        cerrarForm();
        cargarKeys();
      }, 1200);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido");
      setEstado("error");
    }
  }

  async function eliminar(keyId: string) {
    setEliminando(keyId);
    try {
      await fetch(`${API_URL}/api/v1/api-keys/${keyId}`, { method: "DELETE" });
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
    } finally {
      setEliminando(null);
    }
  }

  const keyPorProvider = (provider: string) =>
    keys.find((k) => k.provider === provider);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">API keys (BYOK)</h1>
        <p className="text-sm text-slate-500">
          Traé tu propia API key de cada proveedor. Se guarda encriptada con AES-128
          y nunca se muestra en limpio. Podés cambiarla o eliminarla en cualquier momento.
        </p>
      </header>

      {cargando && (
        <div className="py-8 text-center text-sm text-slate-400">Cargando…</div>
      )}

      {!cargando && (
        <div className="space-y-3">
          {PROVEEDORES.map((prov) => {
            const keyGuardada = keyPorProvider(prov.id);
            const estaAbierto = providerActivo === prov.id;

            return (
              <div
                key={prov.id}
                className="rounded-lg border border-slate-200 bg-white overflow-hidden"
              >
                {/* Fila del proveedor */}
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">
                        {prov.nombre}
                      </span>
                      {keyGuardada && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Configurada
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{prov.descripcion}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {keyGuardada && (
                      <>
                        <span className="text-xs text-slate-400 font-mono">
                          ···{keyGuardada.key_hint}
                        </span>
                        <button
                          onClick={() => eliminar(keyGuardada.id)}
                          disabled={eliminando === keyGuardada.id}
                          className="rounded px-2 py-1 text-xs text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50"
                        >
                          {eliminando === keyGuardada.id ? "…" : "Eliminar"}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => estaAbierto ? cerrarForm() : abrirForm(prov.id)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                        estaAbierto
                          ? "border border-slate-300 text-slate-600 hover:bg-slate-50"
                          : keyGuardada
                          ? "border border-slate-300 text-slate-600 hover:bg-slate-50"
                          : "bg-brand text-brand-fg"
                      }`}
                    >
                      {estaAbierto ? "Cancelar" : keyGuardada ? "Cambiar" : "Agregar"}
                    </button>
                  </div>
                </div>

                {/* Form inline */}
                {estaAbierto && (
                  <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 space-y-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">
                        API key de {prov.nombre}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type={mostrarKey ? "text" : "password"}
                          value={inputKey}
                          onChange={(e) => {
                            setInputKey(e.target.value);
                            setEstado("idle");
                            setErrorMsg(null);
                          }}
                          placeholder={prov.placeholder}
                          autoComplete="off"
                          autoFocus
                          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/40"
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarKey((v) => !v)}
                          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-500 hover:bg-slate-50"
                        >
                          {mostrarKey ? "Ocultar" : "Ver"}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400">
                        Obtené tu key en{" "}
                        <span className="font-medium text-slate-600">{prov.linkLabel}</span>.
                        La guardamos encriptada, nunca la enviamos a terceros.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={guardar}
                        disabled={!inputKey.trim() || estado === "guardando"}
                        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg disabled:opacity-50"
                      >
                        {estado === "guardando" ? "Guardando…" : keyGuardada ? "Reemplazar key" : "Guardar key"}
                      </button>
                      {estado === "ok" && (
                        <span className="text-sm text-emerald-600 font-medium">
                          Guardada correctamente.
                        </span>
                      )}
                      {estado === "error" && (
                        <span className="text-sm text-red-600">{errorMsg}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info de seguridad */}
      <section className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 space-y-2 text-xs text-slate-500">
        <p className="font-semibold text-slate-700 text-sm">¿Cómo protegemos tu key?</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Se encripta con Fernet (AES-128-CBC + HMAC-SHA256) antes de guardarse.</li>
          <li>Solo se desencripta en el momento exacto de procesar una factura, en memoria del servidor.</li>
          <li>Nunca se loguea, nunca se envía a terceros, nunca se devuelve por la API.</li>
          <li>Podés cambiarla o eliminarla en cualquier momento desde acá.</li>
        </ul>
      </section>
    </div>
  );
}
