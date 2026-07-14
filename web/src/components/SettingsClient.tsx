'use client';

import { useSettings } from './SettingsProvider';
import type { AppSettings } from '@/lib/settings';

const OPTIONS: Array<{
  key: keyof AppSettings;
  title: string;
  description: string;
}> = [
  {
    key: 'recruiting',
    title: 'Recruiting',
    description: 'Show the Recruiting tab and board links across the desk.',
  },
  {
    key: 'recruitingDevTraits',
    title: 'Recruiting Dev Traits',
    description: 'Show development traits in the recruiting table and recruit detail drawer.',
  },
  {
    key: 'recruitingOverall',
    title: 'Recruiting Overall',
    description: 'Show recruit overall ratings in the table, filters, and recruit detail drawer.',
  },
  {
    key: 'nilUpdates',
    title: 'NIL Updates',
    description:
      'Show the Program Points editor and allow writing NIL / program points back to your dynasty save.',
  },
  {
    key: 'rankingEdits',
    title: 'Edit Rankings',
    description:
      'Allow reordering Media and Coaches poll rankings and writing them back to your dynasty save. Off by default.',
  },
];

export function SettingsClient() {
  const { settings, setSetting, resetSettings, ready } = useSettings();

  return (
    <section className="section" style={{ marginTop: 8 }}>
      <div className="sectionHead">
        <div>
          <p className="eyebrow">Preferences</p>
          <h2>Settings</h2>
          <p>Stored on this device. Change anytime — takes effect immediately.</p>
        </div>
      </div>

      <div className="panel settingsList">
        {OPTIONS.map((opt) => {
          const on = settings[opt.key];
          return (
            <label key={opt.key} className="settingsRow">
              <div>
                <div className="settingsTitle">{opt.title}</div>
                <div className="settingsDesc">{opt.description}</div>
              </div>
              <button
                type="button"
                className="settingsToggle"
                role="switch"
                aria-checked={on}
                aria-label={opt.title}
                disabled={!ready}
                data-on={on}
                onClick={() => setSetting(opt.key, !on)}
              >
                <span className="settingsToggleThumb" />
              </button>
            </label>
          );
        })}
      </div>

      <div className="row" style={{ marginTop: 18 }}>
        <button type="button" className="buttonGhost" onClick={resetSettings} disabled={!ready}>
          Reset to defaults
        </button>
      </div>
    </section>
  );
}
