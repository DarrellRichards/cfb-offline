'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useExtract } from './ExtractProvider';
import { useSettings } from './SettingsProvider';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/gotw', label: 'GOTW' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/rankings', label: 'Rankings' },
  { href: '/stats', label: 'Stats' },
  { href: '/awards', label: 'Awards' },
  { href: '/teams', label: 'Teams' },
  { href: '/recruiting', label: 'Recruiting', setting: 'recruiting' as const },
  { href: '/settings', label: 'Settings' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { openPanel, busy } = useExtract();
  const { settings, ready } = useSettings();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const attr = document.documentElement.getAttribute('data-theme');
    const stored = window.localStorage.getItem('cfb-offline-theme');
    const next = attr === 'light' || stored === 'light' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  }, []);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!ready) return;
    if (!settings.recruiting && pathname.startsWith('/recruiting')) {
      router.replace('/');
    }
  }, [ready, settings.recruiting, pathname, router]);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    window.localStorage.setItem('cfb-offline-theme', next);
  }

  const items = NAV.filter((item) => {
    if (!item.setting) return true;
    // Wait until settings load so a disabled Recruiting tab doesn't flash on.
    if (!ready) return false;
    return settings[item.setting];
  });

  return (
    <header className="siteHeader">
      <div className="siteHeaderInner">
        <Link href="/" className="brand">
          <div className="brandMark">
            CFB <span>OFFLINE</span>
          </div>
          <div className="brandSub">Dynasty Desk</div>
        </Link>

        <button
          type="button"
          className="navToggle buttonGhost"
          aria-expanded={navOpen}
          aria-label="Menu"
          onClick={() => setNavOpen((v) => !v)}
        >
          Menu
        </button>

        <nav className="nav" data-open={navOpen} aria-label="Primary">
          {items.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} data-active={active}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="headerActions">
          <button type="button" className="buttonGhost" onClick={toggleTheme} suppressHydrationWarning>
            {mounted ? (theme === 'dark' ? 'Light' : 'Dark') : 'Theme'}
          </button>
          <button type="button" className="button" onClick={openPanel} disabled={busy}>
            Extract
          </button>
        </div>
      </div>
    </header>
  );
}
