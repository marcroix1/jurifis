'use client';

import { useEffect, useState } from 'react';

type Tema = 'claro' | 'oscuro';

function temaActual(): Tema {
  const declarado = document.documentElement.dataset.tema;
  if (declarado === 'claro' || declarado === 'oscuro') return declarado;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
}

export function BotonTema() {
  const [tema, setTema] = useState<Tema | null>(null);

  useEffect(() => {
    setTema(temaActual());
  }, []);

  function alternar() {
    const siguiente: Tema = tema === 'oscuro' ? 'claro' : 'oscuro';
    document.documentElement.dataset.tema = siguiente;
    try {
      window.localStorage.setItem('jurifis-tema', siguiente);
    } catch {
      // Si el navegador bloquea el almacenamiento, el tema dura la sesion.
    }
    setTema(siguiente);
  }

  const etiqueta =
    tema === null
      ? 'Cambiar entre tema claro y oscuro'
      : tema === 'oscuro'
        ? 'Cambiar a tema claro'
        : 'Cambiar a tema oscuro';

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={etiqueta}
      title={etiqueta}
      className="grid h-9 w-9 place-items-center rounded-lg border border-borde bg-superficie text-tenue transition hover:border-marca hover:text-marca"
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
        {tema === 'oscuro' ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 3v1.6M12 19.4V21M3 12h1.6M19.4 12H21M5.6 5.6l1.1 1.1M17.3 17.3l1.1 1.1M18.4 5.6l-1.1 1.1M6.7 17.3l-1.1 1.1" />
          </>
        ) : (
          <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z" />
        )}
      </svg>
    </button>
  );
}
