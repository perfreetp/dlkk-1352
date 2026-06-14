import { create } from 'zustand';
import type { Relation, StanceType } from '@/types';
import { storage, generateId } from '@/utils/storage';
import { defaultRelations } from '@/data/mockData';

interface RelationState {
  relations: Relation[];
  isInitialized: boolean;
  init: () => void;
  addRelation: (actorId1: string, actorId2: string, intimacy: number, stance: StanceType, description: string) => void;
  updateRelation: (id: string, updates: Partial<Relation>) => void;
  deleteRelation: (id: string) => void;
  getRelation: (actorId1: string, actorId2: string) => Relation | undefined;
  getRelationsForActor: (actorId: string) => Relation[];
}

export const useRelationStore = create<RelationState>((set, get) => ({
  relations: [],
  isInitialized: false,

  init: () => {
    if (get().isInitialized) return;
    const saved = storage.get<Relation[]>('relations', null);
    if (saved && saved.length > 0) {
      set({ relations: saved, isInitialized: true });
    } else {
      set({ relations: defaultRelations, isInitialized: true });
      storage.set('relations', defaultRelations);
    }
  },

  addRelation: (actorId1, actorId2, intimacy, stance, description) => {
    const existing = get().getRelation(actorId1, actorId2);
    if (existing) return;

    const newRelation: Relation = {
      id: generateId(),
      actorId1,
      actorId2,
      intimacy,
      stance,
      description,
    };
    const relations = [...get().relations, newRelation];
    set({ relations });
    storage.set('relations', relations);
  },

  updateRelation: (id, updates) => {
    const relations = get().relations.map(r =>
      r.id === id ? { ...r, ...updates } : r
    );
    set({ relations });
    storage.set('relations', relations);
  },

  deleteRelation: (id) => {
    const relations = get().relations.filter(r => r.id !== id);
    set({ relations });
    storage.set('relations', relations);
  },

  getRelation: (actorId1, actorId2) => {
    return get().relations.find(
      r =>
        (r.actorId1 === actorId1 && r.actorId2 === actorId2) ||
        (r.actorId1 === actorId2 && r.actorId2 === actorId1)
    );
  },

  getRelationsForActor: (actorId) => {
    return get().relations.filter(
      r => r.actorId1 === actorId || r.actorId2 === actorId
    );
  },
}));
