"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

const CATEGORIAS_MONOTRIBUTO = [
  { cat: "A", servicios: 7_400_000,  bienes: 11_200_000 },
  { cat: "B", servicios: 11_000_000, bienes: 16_300_000 },
  { cat: "C", servicios: 15_400_000, bienes: 22_800_000 },
  { cat: "D", servicios: 19_100_000, bienes: 30_000_000 },
  { cat: "E", servicios: 23_100_000, bienes: 38_300_000 },
  { cat: "F", servicios: 27_500_000, bienes: 46_900_000 },
  { cat: "G", servicios: 32_100_000, bienes: 55_700_000 },
  { cat: "H", servicios: 37_900_000, bienes: 65_700_000 },
  { cat: "I", servicios: 45_200_000, bienes: null },
  { cat: "J", servicios: 54_100_000, bienes: null },
  { cat: "K", servicios: 65_100_000, bienes: null },
];

const fmt = (n: number | null) =>
  n != null ? `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}` : "—";

function validarCuit(cuit: string): boolean {
  const digits = cuit.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  const mult = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = mult.reduce((acc, m, i) => acc + parseInt(digits[i]) * m, 0);
  const rem = sum % 11;
  let expected = 11 - rem;
  if (expected === 11) expected = 0;
  if (expected === 10) return false;
  return expected === parseInt(digits[10]);
}

interface Cliente {
  razon_social: string; cuit: string; whatsapp: string; email: string;
  condicion_fiscal: string; categoria_monotributo: string | null;
  afip_punto_venta: string | null; plan: string;
}

interface AfipResult {
  valido: boolean; razon_social?: string | null; condicion_iva?: string | null;
  estado?: string | null; fuente?: string; mensaje?: string; error?: string;
}

type Guardando = "idle" | "guardando" | "ok" | "error";
type CertEstado = "idle" | "guardando" | "ok" | "error";

