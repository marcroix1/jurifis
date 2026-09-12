import type { ReactNode } from 'react';

import type { Tono } from '@/lib/formato';

const TONOS: Record<Tono, { caja: string; titulo: string }> = {
  ok: { caja: 'border-ok/25 bg-ok-tenue', titulo: 'text-ok' },
  aviso: { caja: 'border-aviso/30 bg-aviso-tenue', titulo: 'text-aviso' },
  alto: { caja: 'border-alto/30 bg-alto-tenue', titulo: 'text-alto' },
  neutro: { caja: 'border-borde bg-superficie-2', titulo: 'text-texto' },
};

export function Aviso({
  tono = 'neutro',
  titulo,
  children,
}: {
  tono?: Tono;
  titulo?: string;
  children: ReactNode;
}) {
  const estilo = TONOS[tono];
  return (
    <div className={`rounded-xl border px-4 py-3.5 ${estilo.caja}`}>
      {titulo !== undefined ? (
        <p className={`text-sm font-semibold ${estilo.titulo}`}>{titulo}</p>
      ) : null}
      <div className="text-sm leading-relaxed text-texto/85">{children}</div>
    </div>
  );
}
