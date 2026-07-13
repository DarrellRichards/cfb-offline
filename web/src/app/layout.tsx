import type { Metadata } from 'next';
import { Bebas_Neue, IBM_Plex_Sans } from 'next/font/google';
import { AppShell } from '@/components/AppShell';
import './globals.css';

const display = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display-loaded',
});

const body = IBM_Plex_Sans({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-body-loaded',
});

export const metadata: Metadata = {
  title: 'CFB Offline',
  description: 'Offline dynasty broadcast desk for College Football',
};

const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('cfb-offline-theme');
    var theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
        <style>{`
          :root {
            --font-display: var(--font-display-loaded), "Arial Narrow", Impact, sans-serif;
            --font-body: var(--font-body-loaded), "Segoe UI", sans-serif;
          }
        `}</style>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
