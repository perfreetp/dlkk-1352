import { create } from 'zustand';
import type { AIActor } from '@/types';
import { storage, generateId } from '@/utils/storage';
import { defaultActors } from '@/data/mockData';
import { useChatStore } from './useChatStore';
import { useRelationStore } from './useRelationStore';
import { useScriptStore } from './useScriptStore';
import { useTemplateStore } from './useTemplateStore';
import { useRecordStore } from './useRecordStore';

interface ActorState {
  actors: AIActor[];
  isInitialized: boolean;
  init: () => void;
  addActor: (actor: Omit<AIActor, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateActor: (id: string, updates: Partial<AIActor>) => void;
  deleteActor: (id: string) => void;
  getActor: (id: string) => AIActor | undefined;
  searchActors: (query: string) => AIActor[];
  addActorFromTemplate: (actor: AIActor) => AIActor | undefined;
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

  deleteActor: (actorId) => {
    // 1. 删除角色本身
    const actors = get().actors.filter(actor => actor.id !== actorId);
    set({ actors });
    storage.set('actors', actors);
    
    // 2. 清理聊天室中的引用
    try {
      const chatStore = useChatStore.getState();
      if (chatStore.removeActorFromAllRooms) {
        chatStore.removeActorFromAllRooms(actorId);
      } else {
        // fallback
        const rooms = chatStore.rooms.map(room => ({
          ...room,
          actorIds: room.actorIds.filter(id => id !== actorId),
          messages: room.messages.map(msg => 
            msg.actorId === actorId ? { ...msg, actorId: undefined } : msg
          ),
        }));
        // @ts-ignore
        useChatStore.setState({ rooms });
        storage.set('chatRooms', rooms);
      }
    } catch (e) {}
    
    // 3. 清理关系
    try {
      const relStore = useRelationStore.getState();
      if (relStore.removeRelationsForActor) {
        relStore.removeRelationsForActor(actorId);
      } else {
        const rels = relStore.relations.filter(
          r => r.actorId1 !== actorId && r.actorId2 !== actorId
        );
        useRelationStore.setState({ relations: rels });
        storage.set('relations', rels);
      }
    } catch (e) {}
    
    // 4. 清理剧本
    try {
      const scriptStore = useScriptStore.getState();
      if (scriptStore.removeActorFromAllScripts) {
        scriptStore.removeActorFromAllScripts(actorId);
      } else {
        const scripts = scriptStore.scripts.map(s => ({
          ...s,
          actorIds: s.actorIds.filter(id => id !== actorId),
        }));
        useScriptStore.setState({ scripts });
        storage.set('scripts', scripts);
      }
    } catch (e) {}
    
    // 5. 清理模板
    try {
      const tplStore = useTemplateStore.getState();
      if (tplStore.removeActorFromAllTemplates) {
        tplStore.removeActorFromAllTemplates(actorId);
      } else {
        const templates = tplStore.templates.map(t => ({
          ...t,
          actors: t.actors.filter(a => a.id !== actorId),
          relations: t.relations.filter(
            r => r.actorId1 !== actorId && r.actorId2 !== actorId
          ),
        }));
        useTemplateStore.setState({ templates });
        storage.set('templates', templates);
      }
    } catch (e) {}
    
    // 6. 清理回放记录
    try {
      const recStore = useRecordStore.getState();
      if (recStore.removeActorFromAllRecords) {
        recStore.removeActorFromAllRecords(actorId);
      } else {
        const records = recStore.records.map(r => ({
          ...r,
          actorIds: r.actorIds.filter(id => id !== actorId),
          messages: r.messages.map(msg => 
            msg.actorId === actorId ? { ...msg, actorId: undefined } : msg
          ),
        }));
        useRecordStore.setState({ records });
        storage.set('records', records);
      }
    } catch (e) {}
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
    if (exists) {
      return get().actors.find(a => a.name === actor.name);
    }
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
    return newActor;
  },
}));
