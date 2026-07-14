export type AppSettings = {
  recruiting: boolean;
  recruitingDevTraits: boolean;
  recruitingOverall: boolean;
  nilUpdates: boolean;
  rankingEdits: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  recruiting: true,
  recruitingDevTraits: true,
  recruitingOverall: true,
  nilUpdates: true,
  rankingEdits: false,
};

export const SETTINGS_STORAGE_KEY = 'cfb-offline-settings';

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      recruiting: parsed.recruiting ?? DEFAULT_SETTINGS.recruiting,
      recruitingDevTraits: parsed.recruitingDevTraits ?? DEFAULT_SETTINGS.recruitingDevTraits,
      recruitingOverall: parsed.recruitingOverall ?? DEFAULT_SETTINGS.recruitingOverall,
      nilUpdates: parsed.nilUpdates ?? DEFAULT_SETTINGS.nilUpdates,
      rankingEdits: parsed.rankingEdits ?? DEFAULT_SETTINGS.rankingEdits,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
