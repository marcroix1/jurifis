import { origenFundamento, textoFundamento } from '@/lib/formato';
import type { Fundamento } from '@/lib/tipos-ui';

export function CitaFundamento({ fundamento }: { fundamento: Fundamento }) {
  return (
    <div className="space-y-0.5 text-xs leading-relaxed">
      <p className="font-medium text-texto">{textoFundamento(fundamento)}</p>
      <p className="text-tenue">{fundamento.publicacion}</p>
      <p className="font-mono text-[11px] text-tenue">{origenFundamento(fundamento)}</p>
    </div>
  );
}

/** La traza trae unas veces el fundamento completo y otras una nota de texto. */
export function CitaTraza({ fundamento }: { fundamento: Fundamento | string }) {
  if (typeof fundamento === 'string') {
    return <p className="text-xs leading-relaxed text-tenue">{fundamento}</p>;
  }
  return <CitaFundamento fundamento={fundamento} />;
}
