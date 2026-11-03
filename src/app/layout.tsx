import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/navigation/AppShell';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'PrimeCell — Gestão de Loja de Celulares, Assistência & Crediário Inteligente',
  description:
    'Sistema completo para compra e venda de eletrônicos, assistência técnica, crediário com aparelho na troca, árvore de rendimento de investimentos e cobrança automática no WhatsApp.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 text-slate-900 font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
