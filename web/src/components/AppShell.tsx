'use client';

import { ExtractProvider } from './ExtractProvider';
import { SettingsProvider } from './SettingsProvider';
import { SiteHeader } from './SiteHeader';
import { DynastyBar } from './DynastyBar';
import { SourcePanel } from './SourcePanel';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <ExtractProvider>
        <div className="shell">
          <SiteHeader />
          <DynastyBar />
          <main className="main">{children}</main>
          <SourcePanel />
        </div>
      </ExtractProvider>
    </SettingsProvider>
  );
}
