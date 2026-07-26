export type AppSettings = {
  recruiting: boolean;
  recruitingDevTraits: boolean;
  recruitingOverall: boolean;
  nilUpdates: boolean;
  rankingEdits: boolean;
  autoNews: boolean;
  autoNewsCount: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  recruiting: true,
  recruitingDevTraits: true,
  recruitingOverall: true,
  nilUpdates: true,
  rankingEdits: false,
  autoNews: true,
  autoNewsCount: 5,
};

export const SETTINGS_STORAGE_KEY = 'cfb-offline-settings';

function clampAutoNewsCount(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.autoNewsCount;
  return Math.min(12, Math.max(1, Math.trunc(n)));
}

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
      autoNews: parsed.autoNews ?? DEFAULT_SETTINGS.autoNews,
      autoNewsCount: clampAutoNewsCount(parsed.autoNewsCount ?? DEFAULT_SETTINGS.autoNewsCount),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({
      ...settings,
      autoNewsCount: clampAutoNewsCount(settings.autoNewsCount),
    })
  );
}
