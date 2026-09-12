export function MarcaJurifis({ tamano = 'normal' }: { tamano?: 'normal' | 'grande' }) {
  const lado = tamano === 'grande' ? 'h-9 w-9 rounded-xl' : 'h-7 w-7 rounded-[9px]';
  const texto = tamano === 'grande' ? 'text-xl' : 'text-[15px]';
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`${lado} grid place-items-center bg-marca text-white shadow-tarjeta`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="h-[60%] w-[60%]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M5 7h14M5 12h9M5 17h5" />
        </svg>
      </span>
      <span className={`${texto} font-semibold tracking-[0.14em] text-texto`}>JURIFIS</span>
    </span>
  );
}
