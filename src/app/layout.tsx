import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const display = Playfair_Display({ subsets: ['latin'], variable: '--font-display', weight: ['600', '700', '800'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Melhores do Ano',
  description: 'Vote nas empresas que mais se destacaram na sua cidade.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${display.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
