import type { Metadata } from 'next';
import { Inter_Tight, Inter, Playfair_Display, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { CommandCenterShell } from '@/components/layout/CommandCenterShell';

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'IBVAP — Intelligent Border Video Analytics Platform | Command & Control',
  description:
    'Government-grade AI-powered border surveillance operations platform with real-time video analytics, virtual fence intrusion detection, and blockchain evidence integrity verification.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${interTight.variable} ${inter.variable} ${playfair.variable} ${jetbrains.variable}`}>
      <body className="bg-background text-foreground font-sans antialiased">
        <CommandCenterShell>{children}</CommandCenterShell>
      </body>
    </html>
  );
}
