import { create } from 'zustand';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type AppSettings,
} from '../db/settings';

type SettingsState = {
  settings: AppSettings;
  loaded: boolean;
  load: () => Promise<void>;
  patch: (patch: Partial<AppSettings>) => Promise<void>;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  loaded: false,

  load: async () => {
    const settings = await loadSettings();
    set({ settings, loaded: true });
  },

  patch: async (patch) => {
    const next = { ...get().settings, ...patch };
    const saved = await saveSettings(next);
    set({ settings: saved, loaded: true });
  },
}));
