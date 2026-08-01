'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { useExtract } from './ExtractProvider';
import { useSettings } from './SettingsProvider';

type NavItem = {
  href: string;
  label: string;
  setting?: 'recruiting';
};

const PRIMARY_NAV: NavItem[] = [
  { href: '/schedule', label: 'Schedule' },
  { href: '/rankings', label: 'Rankings' },
  { href: '/teams', label: 'Teams' },
  { href: '/stats', label: 'Stats' },
];

const MORE_NAV: NavItem[] = [
  { href: '/gotw', label: 'Game of the Week' },
  { href: '/awards', label: 'Awards' },
  { href: '/news', label: 'News' },
  { href: '/recruiting', label: 'Recruiting', setting: 'recruiting' },
  { href: '/settings', label: 'Settings' },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

function filterBySettings(items: NavItem[], ready: boolean, settings: { recruiting: boolean }) {
  return items.filter((item) => {
    if (!item.setting) return true;
    if (!ready) return false;
    return settings[item.setting];
  });
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { openPanel, busy } = useExtract();
  const { settings, ready } = useSettings();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreMenuId = useId();

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
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!ready) return;
    if (!settings.recruiting && pathname.startsWith('/recruiting')) {
      router.replace('/');
    }
  }, [ready, settings.recruiting, pathname, router]);

  useEffect(() => {
    if (!moreOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!moreRef.current?.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMoreOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [moreOpen]);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    window.localStorage.setItem('cfb-offline-theme', next);
  }

  const primary = filterBySettings(PRIMARY_NAV, ready, settings);
  const more = filterBySettings(MORE_NAV, ready, settings);
  const moreActive = more.some((item) => isActive(pathname, item.href));

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
          onClick={() => {
            setNavOpen((v) => !v);
            setMoreOpen(false);
          }}
        >
          Menu
        </button>

        <nav className="nav" data-open={navOpen} aria-label="Primary">
          {primary.map((item) => (
            <Link key={item.href} href={item.href} data-active={isActive(pathname, item.href)}>
              {item.label}
            </Link>
          ))}

          {more.map((item) => (
            <Link
              key={`mobile-${item.href}`}
              href={item.href}
              className="navMobileOnly"
              data-active={isActive(pathname, item.href)}
            >
              {item.label}
            </Link>
          ))}

          <div className="navMore navDesktopOnly" ref={moreRef}>
            <button
              type="button"
              className="navMoreTrigger"
              aria-expanded={moreOpen}
              aria-controls={moreMenuId}
              data-active={moreActive}
              onClick={() => setMoreOpen((v) => !v)}
            >
              More
            </button>
            {moreOpen && (
              <div id={moreMenuId} className="navMoreMenu" role="menu">
                {more.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    data-active={isActive(pathname, item.href)}
                    onClick={() => setMoreOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
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
