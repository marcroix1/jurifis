import Link from 'next/link';

export function PieDePagina() {
  return (
    <footer className="mt-24 border-t border-borde bg-superficie">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-[2fr_1fr]">
        <div className="max-w-xl space-y-3">
          <p className="text-sm font-semibold tracking-[0.14em] text-texto">JURIFIS</p>
          <p className="text-sm leading-relaxed text-tenue">
            Herramienta de apoyo para el trabajo jurídico. Ningún resultado sustituye la revisión del
            abogado responsable ni constituye cómputo oficial. Cada dato jurídico que aparece en
            pantalla proviene del corpus verificado del motor, con su fundamento y su archivo de
            origen.
          </p>
        </div>
        <div className="space-y-3 text-sm text-tenue">
          <p>
            <span className="block font-medium text-texto">NOVA LEGAL, S.C.</span>
            juris.lat
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/plazos" className="transition hover:text-marca">
              Calcular un plazo
            </Link>
            <Link href="/diagnostico" className="transition hover:text-marca">
              ¿Puedo impugnar?
            </Link>
            <Link href="/admin" className="transition hover:text-marca">
              Panel
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
