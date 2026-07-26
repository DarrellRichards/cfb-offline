'use client';

import { useSettings } from './SettingsProvider';
import type { AppSettings } from '@/lib/settings';

const TOGGLE_OPTIONS: Array<{
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
  {
    key: 'autoNews',
    title: 'Auto News',
    description:
      'After each extract, automatically write desk stories for the current dynasty week from scores, GOTW, polls, and awards.',
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
        {TOGGLE_OPTIONS.map((opt) => {
          const on = Boolean(settings[opt.key]);
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
                onClick={() => setSetting(opt.key, !on as AppSettings[typeof opt.key])}
              >
                <span className="settingsToggleThumb" />
              </button>
            </label>
          );
        })}

        <label className="settingsRow">
          <div>
            <div className="settingsTitle">Stories per week</div>
            <div className="settingsDesc">
              How many auto stories to create for each dynasty week (1–12). Default is 5.
            </div>
          </div>
          <input
            className="settingsNumber"
            type="number"
            min={1}
            max={12}
            value={settings.autoNewsCount}
            disabled={!ready || !settings.autoNews}
            aria-label="Stories per week"
            onChange={(e) => {
              const next = Number(e.target.value);
              if (!Number.isFinite(next)) return;
              setSetting('autoNewsCount', Math.min(12, Math.max(1, Math.trunc(next))));
            }}
          />
        </label>
      </div>

      <div className="row" style={{ marginTop: 18 }}>
        <button type="button" className="buttonGhost" onClick={resetSettings} disabled={!ready}>
          Reset to defaults
        </button>
      </div>
    </section>
  );
}
