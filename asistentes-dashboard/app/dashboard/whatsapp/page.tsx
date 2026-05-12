"use client";

import { useEffect, useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
const POLL_INTERVAL_MS = 3000;

type Estado = "cargando" | "desconectado" | "esperando_qr" | "conectado" | "error";

interface StatusResp {
  status: string;
  qr: string | null;
  baileys_offline?: boolean;
}

const STATUS_CONFIG = {
  conectado:    { color: "bg-verde-500",  pulse: true,  label: "WhatsApp conectado" },
  esperando_qr: { color: "bg-dorado-500", pulse: true,  label: "Esperando que escanees el QR…" },
  cargando:     { color: "bg-slate-300",  pulse: true,  label: "Verificando estado…" },
  desconectado: { color: "bg-slate-300",  pulse: false, label: "No conectado" },
  error:        { color: "bg-red-500",    pulse: false, label: "Error de conexión" },
};

export default function WhatsappPage() {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [iniciando, setIniciando] = useState(false);
  const [desconectando, setDesconectando] = useState(false);
  const estadoRef = useRef<Estado>("cargando");
  estadoRef.current = estado;
  const sinQRDesde = useRef<number | null>(null);

  useEffect(() => {
    checkStatus();
    const t = setInterval(checkStatus, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  async function checkStatus() {
    try {
      const r = await fetch(`${API_URL}/api/v1/wpp/status`);
      const data: StatusResp = await r.json();

      if (data.baileys_offline) {
        setEstado("error");
        setErrorMsg("El servicio de WhatsApp no está corriendo. Iniciá Baileys primero.");
        return;
      }

      if (data.status === "conectado") {
        setEstado("conectado");
        setQrDataUrl(null);
        sinQRDesde.current = null;
      } else if (data.status === "esperando_qr" && data.qr) {
        setEstado("esperando_qr");
        setQrDataUrl(data.qr);
        sinQRDesde.current = null;
      } else if (data.status === "esperando_qr" && !data.qr) {
        setEstado("esperando_qr");
        if (sinQRDesde.current === null) sinQRDesde.current = Date.now();
        if (Date.now() - sinQRDesde.current > 20_000) {
          setEstado("desconectado");
          setQrDataUrl(null);
          sinQRDesde.current = null;
        }
      } else {
        if (estadoRef.current !== "error") {
          setEstado("desconectado");
          setQrDataUrl(null);
          sinQRDesde.current = null;
        }
      }
    } catch {
      if (estadoRef.current === "cargando") {
        setEstado("error");
        setErrorMsg("No se pudo conectar al backend.");
      }
    }
  }

  async function iniciarConexion() {
    setIniciando(true);
    setErrorMsg(null);
    try {
      const r = await fetch(`${API_URL}/api/v1/wpp/connect`, { method: "POST" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail || "Error al iniciar");
      }
      const data: StatusResp = await r.json();
      if (data.qr) {
        setQrDataUrl(data.qr);
        setEstado("esperando_qr");
      } else {
        setEstado("esperando_qr");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido");
      setEstado("error");
    } finally {
      setIniciando(false);
    }
  }

  async function desconectar() {
    setDesconectando(true);
    try {
      await fetch(`${API_URL}/api/v1/wpp/disconnect`, { method: "DELETE" });
      setEstado("desconectado");
      setQrDataUrl(null);
    } finally {
      setDesconectando(false);
    }
  }

  const baileysOffline = errorMsg?.includes("Baileys");
  const sc = STATUS_CONFIG[estado];

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-slate-900">Conexión WhatsApp</h1>
        <p className="mt-1 text-sm text-slate-500">
          Conectá tu número para procesar facturas directo desde la app.
        </p>
      </header>

      {/* Card principal */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
        {/* Status bar */}
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${sc.color} ${sc.pulse ? "animate-pulse" : ""}`} />
          <span className="text-sm font-semibold text-slate-700">{sc.label}</span>
        </div>

        {/* QR */}
        {estado === "esperando_qr" && qrDataUrl && (
          <div className="space-y-4">
            <div className="flex justify-center rounded-2xl bg-white p-4 ring-1 ring-slate-100">
              <img src={qrDataUrl} alt="QR WhatsApp" className="h-56 w-56 object-contain" />
            </div>
            <div className="rounded-xl border border-dorado-200 bg-dorado-400/5 px-4 py-3 text-sm text-dorado-800">
              <p className="font-semibold mb-1.5">Cómo escanear:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs text-dorado-700">
                <li>Abrí WhatsApp en tu celular</li>
                <li>Tocá los tres puntos (⋮) → <strong>Dispositivos vinculados</strong></li>
                <li>Tocá <strong>"Vincular un dispositivo"</strong></li>
                <li>Apuntá la cámara al QR de arriba</li>
              </ol>
            </div>
            <p className="text-xs text-center text-slate-400">
              Esta pantalla se actualiza automáticamente al conectar.
            </p>
          </div>
        )}

        {/* Generando QR */}
        {estado === "esperando_qr" && !qrDataUrl && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-12 w-12 rounded-full border-4 border-slate-100 border-t-verde-500 animate-spin" />
            <p className="text-sm text-slate-500">Generando QR…</p>
          </div>
        )}

        {/* Conectado */}
        {estado === "conectado" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-verde-200 bg-verde-50 px-4 py-4">
              <p className="font-semibold text-verde-800">✅ Tu WhatsApp está vinculado</p>
              <p className="mt-1 text-xs text-verde-700">Enviá fotos de facturas y las registramos automáticamente.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 space-y-2">
              <p className="text-sm font-semibold text-slate-700">Comandos disponibles</p>
              <ul className="text-xs space-y-1.5 text-slate-600">
                {[
                  ["📸 Foto de factura", "la procesamos y te mandamos el resumen"],
                  ["si / no", "confirmar o descartar la última factura"],
                  ["resumen", "totales del mes actual"],
                  ["ayuda", "todos los comandos disponibles"],
                ].map(([cmd, desc]) => (
                  <li key={cmd} className="flex gap-2">
                    <span className="font-semibold text-verde-700 min-w-[90px]">{cmd}</span>
                    <span className="text-slate-500">{desc}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={desconectar}
              disabled={desconectando}
              className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              {desconectando ? "Desvinculando…" : "Desvincular este número"}
            </button>
          </div>
        )}

        {/* Desconectado */}
        {estado === "desconectado" && (
          <button
            onClick={iniciarConexion}
            disabled={iniciando}
            className="w-full rounded-xl bg-verde-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-verde-500 disabled:opacity-60"
          >
            {iniciando ? "Iniciando…" : "Conectar WhatsApp"}
          </button>
        )}

        {/* Error */}
        {estado === "error" && (
          <div className="space-y-3">
            {errorMsg && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}
            {baileysOffline ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 space-y-2">
                <p className="text-sm font-semibold text-slate-700">Iniciá el servicio en una terminal:</p>
                <pre className="text-xs text-slate-600 bg-white rounded-lg border border-slate-100 p-3 overflow-x-auto">
                  {"cd asistentes-backend/baileys_service\nnpm run dev"}
                </pre>
                <p className="text-xs text-slate-400">Esta pantalla se actualiza sola cuando esté corriendo.</p>
              </div>
            ) : (
              <button
                onClick={iniciarConexion}
                disabled={iniciando}
                className="w-full rounded-xl bg-verde-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-verde-500 disabled:opacity-60"
              >
                {iniciando ? "Reintentando…" : "Reintentar"}
              </button>
            )}
          </div>
        )}

        {estado === "cargando" && (
          <div className="py-4 text-center text-sm text-slate-400">Verificando estado…</div>
        )}
      </div>

      {/* Info */}
      <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 space-y-2">
        <p className="font-display text-sm font-bold text-slate-700">¿Cómo funciona?</p>
        <ul className="space-y-1.5 text-xs text-slate-500">
          {[
            "Tu sesión queda guardada — no necesitás escanear el QR cada vez.",
            "Cada cliente tiene su propia sesión aislada de WhatsApp.",
            "El bot solo procesa mensajes del número vinculado acá.",
            "Podés desvincular en cualquier momento desde esta pantalla.",
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <span className="text-verde-500 shrink-0">·</span>
              {t}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
