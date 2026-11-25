import type { Metadata } from 'next';
import { Lora, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import '@/components/premium-ui/styles/premium-ui.css';
import { FarmProvider } from '@/context/FarmContext';
import { Shell } from '@/components/layout/Shell';

const lora = Lora({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-serif',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

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
    <html lang="en" className={`${lora.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <body className="font-sans bg-[#F7F5ED] text-[#20372A] dark:bg-zinc-900 dark:text-zinc-100">
        <FarmProvider>
          <Shell>{children}</Shell>
        </FarmProvider>
      </body>
    </html>
  );
}
