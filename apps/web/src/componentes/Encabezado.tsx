import Link from 'next/link';

import { BotonTema } from './BotonTema';
import { MarcaJurifis } from './MarcaJurifis';

const ENLACES = [
  { href: '/plazos', texto: 'Plazos' },
  { href: '/diagnostico', texto: 'Diagnóstico' },
  { href: '/admin', texto: 'Panel' },
];

export function Encabezado() {
  return (
    <header className="sticky top-0 z-30 border-b border-borde bg-fondo/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="shrink-0 rounded-lg" aria-label="Inicio de JURIFIS">
          <MarcaJurifis />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {ENLACES.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className="rounded-lg px-2.5 py-2 text-sm font-medium text-tenue transition hover:bg-superficie-2 hover:text-texto sm:px-3"
            >
              {e.texto}
            </Link>
          ))}
          <span className="ml-1 sm:ml-2">
            <BotonTema />
          </span>
        </nav>
      </div>
    </header>
  );
}
