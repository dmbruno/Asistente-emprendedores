export default function FacturaDetallePage({
  params,
}: {
  params: { id: string };
}) {
  // TODO: cargar factura por id con RLS, vista previa de imagen,
  // formulario de edición controlado con react-hook-form + zod.
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Factura</h1>
        <p className="text-sm text-slate-600">ID: {params.id}</p>
      </header>
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        🔧 Detalle aún no implementado.
      </div>
    </div>
  );
}
