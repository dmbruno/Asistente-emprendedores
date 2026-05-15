"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { downloadCSV } from "@/lib/csv-export";
import { UpgradeBanner } from "@/components/ui/UpgradeBanner";
import { apiFetch } from "@/lib/api";

interface Factura {
  id: string;
  tipo: string;
  tipo_comprobante: string | null;
  numero: string | null;
  fecha: string | null;
  razon_social_contraparte: string | null;
  cuit_contraparte: string | null;
  total: number | null;
  moneda: string;
  estado: string;
  confianza_global: number | null;
}

const ESTADO_BADGE: Record<string, string> = {
  pendiente_revision: "bg-dorado-400/10 text-dorado-700 border border-dorado-200",
  confirmada:         "bg-verde-50 text-verde-700 border border-verde-200",
  corregida:          "bg-blue-50 text-blue-700 border border-blue-200",
  rechazada:          "bg-red-50 text-red-700 border border-red-200",
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente_revision: "pendiente",
  confirmada:         "confirmada",
  corregida:          "corregida",
  rechazada:          "rechazada",
};

export default function FacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [errorExport, setErrorExport] = useState<"upgrade" | "error" | null>(null);

  useEffect(() => {
    apiFetch<{ items: Factura[] }>("/api/v1/facturas")
      .then((d) => setFacturas(d.items || []))
      .catch(() => setError("No se pudo conectar al backend"))
      .finally(() => setCargando(false));
  }, []);

  async function handleExportCSV() {
    setDescargando(true);
    setErrorExport(null);
    const result = await downloadCSV("", "facturas.csv");
    if (result !== "ok") setErrorExport(result);
    setDescargando(false);
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta factura? Esta acción no se puede deshacer.")) return;
    setEliminando(id);
    try {
      await apiFetch(`/api/v1/facturas/${id}`, { method: "DELETE" });
      setFacturas((prev) => prev.filter((f) => f.id !== id));
    } finally {
      setEliminando(null);
    }
  }

  async function confirmar(id: string) {
    setConfirmando(id);
    try {
      await apiFetch(`/api/v1/facturas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "confirmada" }),
      });
      setFacturas((prev) =>
        prev.map((f) => (f.id === id ? { ...f, estado: "confirmada" } : f))
      );
    } finally {
      setConfirmando(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-slate-900">Facturas</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportCSV}
            disabled={descargando}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-verde-300 hover:text-verde-700 disabled:opacity-50"
          >
            {descargando
              ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />Descargando…</>
              : "↓ Exportar CSV"
            }
          </button>
          <Link
            href="/dashboard/facturas/upload"
            className="rounded-xl bg-verde-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-verde-500"
          >
            + Subir factura
          </Link>
        </div>
      </header>

      {errorExport === "upgrade" && <UpgradeBanner />}
      {errorExport === "error" && (
        <p className="text-xs text-red-500">Error al descargar. Intentá de nuevo.</p>
      )}

      {cargando && (
        <div className="py-12 text-center text-sm text-slate-400">Cargando…</div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!cargando && !error && facturas.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center">
          <div className="text-4xl">🧾</div>
          <p className="mt-3 text-sm font-medium text-slate-500">Todavía no hay facturas.</p>
          <p className="text-xs text-slate-400">Subí una desde acá o mandá una foto a tu WhatsApp.</p>
          <Link
            href="/dashboard/facturas/upload"
            className="mt-4 inline-block rounded-xl bg-verde-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-verde-500"
          >
            Subir primera factura
          </Link>
        </div>
      )}

      {facturas.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="border-b border-slate-100 bg-slate-50/80">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Fecha</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Tipo</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Comprobante</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Contraparte</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Total</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {facturas.map((f) => (
                <tr key={f.id} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 text-slate-500">{f.fecha ?? "—"}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      f.tipo === "venta"
                        ? "bg-verde-50 text-verde-700"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {f.tipo}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-700">
                    {f.tipo_comprobante ?? "—"}
                    {f.numero && <span className="ml-1 text-slate-400">#{f.numero}</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-slate-800">{f.razon_social_contraparte ?? "—"}</div>
                    <div className="text-xs text-slate-400">
                      {f.cuit_contraparte && <span>{f.cuit_contraparte} · </span>}
                      <span className="italic">{f.tipo === "venta" ? "receptor" : "emisor"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right font-display font-semibold text-slate-800">
                    {f.total != null ? `$${f.total.toLocaleString("es-AR")} ${f.moneda}` : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      ESTADO_BADGE[f.estado] ?? "bg-slate-100 text-slate-600"
                    }`}>
                      {ESTADO_LABEL[f.estado] ?? f.estado}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {f.estado === "pendiente_revision" && (
                        <button
                          onClick={() => confirmar(f.id)}
                          disabled={confirmando === f.id}
                          className="rounded-lg border border-verde-200 bg-verde-50 px-3 py-1 text-xs font-semibold text-verde-700 transition-colors hover:bg-verde-100 disabled:opacity-50"
                        >
                          {confirmando === f.id ? "…" : "Confirmar"}
                        </button>
                      )}
                      <button
                        onClick={() => eliminar(f.id)}
                        disabled={eliminando === f.id}
                        title="Eliminar factura"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                      >
                        {eliminando === f.id ? (
                          <span className="text-xs">…</span>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
