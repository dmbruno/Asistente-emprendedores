"use client";

import { useState, useRef } from "react";

type Estado = "idle" | "subiendo" | "ok" | "error" | "confirmando" | "confirmada";

interface DatosExtraidos {
  tipo_comprobante: string | null;
  numero: string | null;
  fecha: string | null;
  emisor: { razon_social: string | null; cuit: string | null };
  receptor: { razon_social: string | null; cuit: string | null };
  subtotal: number;
  iva_21: number;
  total: number;
  moneda: string;
  estado: string;
  confianza: { global: number };
}

interface Respuesta {
  factura_id: string;
  estado: string;
  datos_extraidos: DatosExtraidos;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

export default function UploadFacturaPage() {
  const [estado, setEstado] = useState<Estado>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<Respuesta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function onArchivoSeleccionado(file: File) {
    setArchivo(file);
    setPreview(URL.createObjectURL(file));
    setResultado(null);
    setError(null);
    setEstado("idle");
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onArchivoSeleccionado(file);
  }

  async function onConfirmar() {
    if (!resultado) return;
    setEstado("confirmando");
    await fetch(`${API_URL}/api/v1/facturas/${resultado.factura_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "confirmada" }),
    });
    setEstado("confirmada");
  }

  async function onSubir() {
    if (!archivo) return;
    setEstado("subiendo");
    setError(null);

    const form = new FormData();
    form.append("image", archivo);

    try {
      const res = await fetch(`${API_URL}/api/v1/facturas/upload`, {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || data.error || "Error al procesar");
      }

      setResultado(data);
      setEstado("ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setEstado("error");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Subir factura</h1>
        <p className="text-sm text-slate-600">
          Alternativa al canal de WhatsApp. Subí la foto y extraemos los datos automáticamente.
        </p>
      </header>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer rounded-lg border-2 border-dashed border-slate-300 bg-white p-10 text-center transition hover:border-brand hover:bg-slate-50"
      >
        {preview ? (
          <img
            src={preview}
            alt="Vista previa"
            className="mx-auto max-h-64 rounded object-contain"
          />
        ) : (
          <div className="space-y-2 text-slate-500">
            <div className="text-4xl">📄</div>
            <p className="text-sm font-medium">Arrastrá la factura acá o hacé click para seleccionarla</p>
            <p className="text-xs">JPG, PNG, PDF — máx. 10 MB</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onArchivoSeleccionado(file);
          }}
        />
      </div>

      {archivo && estado !== "ok" && (
        <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <span className="truncate text-slate-700">{archivo.name}</span>
          <button
            onClick={onSubir}
            disabled={estado === "subiendo"}
            className="ml-4 shrink-0 rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-brand-fg disabled:opacity-60"
          >
            {estado === "subiendo" ? "Procesando…" : "Procesar factura"}
          </button>
        </div>
      )}

      {estado === "error" && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-emerald-800">Factura procesada</h2>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
              Confianza {resultado.datos_extraidos.confianza?.global ?? "—"}%
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Tipo</dt>
              <dd className="font-medium">{resultado.datos_extraidos.tipo_comprobante ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Número</dt>
              <dd className="font-medium">{resultado.datos_extraidos.numero ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Fecha</dt>
              <dd className="font-medium">{resultado.datos_extraidos.fecha ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Moneda</dt>
              <dd className="font-medium">{resultado.datos_extraidos.moneda}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Emisor</dt>
              <dd className="font-medium">
                {resultado.datos_extraidos.emisor?.razon_social ?? "—"}
                {resultado.datos_extraidos.emisor?.cuit && (
                  <span className="ml-2 text-slate-500">({resultado.datos_extraidos.emisor.cuit})</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Subtotal</dt>
              <dd className="font-medium">
                ${resultado.datos_extraidos.subtotal?.toLocaleString("es-AR")}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">IVA 21%</dt>
              <dd className="font-medium">
                ${resultado.datos_extraidos.iva_21?.toLocaleString("es-AR")}
              </dd>
            </div>
            <div className="col-span-2 border-t border-emerald-200 pt-2">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Total</dt>
              <dd className="text-xl font-semibold text-emerald-800">
                ${resultado.datos_extraidos.total?.toLocaleString("es-AR")} {resultado.datos_extraidos.moneda}
              </dd>
            </div>
          </dl>

          <div className="flex gap-3 pt-1 flex-wrap">
            {estado === "confirmada" ? (
              <div className="flex w-full items-center gap-3">
                <span className="text-sm font-medium text-emerald-700">
                  Factura confirmada y guardada correctamente.
                </span>
                <a
                  href="/dashboard/facturas"
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Ver facturas
                </a>
                <button
                  onClick={() => {
                    setEstado("idle");
                    setArchivo(null);
                    setPreview(null);
                    setResultado(null);
                  }}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Subir otra
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={onConfirmar}
                  disabled={estado === "confirmando"}
                  className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg disabled:opacity-60"
                >
                  {estado === "confirmando" ? "Confirmando…" : "Confirmar factura"}
                </button>
                <button
                  onClick={() => {
                    setEstado("idle");
                    setArchivo(null);
                    setPreview(null);
                    setResultado(null);
                  }}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Subir otra
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
