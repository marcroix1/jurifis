import type { Metadata } from 'next';

import { CalculadoraCredito } from '@/componentes/credito/CalculadoraCredito';

export const metadata: Metadata = {
  title: 'Estimación de crédito fiscal',
  description:
    'Desglose de principal, actualización, recargos, multas, pagos y saldo, con traza paso a paso, fuentes y sello de estimación.',
};

export default function PaginaCredito() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.22em] text-marca">HERRAMIENTA</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-texto sm:text-4xl">
          Estimación de crédito fiscal
        </h1>
        <p className="mt-4 text-base leading-relaxed text-tenue">
          Captura el importe original, la fecha de exigibilidad, las multas y los pagos. El
          resultado llega desglosado en seis renglones separados, con la traza de cada paso y las
          fuentes con su artículo y su archivo de origen.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-tenue">
          Esto es una estimación, nunca una determinación oficial. Cuando falta el índice de precios
          de alguno de los dos meses que el cálculo necesita, esta pantalla no muestra ninguna cifra
          de actualización: muestra qué mes falta.
        </p>
      </header>

      <div className="mt-10">
        <CalculadoraCredito />
      </div>
    </div>
  );
}
