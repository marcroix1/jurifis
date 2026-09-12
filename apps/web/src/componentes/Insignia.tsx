import type { ReactNode } from 'react';

import type { Tono } from '@/lib/formato';

const TONOS: Record<Tono, string> = {
  ok: 'border-ok/30 bg-ok-tenue text-ok',
  aviso: 'border-aviso/35 bg-aviso-tenue text-aviso',
  alto: 'border-alto/35 bg-alto-tenue text-alto',
  neutro: 'border-borde bg-superficie-2 text-tenue',
};

export function Insignia({
  tono = 'neutro',
  children,
}: {
  tono?: Tono;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${TONOS[tono]}`}
    >
      {children}
    </span>
  );
}
