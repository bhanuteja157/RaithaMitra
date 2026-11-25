import type { Metadata } from 'next';
import './globals.css';
import { FarmProvider } from '@/context/FarmContext';
import { Shell } from '@/components/layout/Shell';

export const metadata: Metadata = {
  title: 'RaithaMitra — AI-Powered Agricultural Intelligence',
  description: 'From Seed to Sale, One Intelligent Companion. Developed by Syntax Squad for HackWarts 2026.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <FarmProvider>
          <Shell>{children}</Shell>
        </FarmProvider>
      </body>
    </html>
  );
}
