import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Administration · FDJ', template: '%s · Administration · FDJ' },
  description: 'Interface d’administration FDJ.',
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: '#081f44', width: 'device-width', initialScale: 1 };

// Rendu dynamique volontaire : CSP avec nonce par requête et pages lisant la session.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={sans.variable}>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
