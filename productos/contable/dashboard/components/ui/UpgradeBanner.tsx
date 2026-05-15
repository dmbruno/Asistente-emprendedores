"use client";

export function UpgradeBanner() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-dorado-200 bg-dorado-50 px-4 py-3">
      <span className="text-lg leading-none mt-0.5">⭐</span>
      <div>
        <p className="text-sm font-semibold text-dorado-800">
          El export CSV es exclusivo de los planes Solo y Negocio
        </p>
        <p className="mt-0.5 text-xs text-dorado-700">
          Actualizá tu plan para descargar tus facturas en CSV.
        </p>
        <a
          href="/dashboard/suscripcion"
          className="mt-2 inline-block rounded-lg bg-dorado-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-dorado-500"
        >
          Ver planes →
        </a>
      </div>
    </div>
  );
}
