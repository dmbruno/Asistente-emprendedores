"use client";

import { useEffect, useState } from "react";
import YearPicker from "@/components/ui/YearPicker";
import { downloadCSV } from "@/lib/csv-export";
import { UpgradeBanner } from "@/components/ui/UpgradeBanner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

const LIMITES_MONOTRIBUTO: Record<string, number> = {
  A: 7_400_000,  B: 11_000_000, C: 15_400_000, D: 19_100_000,
  E: 23_100_000, F: 27_500_000, G: 32_100_000, H: 37_900_000,
  I: 45_200_000, J: 54_100_000, K: 65_100_000,
};

interface Cliente { condicion_fiscal: string; categoria_monotributo: string | null }
interface PorMes { mes: number; compras: number; ventas: number; debito_iva: number; credito_iva: number }
interface PosicionIva { debito_fiscal: number; credito_fiscal: number; saldo: number }
interface ResumenAnual {
  anio: number;
  condicion_fiscal: string;
  por_mes: PorMes[];
  acumulado: { ventas: number; compras: number };
}

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const fmt = (n: number) =>
  `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function BarraProgreso({ valor, maximo, label }: { valor: number; maximo: number; label: string }) {
  const pct = maximo > 0 ? Math.min((valor / maximo) * 100, 100) : 0;
  const color = pct >= 90 ? "bg-red-500" : pct >= 75 ? "bg-dorado-500" : "bg-verde-500";
  const textColor = pct >= 90 ? "text-red-600" : pct >= 75 ? "text-dorado-600" : "text-verde-600";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="text-slate-500">
          {fmt(valor)} / {fmt(maximo)}
          <span className={`ml-2 font-bold ${textColor}`}>({pct.toFixed(1)}%)</span>
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {pct >= 90 && <p className="text-xs font-medium text-red-600">Estás cerca del límite. Consultá con tu contador.</p>}
      {pct >= 75 && pct < 90 && <p className="text-xs text-dorado-600">Superaste el 75% del límite anual.</p>}
    </div>
  );
}

function GraficoBarras({ datos }: { datos: PorMes[] }) {
  const maxVal = Math.max(...datos.flatMap((d) => [d.compras, d.ventas]), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-5 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-3.5 rounded bg-verde-500" /> Ventas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-3.5 rounded bg-slate-200" /> Compras
        </span>
      </div>
      <div className="flex items-end gap-1" style={{ height: 160 }}>
        {datos.map((d) => {
          const ventaH = (d.ventas / maxVal) * 140;
          const compraH = (d.compras / maxVal) * 140;
          return (
            <div key={d.mes} className="flex flex-1 flex-col items-center gap-0.5">
              <div className="flex w-full items-end gap-0.5" style={{ height: 140 }}>
                <div
                  className="flex-1 rounded-t bg-verde-500 transition-all hover:bg-verde-400"
                  style={{ height: ventaH || 2 }}
                  title={`Ventas: ${fmt(d.ventas)}`}
                />
                <div
                  className="flex-1 rounded-t bg-slate-200 transition-all hover:bg-slate-300"
                  style={{ height: compraH || 2 }}
                  title={`Compras: ${fmt(d.compras)}`}
                />
              </div>
              <span className="text-[10px] text-slate-400">{MESES[d.mes - 1]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PosicionIVA({ posicion }: { posicion: PosicionIva }) {
  const { debito_fiscal, credito_fiscal, saldo } = posicion;
  const aFavor = saldo <= 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-display font-bold text-slate-800">Posición de IVA</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Período
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Débito fiscal</div>
          <div className="mt-1.5 font-display text-xl font-bold text-slate-800">{fmt(debito_fiscal)}</div>
          <div className="mt-0.5 text-xs text-slate-400">IVA de ventas</div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Crédito fiscal</div>
          <div className="mt-1.5 font-display text-xl font-bold text-slate-800">{fmt(credito_fiscal)}</div>
          <div className="mt-0.5 text-xs text-slate-400">IVA de compras</div>
        </div>
        <div className={`rounded-xl border p-4 ${aFavor ? "border-verde-200 bg-verde-50/40" : "border-dorado-200 bg-dorado-50/40"}`}>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Saldo</div>
          <div className={`mt-1.5 font-display text-xl font-bold ${aFavor ? "text-verde-700" : "text-dorado-700"}`}>
            {aFavor ? "A favor " : ""}{fmt(Math.abs(saldo))}
          </div>
          <div className={`mt-0.5 text-xs ${aFavor ? "text-verde-600" : "text-dorado-600"}`}>
            {aFavor ? "Saldo a tu favor" : "A pagar a AFIP"}
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-400">
        Basado en las facturas registradas en este período. Consultá con tu contador antes de presentar la DDJJ.
      </p>
    </div>
  );
}

export default function ResumenPage() {
  const anioActual = new Date().getFullYear();
  const [anio, setAnio] = useState(anioActual);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [resumen, setResumen] = useState<ResumenAnual | null>(null);
  const [cargando, setCargando] = useState(true);
  const [descargando, setDescargando] = useState(false);
  const [errorExport, setErrorExport] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/me`).then((r) => r.json()).then(setCliente);
  }, []);

  useEffect(() => {
    setCargando(true);
    setResumen(null);
    fetch(`${API_URL}/api/v1/facturas/resumen/anual?anio=${anio}`)
      .then((r) => r.json())
      .then(setResumen)
      .finally(() => setCargando(false));
  }, [anio]);

  async function handleDescargarCSV() {
    setDescargando(true);
    setErrorExport(null);
    const result = await downloadCSV("", `facturas-${anio}.csv`);
    if (result !== "ok") setErrorExport(result);
    setDescargando(false);
  }

  const condicionFiscal = resumen?.condicion_fiscal ?? cliente?.condicion_fiscal ?? "monotributo";
  const esMonotributo = condicionFiscal === "monotributo";
  const esRI = condicionFiscal === "responsable_inscripto";
  const categoria = cliente?.categoria_monotributo?.toUpperCase();
  const limite = categoria ? LIMITES_MONOTRIBUTO[categoria] ?? null : null;
  const ventasAcum = resumen?.acumulado.ventas ?? 0;
  const comprasAcum = resumen?.acumulado.compras ?? 0;

  // Posición IVA: calculada sumando por_mes para el año completo
  const posicionIva: PosicionIva | null = esRI && resumen
    ? (() => {
        const debito = resumen.por_mes.reduce((s, m) => s + (m.debito_iva ?? 0), 0);
        const credito = resumen.por_mes.reduce((s, m) => s + (m.credito_iva ?? 0), 0);
        return { debito_fiscal: debito, credito_fiscal: credito, saldo: debito - credito };
      })()
    : null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Resumen {anio}</h1>
          {cliente && (
            <p className="mt-0.5 text-sm text-slate-500 capitalize">
              {cliente.condicion_fiscal}
              {categoria && <> · Categoría <span className="font-semibold text-verde-600">{categoria}</span></>}
            </p>
          )}
        </div>
        <YearPicker year={anio} onChange={setAnio} min={2020} max={anioActual} />
      </header>

      {cargando && <div className="py-4 text-center text-sm text-slate-400">Cargando…</div>}

      {/* Cards acumulado */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Ventas acumuladas", value: ventasAcum, color: "text-verde-600", accent: "border-verde-200 bg-verde-50/40" },
          { label: "Compras acumuladas", value: comprasAcum, color: "text-slate-800", accent: "border-slate-200 bg-white" },
          { label: "Neto", value: ventasAcum - comprasAcum, color: ventasAcum - comprasAcum >= 0 ? "text-slate-900" : "text-red-600", accent: "border-slate-200 bg-white" },
        ].map((c) => (
          <div key={c.label} className={`rounded-2xl border p-5 ${c.accent}`}>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{c.label}</div>
            <div className={`mt-2 font-display text-2xl font-bold ${c.color}`}>{fmt(c.value)}</div>
          </div>
        ))}
      </div>

      {/* Tope monotributo */}
      {esMonotributo && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <h2 className="font-display font-bold text-slate-800">Tope de facturación</h2>
          {limite ? (
            <BarraProgreso valor={ventasAcum} maximo={limite} label={`Categoría ${categoria} — límite anual`} />
          ) : (
            <p className="text-sm text-slate-500">
              Configurá tu categoría en{" "}
              <a href="/dashboard/configuracion" className="font-semibold text-verde-600 underline">Configuración</a>{" "}
              para ver tu tope.
            </p>
          )}
          {limite && <p className="text-xs text-slate-400">Límites de monotributo 2025.</p>}
        </div>
      )}

      {/* Posición IVA — solo para RI */}
      {esRI && posicionIva && <PosicionIVA posicion={posicionIva} />}

      {/* Gráfico */}
      {resumen && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <h2 className="font-display font-bold text-slate-800">Compras vs Ventas por mes</h2>
          <GraficoBarras datos={resumen.por_mes} />
        </div>
      )}

      {/* Tabla mensual */}
      {resumen && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[420px]">
            <thead className="border-b border-slate-100 bg-slate-50/80">
              <tr>
                {(esRI
                  ? ["Mes", "Ventas", "Compras", "Neto", "Déb. IVA", "Cré. IVA", "Pos. IVA"]
                  : ["Mes", "Ventas", "Compras", "Neto"]
                ).map((h, i) => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 ${i === 0 ? "text-left" : "text-right"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {resumen.por_mes.filter((m) => m.ventas > 0 || m.compras > 0).map((m) => {
                const posIvaMes = (m.debito_iva ?? 0) - (m.credito_iva ?? 0);
                return (
                  <tr key={m.mes} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-slate-700">{MESES[m.mes - 1]}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-verde-600">{fmt(m.ventas)}</td>
                    <td className="px-4 py-3.5 text-right text-slate-500">{fmt(m.compras)}</td>
                    <td className="px-4 py-3.5 text-right font-display font-bold text-slate-800">{fmt(m.ventas - m.compras)}</td>
                    {esRI && (
                      <>
                        <td className="px-4 py-3.5 text-right text-slate-500">{fmt(m.debito_iva ?? 0)}</td>
                        <td className="px-4 py-3.5 text-right text-slate-500">{fmt(m.credito_iva ?? 0)}</td>
                        <td className={`px-4 py-3.5 text-right font-semibold ${posIvaMes > 0 ? "text-dorado-700" : "text-verde-600"}`}>
                          {posIvaMes > 0 ? "" : "+"}{fmt(Math.abs(posIvaMes))}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
              {resumen.por_mes.every((m) => m.ventas === 0 && m.compras === 0) && (
                <tr>
                  <td colSpan={esRI ? 7 : 4} className="px-5 py-10 text-center text-sm text-slate-400">
                    Sin movimientos en {anio}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Export */}
      <div className="space-y-3">
        <button
          onClick={handleDescargarCSV}
          disabled={descargando}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-verde-300 hover:text-verde-700 disabled:opacity-50"
        >
          {descargando ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          ) : (
            <span>↓</span>
          )}
          {descargando ? "Descargando…" : "Descargar CSV"}
        </button>

        {errorExport === "upgrade" && <UpgradeBanner />}

        {errorExport === "error" && (
          <p className="text-xs text-red-500">Error al descargar. Intentá de nuevo.</p>
        )}
      </div>
    </div>
  );
}
