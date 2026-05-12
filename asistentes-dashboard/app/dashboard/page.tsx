"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import YearPicker from "@/components/ui/YearPicker";
import { downloadCSV } from "@/lib/csv-export";
import { UpgradeBanner } from "@/components/ui/UpgradeBanner";
import { apiFetch } from "@/lib/api";

const LIMITE_POR_CAT: Record<string, number> = {
  A: 7_400_000,  B: 11_000_000, C: 15_400_000, D: 19_100_000,
  E: 23_100_000, F: 27_500_000, G: 32_100_000, H: 37_900_000,
  I: 45_200_000, J: 54_100_000, K: 65_100_000,
};

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

interface ResumenAnual {
  acumulado: { compras: number; ventas: number };
}

interface ResumenMes {
  condicion_fiscal: string;
  totales: { compras: number; ventas: number; neto: number };
  cantidad: { compras: number; ventas: number; pendientes: number };
  posicion_iva?: { debito_fiscal: number; credito_fiscal: number; saldo: number };
}

interface Cliente {
  condicion_fiscal: string;
  categoria_monotributo: string | null;
}

interface IvaMesData {
  posicion_iva: { debito_fiscal: number; credito_fiscal: number; saldo: number } | null;
  ventas: number;
  compras: number;
}

const fmt = (n: number) =>
  `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function DashboardHome() {
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;

  const [anioSeleccionado, setAnioSeleccionado] = useState(anioActual);
  const [anual, setAnual] = useState<ResumenAnual | null>(null);
  const [mensual, setMensual] = useState<ResumenMes | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [cargando, setCargando] = useState(true);

  // Estado del mes para RI
  const [mesSeleccionado, setMesSeleccionado] = useState(mesActual);
  const [anioMes, setAnioMes] = useState(anioActual);
  const [ivaMesData, setIvaMesData] = useState<IvaMesData | null>(null);
  const [cargandoIva, setCargandoIva] = useState(false);

  const [descargando, setDescargando] = useState<string | null>(null);
  const [errorExport, setErrorExport] = useState<"upgrade" | "error" | null>(null);

  // Carga principal: annual + pendientes + perfil del cliente
  useEffect(() => {
    setCargando(true);
    setAnual(null);
    Promise.all([
      apiFetch<ResumenAnual>(`/api/v1/facturas/resumen/anual?anio=${anioSeleccionado}`),
      apiFetch<ResumenMes>(`/api/v1/facturas/resumen?mes=${mesActual}&anio=${anioActual}`),
      apiFetch<Cliente>(`/api/v1/me`),
    ]).then(([a, m, c]) => {
      setAnual(a);
      setMensual(m);
      setCliente(c);
    }).catch(() => null)
      .finally(() => setCargando(false));
  }, [anioSeleccionado]);

  // Carga mensual de IVA para RI (reactiva al mes seleccionado)
  useEffect(() => {
    const condicion = cliente?.condicion_fiscal ?? mensual?.condicion_fiscal;
    if (condicion !== "responsable_inscripto") return;
    setCargandoIva(true);
    apiFetch<ResumenMes>(`/api/v1/facturas/resumen?mes=${mesSeleccionado}&anio=${anioMes}`)
      .then(d => setIvaMesData({
        posicion_iva: d.posicion_iva ?? null,
        ventas: d.totales.ventas,
        compras: d.totales.compras,
      }))
      .catch(() => null)
      .finally(() => setCargandoIva(false));
  }, [mesSeleccionado, anioMes, cliente, mensual]);

  function navMes(delta: number) {
    let m = mesSeleccionado + delta;
    let a = anioMes;
    if (m > 12) { m = 1; a++; }
    if (m < 1)  { m = 12; a--; }
    if (a > anioActual || (a === anioActual && m > mesActual)) return;
    setMesSeleccionado(m);
    setAnioMes(a);
  }

  const esUltimoMes = mesSeleccionado === mesActual && anioMes === anioActual;

  const ventasAnuales = anual?.acumulado?.ventas ?? 0;
  const comprasAnuales = anual?.acumulado?.compras ?? 0;
  const pendientes = mensual?.cantidad.pendientes ?? 0;

  const cat = cliente?.categoria_monotributo?.toUpperCase();
  const condicionFiscal = mensual?.condicion_fiscal ?? cliente?.condicion_fiscal ?? "monotributo";
  const esMonotributo = condicionFiscal === "monotributo";
  const esRI = condicionFiscal === "responsable_inscripto";
  const limite = cat ? LIMITE_POR_CAT[cat] ?? null : null;
  const pctTope = limite && ventasAnuales > 0 && anioSeleccionado === anioActual
    ? Math.min((ventasAnuales / limite) * 100, 100)
    : 0;

  const cards = [
    {
      label: `Ventas ${anioSeleccionado}`,
      value: anual ? fmt(ventasAnuales) : "—",
      sub: anual ? ((anual.acumulado?.ventas ?? 0) === 0 ? "Sin ventas aún" : "acumulado anual") : "",
      color: "text-verde-600",
      accent: "border-verde-200 bg-verde-50/40",
      dot: "bg-verde-500",
    },
    {
      label: `Compras ${anioSeleccionado}`,
      value: anual ? fmt(comprasAnuales) : "—",
      sub: anual ? "acumulado anual" : "",
      color: "text-slate-800",
      accent: "border-slate-200 bg-white",
      dot: "bg-slate-400",
    },
    {
      label: "Pendientes",
      value: mensual ? String(pendientes) : "—",
      sub: pendientes > 0 ? "Requieren confirmación" : "Al día",
      color: pendientes > 0 ? "text-dorado-600" : "text-slate-800",
      accent: pendientes > 0 ? "border-dorado-200 bg-dorado-400/5" : "border-slate-200 bg-white",
      dot: pendientes > 0 ? "bg-dorado-500" : "bg-slate-300",
    },
    {
      label: `Neto ${anioSeleccionado}`,
      value: anual ? fmt(ventasAnuales - comprasAnuales) : "—",
      sub: "Ventas − Compras",
      color: (ventasAnuales - comprasAnuales) >= 0 ? "text-slate-800" : "text-red-600",
      accent: "border-slate-200 bg-white",
      dot: "bg-slate-400",
    },
  ];

  async function handleExport(params: string, filename: string) {
    setDescargando(params);
    setErrorExport(null);
    const result = await downloadCSV(params, filename);
    if (result !== "ok") setErrorExport(result);
    setDescargando(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Inicio</h1>
          {esMonotributo && cat && (
            <p className="mt-0.5 text-sm text-slate-500">
              Monotributo · Categoría <span className="font-semibold text-verde-600">{cat}</span>
            </p>
          )}
          {esRI && (
            <p className="mt-0.5 text-sm text-slate-500">Responsable Inscripto</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <YearPicker year={anioSeleccionado} onChange={setAnioSeleccionado} min={2020} max={anioActual} />
          <Link
            href="/dashboard/facturas/upload"
            className="rounded-xl bg-verde-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-verde-500 transition-colors"
          >
            + Subir factura
          </Link>
        </div>
      </header>

      {cargando && (
        <div className="py-4 text-center text-sm text-slate-400">Cargando…</div>
      )}

      {/* Cards anuales */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border p-5 transition-shadow hover:shadow-sm ${card.accent}`}
          >
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${card.dot}`} />
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {card.label}
              </div>
            </div>
            <div className={`mt-3 font-display text-2xl font-bold ${card.color}`}>
              {card.value}
            </div>
            {card.sub && (
              <div className="mt-1 text-xs text-slate-400">{card.sub}</div>
            )}
          </div>
        ))}
      </section>

      {/* Barra de tope monotributo */}
      {esMonotributo && limite && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-display text-sm font-bold text-slate-700">
              Tope anual — categoría {cat}
            </h2>
            <span className="text-sm text-slate-500">
              {fmt(ventasAnuales)}{" "}
              <span className="text-slate-300">/</span>{" "}
              {fmt(limite)}
              <span className={`ml-2 font-bold ${
                pctTope >= 90 ? "text-red-600" : pctTope >= 75 ? "text-dorado-600" : "text-verde-600"
              }`}>
                {pctTope.toFixed(1)}%
              </span>
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pctTope >= 90 ? "bg-red-500" : pctTope >= 75 ? "bg-dorado-500" : "bg-verde-500"
              }`}
              style={{ width: `${pctTope}%` }}
            />
          </div>
          {pctTope >= 80 && (
            <p className="text-xs font-medium text-dorado-700">
              Atención: superaste el {pctTope.toFixed(0)}% del límite. Consultá con tu contador.
            </p>
          )}
          {pctTope === 0 && (
            <p className="text-xs text-slate-400">
              Sin ventas registradas aún este año.{" "}
              <Link href="/dashboard/resumen" className="text-verde-600 underline">Ver resumen →</Link>
            </p>
          )}
          <Link href="/dashboard/resumen" className="block text-xs font-medium text-verde-600 hover:text-verde-500">
            Ver desglose mensual →
          </Link>
        </section>
      )}

      {/* Posición IVA con navegación mensual — solo RI */}
      {esRI && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          {/* Encabezado con navegación de mes */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-display text-sm font-bold text-slate-700">Posición de IVA</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navMes(-1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                title="Mes anterior"
              >
                ‹
              </button>
              <span className="min-w-[120px] text-center text-sm font-semibold text-slate-700">
                {MESES[mesSeleccionado - 1]} {anioMes}
              </span>
              <button
                onClick={() => navMes(1)}
                disabled={esUltimoMes}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Mes siguiente"
              >
                ›
              </button>
              <Link
                href="/dashboard/resumen"
                className="ml-2 text-xs font-medium text-verde-600 hover:text-verde-500"
              >
                Ver anual →
              </Link>
            </div>
          </div>

          {cargandoIva ? (
            <div className="py-4 text-center text-sm text-slate-400">Cargando…</div>
          ) : ivaMesData ? (
            <>
              {/* Totales del mes como contexto */}
              <div className="flex gap-4 rounded-xl bg-slate-50 px-4 py-3">
                <div className="flex-1">
                  <div className="text-xs text-slate-400">Ventas del mes</div>
                  <div className="font-display text-sm font-bold text-verde-700">
                    {fmt(ivaMesData.ventas)}
                  </div>
                </div>
                <div className="w-px bg-slate-200" />
                <div className="flex-1">
                  <div className="text-xs text-slate-400">Compras del mes</div>
                  <div className="font-display text-sm font-bold text-slate-700">
                    {fmt(ivaMesData.compras)}
                  </div>
                </div>
                <div className="w-px bg-slate-200" />
                <div className="flex-1">
                  <div className="text-xs text-slate-400">Neto</div>
                  <div className={`font-display text-sm font-bold ${
                    ivaMesData.ventas - ivaMesData.compras >= 0 ? "text-slate-700" : "text-red-600"
                  }`}>
                    {fmt(ivaMesData.ventas - ivaMesData.compras)}
                  </div>
                </div>
              </div>

              {/* Posición de IVA */}
              {ivaMesData.posicion_iva ? (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Débito", value: ivaMesData.posicion_iva.debito_fiscal, sub: "IVA ventas", color: "text-slate-800" },
                    { label: "Crédito", value: ivaMesData.posicion_iva.credito_fiscal, sub: "IVA compras", color: "text-slate-800" },
                    {
                      label: ivaMesData.posicion_iva.saldo > 0 ? "A pagar" : ivaMesData.posicion_iva.saldo < 0 ? "A favor" : "Neutro",
                      value: Math.abs(ivaMesData.posicion_iva.saldo),
                      sub: "saldo neto",
                      color: ivaMesData.posicion_iva.saldo > 0 ? "text-dorado-700" : ivaMesData.posicion_iva.saldo < 0 ? "text-verde-600" : "text-slate-500",
                    },
                  ].map((item) => (
                    <div key={item.label} className="text-center">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{item.label}</div>
                      <div className={`mt-1 font-display text-lg font-bold ${item.color}`}>{fmt(item.value)}</div>
                      <div className="text-xs text-slate-400">{item.sub}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-slate-400 py-2">
                  Sin facturas confirmadas en {MESES[mesSeleccionado - 1].toLowerCase()}.
                </p>
              )}
            </>
          ) : (
            <p className="text-center text-sm text-slate-400 py-2">
              Sin datos para {MESES[mesSeleccionado - 1].toLowerCase()} {anioMes}.
            </p>
          )}
        </section>
      )}

      {/* Hint si no tiene categoría (mono) */}
      {esMonotributo && !cat && (
        <section className="rounded-2xl border border-dorado-200 bg-dorado-400/5 px-5 py-4 text-sm text-dorado-800">
          Configurá tu categoría de monotributo para ver el tope anual.{" "}
          <Link href="/dashboard/configuracion" className="font-semibold underline">
            Ir a Configuración →
          </Link>
        </section>
      )}

      {/* Exportar */}
      <section>
        <h2 className="mb-3 font-display text-sm font-bold text-slate-500 uppercase tracking-wider">Exportar</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Compras CSV", params: "?tipo=compra", file: "compras.csv" },
            { label: "Ventas CSV",  params: "?tipo=venta",  file: "ventas.csv"  },
            { label: "Todo CSV",    params: "",              file: "facturas.csv" },
          ].map((e) => (
            <button
              key={e.label}
              onClick={() => handleExport(e.params, e.file)}
              disabled={descargando !== null}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-verde-300 hover:text-verde-700 disabled:opacity-50"
            >
              {descargando === e.params
                ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />Descargando…</>
                : `↓ ${e.label}`
              }
            </button>
          ))}
        </div>
        {errorExport === "upgrade" && <div className="mt-3"><UpgradeBanner /></div>}
        {errorExport === "error" && (
          <p className="mt-2 text-xs text-red-500">Error al descargar. Intentá de nuevo.</p>
        )}
      </section>
    </div>
  );
}
