/**
 * Sello de estimación. Va arriba de todo y no se puede pasar por alto: la cifra de un
 * crédito fiscal se copia con demasiada facilidad a un escrito, y quien la copie tiene
 * que haber leído antes que esto no es una determinación de la autoridad.
 */
export function SelloEstimacion({ leyenda }: { leyenda: string }) {
  return (
    <div className="rounded-2xl border-2 border-alto/45 bg-alto-tenue p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center rounded-lg border-2 border-alto px-3 py-1.5 text-sm font-bold tracking-[0.2em] text-alto uppercase">
          Estimación
        </span>
        <span className="text-sm font-semibold text-alto">No es determinación oficial</span>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-texto">{leyenda}</p>
    </div>
  );
}
