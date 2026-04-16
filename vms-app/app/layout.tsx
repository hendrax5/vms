import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'PRODC VMS',
  description: 'Premium Data Center Infrastructure & Visitor Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} font-sans`}>
      <body className="antialiased min-h-screen selection:bg-primary selection:text-primary-foreground">
        <Providers>
            {children}
        </Providers>
      </body>
    </html>
  );
}
