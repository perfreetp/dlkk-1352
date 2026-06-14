import { create } from 'zustand';
import type { Script, AIActor } from '@/types';
import { storage, generateId } from '@/utils/storage';
import { defaultScripts } from '@/data/mockData';
import { generateOpeningByTheme } from '@/utils/aiEngine';
import { useActorStore } from './useActorStore';

interface ScriptState {
  scripts: Script[];
  isInitialized: boolean;
  init: () => void;
  addScript: (title: string, theme: string, opening: string, actorIds: string[]) => void;
  updateScript: (id: string, updates: Partial<Script>) => void;
  deleteScript: (id: string) => void;
  removeActorFromAllScripts: (actorId: string) => void;
  generateOpening: (theme: string, actorIds: string[]) => string;
  searchScripts: (query: string) => Script[];
}

export const useScriptStore = create<ScriptState>((set, get) => ({
  scripts: [],
  isInitialized: false,

  init: () => {
    if (get().isInitialized) return;
    const saved = storage.get<Script[]>('scripts', null);
    if (saved && saved.length > 0) {
      set({ scripts: saved, isInitialized: true });
    } else {
      set({ scripts: defaultScripts, isInitialized: true });
      storage.set('scripts', defaultScripts);
    }
  },

  addScript: (title, theme, opening, actorIds) => {
    const now = Date.now();
    const newScript: Script = {
      id: generateId(),
      title,
      theme,
      opening,
      actorIds,
      createdAt: now,
      updatedAt: now,
    };
    const scripts = [...get().scripts, newScript];
    set({ scripts });
    storage.set('scripts', scripts);
  },

  updateScript: (id, updates) => {
    const scripts = get().scripts.map(script =>
      script.id === id
        ? { ...script, ...updates, updatedAt: Date.now() }
        : script
    );
    set({ scripts });
    storage.set('scripts', scripts);
  },

  deleteScript: (id) => {
    const scripts = get().scripts.filter(s => s.id !== id);
    set({ scripts });
    storage.set('scripts', scripts);
  },

  removeActorFromAllScripts: (actorId) => {
    const scripts = get().scripts.map(s => ({
      ...s,
      actorIds: s.actorIds.filter(id => id !== actorId),
    }));
    set({ scripts });
    storage.set('scripts', scripts);
  },

  generateOpening: (theme, actorIds) => {
    const actors = actorIds
      .map(id => useActorStore.getState().getActor(id))
      .filter(Boolean) as AIActor[];
    return generateOpeningByTheme(theme, actors);
  },

  searchScripts: (query) => {
    if (!query.trim()) return get().scripts;
    const lowerQuery = query.toLowerCase();
    return get().scripts.filter(
      s =>
        s.title.toLowerCase().includes(lowerQuery) ||
        s.theme.toLowerCase().includes(lowerQuery) ||
        s.opening.toLowerCase().includes(lowerQuery)
    );
  },
}));
