import { create } from 'zustand';
import type { Template, AIActor, Relation } from '@/types';
import { storage, generateId } from '@/utils/storage';
import { defaultTemplates } from '@/data/mockData';

interface TemplateState {
  templates: Template[];
  isInitialized: boolean;
  init: () => void;
  addTemplate: (name: string, description: string, actors: AIActor[], relations: Relation[]) => void;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  deleteTemplate: (id: string) => void;
  removeActorFromAllTemplates: (actorId: string) => void;
  getTemplate: (id: string) => Template | undefined;
  searchTemplates: (query: string) => Template[];
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  isInitialized: false,

  init: () => {
    if (get().isInitialized) return;
    const saved = storage.get<Template[]>('templates', null);
    if (saved && saved.length > 0) {
      set({ templates: saved, isInitialized: true });
    } else {
      set({ templates: defaultTemplates, isInitialized: true });
      storage.set('templates', defaultTemplates);
    }
  },

  addTemplate: (name, description, actors, relations) => {
    const now = Date.now();
    const newTemplate: Template = {
      id: generateId(),
      name,
      description,
      actors,
      relations,
      createdAt: now,
    };
    const templates = [...get().templates, newTemplate];
    set({ templates });
    storage.set('templates', templates);
  },

  updateTemplate: (id, updates) => {
    const templates = get().templates.map(t =>
      t.id === id ? { ...t, ...updates } : t
    );
    set({ templates });
    storage.set('templates', templates);
  },

  deleteTemplate: (id) => {
    const templates = get().templates.filter(t => t.id !== id);
    set({ templates });
    storage.set('templates', templates);
  },

  removeActorFromAllTemplates: (actorId) => {
    const templates = get().templates.map(t => ({
      ...t,
      actors: t.actors.filter(a => a.id !== actorId),
      relations: t.relations.filter(
        r => r.actorId1 !== actorId && r.actorId2 !== actorId
      ),
    }));
    set({ templates });
    storage.set('templates', templates);
  },

  getTemplate: (id) => {
    return get().templates.find(t => t.id === id);
  },

  searchTemplates: (query) => {
    if (!query.trim()) return get().templates;
    const lowerQuery = query.toLowerCase();
    return get().templates.filter(
      t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery)
    );
  },
}));
