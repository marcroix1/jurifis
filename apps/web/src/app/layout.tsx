import type { Metadata, Viewport } from 'next';

import { Encabezado } from '@/componentes/Encabezado';
import { PieDePagina } from '@/componentes/PieDePagina';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://juris.lat'),
  title: {
    default: 'JURIFIS',
    template: '%s | JURIFIS',
  },
  description:
    'Inteligencia y herramientas jurídicas para la defensa fiscal y administrativa.',
  applicationName: 'JURIFIS',
  openGraph: {
    title: 'JURIFIS',
    description:
      'Inteligencia y herramientas jurídicas para la defensa fiscal y administrativa.',
    locale: 'es_MX',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f6f9' },
    { media: '(prefers-color-scheme: dark)', color: '#080b11' },
  ],
};

/** Fija el tema elegido antes del primer pintado, para que no haya parpadeo. */
const GUION_TEMA = `try{var t=localStorage.getItem('jurifis-tema');if(t==='claro'||t==='oscuro'){document.documentElement.dataset.tema=t}}catch(e){}`;

export default function RaizLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: GUION_TEMA }} />
      </head>
      <body className="min-h-dvh bg-fondo text-texto antialiased">
        <div className="flex min-h-dvh flex-col">
          <Encabezado />
          <main className="flex-1">{children}</main>
          <PieDePagina />
        </div>
      </body>
    </html>
  );
}
