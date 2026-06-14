import { create } from 'zustand';
import type { AppSettings, ChatSpeed, ExportFormat } from '@/types';
import { storage } from '@/utils/storage';
import { defaultSettings } from '@/data/mockData';

interface SettingState {
  settings: AppSettings;
  isInitialized: boolean;
  init: () => void;
  setTheme: (theme: AppSettings['theme']) => void;
  setChatSpeed: (speed: ChatSpeed) => void;
  setAutoPlay: (auto: boolean) => void;
  setExportFormat: (format: ExportFormat) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

export const useSettingStore = create<SettingState>((set, get) => ({
  settings: defaultSettings,
  isInitialized: false,

  init: () => {
    if (get().isInitialized) return;
    const saved = storage.get<AppSettings>('settings', null);
    if (saved) {
      set({ settings: saved, isInitialized: true });
    } else {
      set({ settings: defaultSettings, isInitialized: true });
      storage.set('settings', defaultSettings);
    }
    
    if (saved?.theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  },

  setTheme: (theme) => {
    const settings = { ...get().settings, theme };
    set({ settings });
    storage.set('settings', settings);
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  setChatSpeed: (speed) => {
    const settings = { ...get().settings, chatSpeed: speed };
    set({ settings });
    storage.set('settings', settings);
  },

  setAutoPlay: (auto) => {
    const settings = { ...get().settings, autoPlay: auto };
    set({ settings });
    storage.set('settings', settings);
  },

  setExportFormat: (format) => {
    const settings = { ...get().settings, exportFormat: format };
    set({ settings });
    storage.set('settings', settings);
  },

  updateSettings: (updates) => {
    const settings = { ...get().settings, ...updates };
    set({ settings });
    storage.set('settings', settings);
    
    if (updates.theme) {
      if (updates.theme === 'dark' || updates.theme === 'ocean' || updates.theme === 'sunset') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  },

  resetSettings: () => {
    set({ settings: defaultSettings });
    storage.set('settings', defaultSettings);
  },
}));
