import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Radar de Focos | Noticias en Tiempo Real',
  description: 'Monitoreo de eventos y focos informativos en tiempo real',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
