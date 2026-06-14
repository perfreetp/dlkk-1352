import { create } from 'zustand';
import type { AIActor } from '@/types';
import { storage, generateId } from '@/utils/storage';
import { defaultActors } from '@/data/mockData';

interface ActorState {
  actors: AIActor[];
  isInitialized: boolean;
  init: () => void;
  addActor: (actor: Omit<AIActor, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateActor: (id: string, updates: Partial<AIActor>) => void;
  deleteActor: (id: string) => void;
  getActor: (id: string) => AIActor | undefined;
  searchActors: (query: string) => AIActor[];
  addActorFromTemplate: (actor: AIActor) => void;
}

export const useActorStore = create<ActorState>((set, get) => ({
  actors: [],
  isInitialized: false,

  init: () => {
    if (get().isInitialized) return;
    const saved = storage.get<AIActor[]>('actors', null);
    if (saved && saved.length > 0) {
      set({ actors: saved, isInitialized: true });
    } else {
      set({ actors: defaultActors, isInitialized: true });
      storage.set('actors', defaultActors);
    }
  },

  addActor: (actorData) => {
    const now = Date.now();
    const newActor: AIActor = {
      ...actorData,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    const actors = [...get().actors, newActor];
    set({ actors });
    storage.set('actors', actors);
  },

  updateActor: (id, updates) => {
    const actors = get().actors.map(actor =>
      actor.id === id
        ? { ...actor, ...updates, updatedAt: Date.now() }
        : actor
    );
    set({ actors });
    storage.set('actors', actors);
  },

  deleteActor: (id) => {
    const actors = get().actors.filter(actor => actor.id !== id);
    set({ actors });
    storage.set('actors', actors);
  },

  getActor: (id) => {
    return get().actors.find(actor => actor.id === id);
  },

  searchActors: (query) => {
    if (!query.trim()) return get().actors;
    const lowerQuery = query.toLowerCase();
    return get().actors.filter(
      actor =>
        actor.name.toLowerCase().includes(lowerQuery) ||
        actor.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
        actor.tone.toLowerCase().includes(lowerQuery)
    );
  },

  addActorFromTemplate: (actor) => {
    const exists = get().actors.some(a => a.name === actor.name);
    if (exists) return;
    const now = Date.now();
    const newActor: AIActor = {
      ...actor,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    const actors = [...get().actors, newActor];
    set({ actors });
    storage.set('actors', actors);
  },
}));
