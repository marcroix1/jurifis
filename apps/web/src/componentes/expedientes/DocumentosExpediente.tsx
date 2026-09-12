import { fechaLarga } from '@/lib/formato';
import type { DocumentoExpediente } from '@/lib/almacen-expedientes';

/**
 * Documentos del expediente. La huella del archivo se muestra cuando existe:
 * si cambia sin aviso, el documento dejo de ser el mismo.
 */
export function DocumentosExpediente({ documentos }: { documentos: DocumentoExpediente[] }) {
  if (documentos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-borde-fuerte bg-superficie/40 p-6 text-center">
        <p className="text-sm font-medium text-texto">Sin documentos</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-tenue">
          Todavía no hay documentos incorporados a este expediente. La carga de archivos llega
          cuando la aplicación se conecte al almacenamiento.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {documentos.map((d) => (
        <li key={d.id} className="rounded-xl border border-borde bg-superficie p-4 shadow-tarjeta">
          <p className="text-sm font-medium text-texto">{d.nombre}</p>
          <p className="mt-1 text-xs text-tenue">
            {d.tipo !== null ? `${d.tipo} · ` : ''}
            {d.paginas !== null ? `${d.paginas} ${d.paginas === 1 ? 'página' : 'páginas'} · ` : ''}
            Incorporado el {fechaLarga(d.incorporadoEl)}
          </p>
          {d.sha256 !== null ? (
            <p className="mt-1 font-mono text-[11px] break-all text-tenue">{d.sha256}</p>
          ) : (
            <p className="mt-1 text-[11px] text-tenue">
              Sin huella registrada. El archivo todavía no vive en el almacenamiento.
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
