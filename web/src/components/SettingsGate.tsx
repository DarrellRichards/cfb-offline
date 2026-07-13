'use client';

import Link from 'next/link';
import { useSettings } from './SettingsProvider';

/** Renders children only when a boolean setting is enabled (after local load). */
export function SettingsGate({
  setting,
  children,
  fallback = null,
}: {
  setting: 'recruiting' | 'recruitingDevTraits' | 'nilUpdates';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { settings, ready } = useSettings();
  if (!ready) return <>{fallback}</>;
  if (!settings[setting]) return <>{fallback}</>;
  return <>{children}</>;
}

export function SettingsLink({
  href,
  className,
  children,
  setting = 'recruiting',
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  setting?: 'recruiting' | 'recruitingDevTraits' | 'nilUpdates';
}) {
  return (
    <SettingsGate setting={setting}>
      <Link href={href} className={className}>
        {children}
      </Link>
    </SettingsGate>
  );
}