export default function ConfiguracionPage() {
  const [form, setForm] = useState<Partial<Cliente>>({});
  const [original, setOriginal] = useState<Partial<Cliente>>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<Guardando>("idle");
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  const [consultandoAfip, setConsultandoAfip] = useState(false);
  const [afipResult, setAfipResult] = useState<AfipResult | null>(null);
  const [afipAutoRelleno, setAfipAutoRelleno] = useState(false);
  const [cuitError, setCuitError] = useState<string | null>(null);

  const [certContent, setCertContent] = useState("");
  const [keyContent, setKeyContent] = useState("");
  const [certConfigurado, setCertConfigurado] = useState(false);
  const [certEstado, setCertEstado] = useState<CertEstado>("idle");
  const [certError, setCertError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Cliente>("/api/v1/me")
      .then((d) => { setForm(d); setOriginal(d); })
      .finally(() => setCargando(false));

    apiFetch<{ items: { provider: string }[] }>("/api/v1/api-keys")
      .then((d) => {
        const providers = (d.items || []).map((k) => k.provider);
        setCertConfigurado(providers.includes("afip_cert") && providers.includes("afip_key"));
      })
      .catch(() => {});
  }, []);

  function set(field: keyof Cliente, value: string | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "condicion_fiscal") {
      setForm((prev) => ({
        ...prev,
        condicion_fiscal: value ?? "",
        categoria_monotributo: value !== "monotributo" ? null : prev.categoria_monotributo ?? null,
      }));
    }
    if (field === "cuit") {
      setAfipResult(null);
      setAfipAutoRelleno(false);
      setCuitError(null);
      // Limpiar campos derivados de AFIP para que no queden datos del CUIT anterior
      setForm((prev) => ({ ...prev, cuit: value ?? undefined, razon_social: "", condicion_fiscal: "", categoria_monotributo: null }));
      return;
    }
    setGuardando("idle");
  }

  async function consultarAfip() {
    const cuit = form.cuit ?? "";
    if (!validarCuit(cuit)) { setCuitError("El CUIT no tiene un dígito verificador válido."); return; }
    setCuitError(null);
    setConsultandoAfip(true);
    setAfipResult(null);
    setAfipAutoRelleno(false);
    try {
      const data = await apiFetch<AfipResult>(`/api/v1/consultar-cuit?cuit=${encodeURIComponent(cuit)}`);
      setAfipResult(data);

      // Solo auto-rellenar si AFIP devolvió datos reales (fuente: "afip")
      // Si es solo checksum, dejamos los campos vacíos para completar manualmente
      let huboRelleno = false;
      if (data.fuente === "afip") {
        if (data.razon_social) {
          setForm((prev) => ({ ...prev, razon_social: data.razon_social! }));
          huboRelleno = true;
        }
        if (data.condicion_iva) {
          const iva = data.condicion_iva.toLowerCase();
          if (iva.includes("monotributo") || iva.includes("monotributista")) {
            setForm((prev) => ({ ...prev, condicion_fiscal: "monotributo" }));
            huboRelleno = true;
          } else if (iva.includes("responsable inscripto")) {
            setForm((prev) => ({ ...prev, condicion_fiscal: "responsable_inscripto", categoria_monotributo: null }));
            huboRelleno = true;
          } else if (iva.includes("exento")) {
            setForm((prev) => ({ ...prev, condicion_fiscal: "exento", categoria_monotributo: null }));
            huboRelleno = true;
          }
        }
      }
      if (huboRelleno) setAfipAutoRelleno(true);
    } finally {
      setConsultandoAfip(false);
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (form.cuit && !validarCuit(form.cuit)) { setCuitError("El CUIT no tiene un dígito verificador válido."); return; }
    setGuardando("guardando");
    setErrorGuardado(null);
    try {
      const payload: Record<string, string | null> = {};
      const campos: (keyof Cliente)[] = ["razon_social","cuit","whatsapp","condicion_fiscal","categoria_monotributo","afip_punto_venta"];
      campos.forEach((k) => { if (form[k] !== original[k]) payload[k] = (form[k] as string | null) ?? null; });

      if (Object.keys(payload).length === 0) { setGuardando("ok"); return; }

      await apiFetch("/api/v1/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setOriginal(form);
      setGuardando("ok");
    } catch (err) {
      setErrorGuardado(err instanceof Error ? err.message : "Error desconocido");
      setGuardando("error");
    }
  }

  async function guardarCertificado() {
    if (!certContent.trim() || !keyContent.trim()) { setCertError("Pegá el contenido del .crt y del .key antes de guardar."); return; }
    setCertEstado("guardando");
    setCertError(null);
    try {
      const guardaUno = async (provider: string, value: string) => {
        await apiFetch("/api/v1/api-keys", {
          method: "POST",
          body: JSON.stringify({ provider, api_key: value.trim() }),
        });
      };
      await guardaUno("afip_cert", certContent);
      await guardaUno("afip_key", keyContent);
      setCertConfigurado(true); setCertEstado("ok"); setCertContent(""); setKeyContent("");
    } catch (e) { setCertError(e instanceof Error ? e.message : "Error desconocido"); setCertEstado("error"); }
  }

  async function eliminarCertificado() {
    try {
      const d = await apiFetch<{ items: { id: string; provider: string }[] }>("/api/v1/api-keys");
      const afipKeys = (d.items || []).filter((k) => k.provider === "afip_cert" || k.provider === "afip_key");
      await Promise.all(afipKeys.map((k) => apiFetch(`/api/v1/api-keys/${k.id}`, { method: "DELETE" })));
      setCertConfigurado(false); setCertEstado("idle");
    } catch { setCertError("Error al eliminar el certificado."); }
  }

  const esMonotributo = form.condicion_fiscal === "monotributo";
  const cuitOk = form.cuit ? validarCuit(form.cuit) : null;

  if (cargando) return <div className="py-16 text-center text-sm text-slate-400">Cargando…</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-slate-900">Configuración</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ingresá tu CUIT para que AFIP complete tus datos fiscales automáticamente.
        </p>
      </header>

      <form onSubmit={guardar} className="space-y-5">

        {/* ── PASO 1: Identificación AFIP ── */}
        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
            <div>
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-slate-500">
                Identificación AFIP
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Consultamos el padrón público de AFIP con tu CUIT.
              </p>
            </div>
            {afipAutoRelleno && (
              <span className="flex items-center gap-1.5 rounded-full bg-verde-50 border border-verde-200 px-3 py-1 text-xs font-semibold text-verde-700">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Completado por AFIP
              </span>
            )}
          </div>

          {/* CUIT */}
          <div className="px-5 py-5 space-y-3">
            <label className="block text-sm font-semibold text-slate-700">CUIT</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.cuit ?? ""}
                onChange={(e) => set("cuit", e.target.value)}
                placeholder="20-12345678-9"
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 transition-colors ${
                  cuitOk === false ? "border-red-300 focus:ring-red-300/30"
                  : cuitOk === true ? "border-verde-300 focus:ring-verde-300/30"
                  : "border-slate-200 focus:ring-verde-400/20"
                }`}
              />
              <button
                type="button"
                onClick={consultarAfip}
                disabled={consultandoAfip || !form.cuit}
                className="shrink-0 rounded-xl bg-verde-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-verde-500 disabled:opacity-50"
              >
                {consultandoAfip ? "Consultando…" : "Consultar AFIP"}
              </button>
            </div>
            {cuitError && <p className="text-xs text-red-600">{cuitError}</p>}
            {cuitOk === true && !cuitError && (
              <p className="text-xs text-verde-600 font-medium">✓ CUIT con dígito verificador válido</p>
            )}

            {/* Resultado AFIP inline */}
            {afipResult && (
              <div className={`rounded-xl border px-4 py-3 text-sm ${
                afipResult.valido && afipResult.fuente === "afip"
                  ? "border-verde-200 bg-verde-50 text-verde-800"
                  : afipResult.valido
                  ? "border-dorado-200 bg-dorado-400/5 text-dorado-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}>
                {!afipResult.valido && <p className="font-semibold">{afipResult.error}</p>}
                {afipResult.valido && afipResult.fuente === "afip" && (
                  <div className="space-y-0.5">
                    <p className="font-semibold">{afipResult.razon_social ?? "Razón social no disponible"}</p>
                    {afipResult.condicion_iva && <p className="text-xs opacity-80">IVA: {afipResult.condicion_iva}</p>}
                    {afipResult.estado && <p className="text-xs opacity-80">Estado: {afipResult.estado.toLowerCase()}</p>}
                  </div>
                )}
                {afipResult.valido && afipResult.fuente === "checksum" && (
                  <div>
                    <p className="font-semibold">CUIT válido ✓</p>
                    <p className="mt-1 text-xs opacity-80">
                      Sin certificado AFIP no podemos traer razón social ni condición fiscal.
                      Completá esos campos manualmente abajo.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Razón social — auto-rellena desde AFIP */}
          <div className="px-5 py-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-slate-700">Razón social / Nombre</label>
              {afipAutoRelleno && form.razon_social && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-verde-600 bg-verde-50 border border-verde-200 rounded-full px-2 py-0.5">
                  desde AFIP
                </span>
              )}
            </div>
            <input
              type="text"
              value={form.razon_social ?? ""}
              onChange={(e) => set("razon_social", e.target.value)}
              placeholder="Juan Pérez"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-verde-400/20 transition-colors"
            />
            <p className="text-xs text-slate-400">Podés editarlo si AFIP no lo trae correcto.</p>
          </div>

          {/* Condición fiscal — auto-rellena desde AFIP */}
          <div className="px-5 py-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-slate-700">Condición frente al IVA</label>
              {afipAutoRelleno && form.condicion_fiscal && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-verde-600 bg-verde-50 border border-verde-200 rounded-full px-2 py-0.5">
                  desde AFIP
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "monotributo", label: "Monotributo" },
                { value: "responsable_inscripto", label: "Responsable Inscripto" },
                { value: "exento", label: "Exento" },
              ].map((op) => (
                <label
                  key={op.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                    form.condicion_fiscal === op.value
                      ? "border-verde-400 bg-verde-50 text-verde-800"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="condicion_fiscal"
                    value={op.value}
                    checked={form.condicion_fiscal === op.value}
                    onChange={() => set("condicion_fiscal", op.value)}
                    className="accent-verde-600"
                  />
                  {op.label}
                </label>
              ))}
            </div>
          </div>

          {/* Categoría monotributo — siempre manual */}
          {esMonotributo && (
            <div className="px-5 py-4 border-t border-slate-100 space-y-3">
              <div>
                <label className="text-sm font-semibold text-slate-700">Categoría de monotributo</label>
                <p className="mt-0.5 text-xs text-slate-400">AFIP no expone la categoría — seleccionala vos.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIAS_MONOTRIBUTO.map(({ cat }) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => set("categoria_monotributo", cat)}
                    className={`h-10 w-10 rounded-xl border text-sm font-bold transition-all ${
                      form.categoria_monotributo === cat
                        ? "border-verde-500 bg-verde-600 text-white shadow-sm"
                        : "border-slate-200 text-slate-600 hover:border-verde-300 hover:bg-verde-50"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => set("categoria_monotributo", null)}
                  className={`rounded-xl border px-3 text-sm font-medium transition-all ${
                    !form.categoria_monotributo
                      ? "border-slate-400 bg-slate-100 text-slate-700"
                      : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  No sé
                </button>
              </div>

              <details className="rounded-xl border border-slate-200 overflow-hidden">
                <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-slate-500 bg-slate-50 hover:bg-slate-100 select-none">
                  Ver tabla de límites 2025
                </summary>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-slate-400">Cat.</th>
                        <th className="px-3 py-2 text-right text-slate-400">Servicios / año</th>
                        <th className="px-3 py-2 text-right text-slate-400">Bienes / año</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {CATEGORIAS_MONOTRIBUTO.map(({ cat, servicios, bienes }) => (
                        <tr
                          key={cat}
                          className={`cursor-pointer transition-colors ${
                            form.categoria_monotributo === cat
                              ? "bg-verde-50 font-semibold text-verde-800"
                              : "hover:bg-slate-50 text-slate-600"
                          }`}
                          onClick={() => set("categoria_monotributo", cat)}
                        >
                          <td className="px-3 py-2 font-bold">{cat}</td>
                          <td className="px-3 py-2 text-right">{fmt(servicios)}</td>
                          <td className="px-3 py-2 text-right">{fmt(bienes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          )}
        </section>

        {/* ── PASO 2: Contacto ── */}
        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-slate-500">Contacto</h2>
          </div>

          <div className="px-5 py-4 space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              WhatsApp <span className="font-normal text-slate-400">(con código de país)</span>
            </label>
            <input
              type="text"
              value={form.whatsapp ?? ""}
              onChange={(e) => set("whatsapp", e.target.value)}
              placeholder="+5491155559999"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-verde-400/20 transition-colors"
            />
            <p className="text-xs text-slate-400">Tu número para recibir y enviar facturas por WhatsApp.</p>
          </div>

          <div className="px-5 py-4 border-t border-slate-100 space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Email</label>
            <input
              type="email"
              value={form.email ?? ""}
              readOnly
              className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed"
            />
            <p className="text-xs text-slate-400">Vinculado a tu cuenta — no se puede cambiar desde acá.</p>
          </div>
        </section>

        {/* ── PASO 3: Facturación electrónica ── */}
        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-slate-500">
                Facturación electrónica AFIP
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Para emitir Facturas C desde WhatsApp. Requiere certificado digital.
              </p>
            </div>
            {certConfigurado && (
              <span className="flex items-center gap-1.5 rounded-full bg-verde-50 border border-verde-200 px-3 py-1 text-xs font-semibold text-verde-700">
                <span className="h-2 w-2 rounded-full bg-verde-500" />
                Activo
              </span>
            )}
          </div>

          {/* Punto de venta */}
          <div className="px-5 py-4 border-b border-slate-100 space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Punto de venta AFIP</label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={form.afip_punto_venta ?? "0001"}
                onChange={(e) => setForm((p) => ({ ...p, afip_punto_venta: e.target.value }))}
                maxLength={5}
                placeholder="0001"
                className="w-28 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-verde-400/20 transition-colors"
              />
              <p className="text-xs text-slate-400">
                El número habilitado en AFIP para Factura Electrónica (generalmente 0001).
              </p>
            </div>
          </div>

          {/* Certificado */}
          {certConfigurado ? (
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Certificado digital</p>
                <p className="text-xs text-slate-400 mt-0.5">Tu .crt y .key están guardados encriptados.</p>
              </div>
              <button
                type="button"
                onClick={eliminarCertificado}
                className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                Eliminar
              </button>
            </div>
          ) : (
            <div className="px-5 py-4 space-y-4">
              <div className="rounded-xl border border-dorado-200 bg-dorado-400/5 px-4 py-3 text-xs text-dorado-800 space-y-1.5">
                <p className="font-semibold">¿Cómo obtener tu certificado?</p>
                <ol className="list-decimal list-inside space-y-0.5 text-dorado-700">
                  <li>Entrá a AFIP con tu CUIT y clave fiscal</li>
                  <li>Ir a <strong>Mis servicios → Administración de certificados digitales</strong></li>
                  <li>Generá un certificado para el servicio <strong>wsfe</strong></li>
                  <li>Descargá el <strong>.crt</strong> y el <strong>.key</strong> y pegá el contenido abajo</li>
                </ol>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Contenido del certificado (.crt)</label>
                <textarea
                  value={certContent}
                  onChange={(e) => { setCertContent(e.target.value); setCertEstado("idle"); }}
                  rows={4}
                  placeholder={"-----BEGIN CERTIFICATE-----\nMIID...\n-----END CERTIFICATE-----"}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-verde-400/20 resize-none transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Clave privada (.key)</label>
                <textarea
                  value={keyContent}
                  onChange={(e) => { setKeyContent(e.target.value); setCertEstado("idle"); }}
                  rows={4}
                  placeholder={"-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----"}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-verde-400/20 resize-none transition-colors"
                />
              </div>

              {certError && <p className="text-xs text-red-600">{certError}</p>}

              <button
                type="button"
                onClick={guardarCertificado}
                disabled={certEstado === "guardando" || !certContent || !keyContent}
                className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
              >
                {certEstado === "guardando" ? "Guardando…" : "Guardar certificado"}
              </button>
              {certEstado === "ok" && <p className="text-xs font-semibold text-verde-600">Certificado guardado correctamente.</p>}
            </div>
          )}
        </section>

        {/* ── Plan ── */}
        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700">Plan actual</p>
            <p className="text-xs text-slate-400 mt-0.5">Para cambiar de plan, contactanos.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold capitalize text-slate-600">
            {form.plan ?? "trial"}
          </span>
        </section>

        {/* ── Guardar ── */}
        <div className="flex items-center gap-4 pt-1">
          <button
            type="submit"
            disabled={guardando === "guardando"}
            className="rounded-xl bg-verde-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-verde-500 disabled:opacity-60"
          >
            {guardando === "guardando" ? "Guardando…" : "Guardar cambios"}
          </button>
          {guardando === "ok" && <span className="text-sm font-semibold text-verde-600">Guardado correctamente.</span>}
          {guardando === "error" && <span className="text-sm text-red-600">{errorGuardado}</span>}
        </div>
      </form>

      {/* Info contextual monotributo */}
      {esMonotributo && (
        <section className="rounded-2xl border border-dorado-200 bg-dorado-400/5 px-5 py-4 space-y-2">
          <h3 className="font-display text-sm font-bold text-dorado-900">¿Qué hacemos con tu categoría?</h3>
          <ul className="space-y-1 text-sm text-dorado-800">
            {[
              "Mostramos tu progreso hacia el tope anual en Resumen.",
              "Tus compras se registran automáticamente sin desagregar IVA.",
              "Si superás el 80% del límite, te avisamos para que evalúes recategorizar.",
              "El CSV de exportación tiene el formato que necesita tu contador.",
            ].map((t) => (
              <li key={t} className="flex gap-2"><span className="shrink-0">·</span>{t}</li>
            ))}
          </ul>
        </section>
      )}

      {form.condicion_fiscal === "responsable_inscripto" && (
        <section className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 space-y-2">
          <h3 className="font-display text-sm font-bold text-blue-900">Responsable Inscripto — ¿qué cambia?</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            {[
              "Cada compra registra el IVA al 21%, 10.5% o 27% según corresponda.",
              "El CSV incluye columnas de IVA desagregado para tu presentación mensual.",
              "No hay tope de facturación anual.",
            ].map((t) => (
              <li key={t} className="flex gap-2"><span className="shrink-0">·</span>{t}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
