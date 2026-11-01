import { getDatabase } from './database';
import type { ThemeName } from '@toolsmith/shared';

export type AppSettings = {
  theme: ThemeName;
  previewVisible: boolean;
  autoSaveDelayMs: number;
};

const SETTINGS_KEY = 'app-settings';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'cosmic',
  previewVisible: false,
  autoSaveDelayMs: 800,
};

function sanitize(value: unknown): AppSettings {
  if (!value || typeof value !== 'object') return { ...DEFAULT_SETTINGS };
  const candidate = value as Partial<AppSettings>;
  return {
    theme:
      candidate.theme === 'cosmic' ||
      candidate.theme === 'brutalist' ||
      candidate.theme === 'cupertino'
        ? candidate.theme
        : DEFAULT_SETTINGS.theme,
    previewVisible:
      typeof candidate.previewVisible === 'boolean'
        ? candidate.previewVisible
        : DEFAULT_SETTINGS.previewVisible,
    autoSaveDelayMs:
      typeof candidate.autoSaveDelayMs === 'number' &&
      Number.isFinite(candidate.autoSaveDelayMs)
        ? Math.min(5000, Math.max(200, Math.round(candidate.autoSaveDelayMs)))
        : DEFAULT_SETTINGS.autoSaveDelayMs,
  };
}

export async function loadSettings(): Promise<AppSettings> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    SETTINGS_KEY,
  );
  if (!row) return { ...DEFAULT_SETTINGS };
  try {
    return sanitize(JSON.parse(row.value));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  const next = sanitize(settings);
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    SETTINGS_KEY,
    JSON.stringify(next),
  );
  return next;
}
