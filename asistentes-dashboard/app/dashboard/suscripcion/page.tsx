"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface EstadoSuscripcion {
  plan: "trial" | "solo" | "negocio";
  mp_preapproval_id: string | null;
  mp_plan_solicitado: string | null;
}

const PLANES = [
  {
    key: "trial",
    nombre: "Trial",
    precio: "Gratis",
    detalle: "Para empezar",
    features: [
      "WhatsApp dedicado",
      "Dashboard web",
      "Hasta 5 facturas/mes",
      "Validación AFIP",
    ],
    color: "border-slate-200",
  },
  {
    key: "solo",
    nombre: "Solo",
    precio: "$49.999",
    detalle: "por mes",
    features: [
      "Todo lo del Trial",
      "Hasta 80 facturas/mes",
      "Export Excel del período",
      "Alertas de tope monotributo",
      "PDF de factura por WhatsApp",
    ],
    color: "border-verde-400",
    destacado: true,
  },
  {
    key: "negocio",
    nombre: "Negocio",
    precio: "$69.999",
    detalle: "por mes",
    features: [
      "Todo lo de Solo",
      "Facturas ilimitadas",
      "Soporte prioritario por WhatsApp",
    ],
    color: "border-slate-200",
  },
];

export default function SuscripcionPage() {
  const [estado, setEstado] = useState<EstadoSuscripcion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<EstadoSuscripcion>("/api/v1/suscripcion/estado")
      .then(setEstado)
      .catch(() => setError("No se pudo cargar el estado del plan."))
      .finally(() => setCargando(false));
  }, []);

  async function handleUpgrade(planKey: string) {
    setProcesando(planKey);
    setError(null);
    try {
      const res = await apiFetch<{ checkout_url: string }>("/api/v1/suscripcion/checkout", {
        method: "POST",
        body: JSON.stringify({ plan: planKey }),
      });
      window.location.href = res.checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar el pago.");
      setProcesando(null);
    }
  }

  async function handleCancelar() {
    if (!confirm("¿Cancelar tu suscripción? Volvés al plan Trial al final del período.")) return;
    setCancelando(true);
    setError(null);
    try {
      await apiFetch("/api/v1/suscripcion", { method: "DELETE" });
      setEstado((prev) => prev ? { ...prev, plan: "trial", mp_preapproval_id: null } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cancelar.");
    } finally {
      setCancelando(false);
    }
  }

  const planActual = estado?.plan ?? "trial";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold text-slate-900">Plan y suscripción</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gestioná tu plan actual y cambialo cuando necesites.
        </p>
      </header>

      {cargando && (
        <div className="py-12 text-center text-sm text-slate-400">Cargando…</div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Plan actual badge */}
      {estado && (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-verde-50 text-xl">
            {planActual === "trial" ? "🆓" : planActual === "solo" ? "⚡" : "🚀"}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Plan actual</div>
            <div className="font-display text-lg font-bold text-slate-900 capitalize">{planActual}</div>
          </div>
          {planActual !== "trial" && (
            <button
              onClick={handleCancelar}
              disabled={cancelando}
              className="ml-auto text-xs text-slate-400 underline transition-colors hover:text-red-500 disabled:opacity-50"
            >
              {cancelando ? "Cancelando…" : "Cancelar suscripción"}
            </button>
          )}
        </div>
      )}

      {/* Cards de planes */}
      {!cargando && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PLANES.map((p) => {
            const esActual = p.key === planActual;
            const esMenor = (
              (p.key === "trial") ||
              (p.key === "solo" && planActual === "negocio")
            );

            return (
              <div
                key={p.key}
                className={`relative flex flex-col rounded-2xl border bg-white p-6 transition-all ${
                  esActual
                    ? "border-verde-400 shadow-lg shadow-verde-900/10"
                    : p.color
                }`}
              >
                {esActual && (
                  <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-verde-500 to-verde-300" />
                )}
                {p.destacado && !esActual && (
                  <span className="absolute right-4 top-4 rounded-full bg-verde-600 px-2.5 py-0.5 text-xs font-bold text-white">
                    Popular
                  </span>
                )}
                {esActual && (
                  <span className="absolute right-4 top-4 rounded-full bg-verde-100 px-2.5 py-0.5 text-xs font-bold text-verde-700">
                    Tu plan
                  </span>
                )}

                <div className="font-display text-sm font-bold uppercase tracking-widest text-slate-400">
                  {p.nombre}
                </div>
                <div className="mt-2 font-display text-3xl font-extrabold text-slate-900">
                  {p.precio}
                </div>
                <div className="text-xs text-slate-400">{p.detalle}</div>

                <ul className="mt-5 flex-1 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-verde-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  {esActual ? (
                    <div className="rounded-xl border border-verde-200 bg-verde-50 py-2.5 text-center text-sm font-semibold text-verde-700">
                      Plan activo
                    </div>
                  ) : esMenor ? (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 py-2.5 text-center text-sm text-slate-400">
                      Plan inferior
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(p.key)}
                      disabled={procesando === p.key}
                      className="w-full rounded-xl bg-verde-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-verde-500 disabled:opacity-60"
                    >
                      {procesando === p.key ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Redirigiendo…
                        </span>
                      ) : (
                        `Pasarme al ${p.nombre}`
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 space-y-1.5">
        <p className="text-sm font-semibold text-slate-700">Información sobre los planes</p>
        <ul className="space-y-1 text-xs text-slate-500">
          {[
            "El cobro es mensual y automático desde Mercado Pago.",
            "Podés cancelar en cualquier momento desde esta pantalla.",
            "Al cancelar, tu plan sigue activo hasta el fin del período pagado.",
            "Compatible con monotributistas y Responsables Inscriptos.",
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <span className="text-verde-500 shrink-0">·</span>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
