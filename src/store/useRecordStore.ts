import { create } from 'zustand';
import type { ChatRecord, ChatMessage, ChatMode } from '@/types';
import { storage, generateId } from '@/utils/storage';
import { defaultRecords } from '@/data/mockData';

interface RecordState {
  records: ChatRecord[];
  isInitialized: boolean;
  init: () => void;
  addRecord: (title: string, summary: string, actorIds: string[], messages: ChatMessage[], duration: number, mode?: ChatMode, pinnedMemories?: string[]) => void;
  updateRecord: (id: string, updates: Partial<ChatRecord>) => void;
  deleteRecord: (id: string) => void;
  removeActorFromAllRecords: (actorId: string) => void;
  toggleFavorite: (id: string) => void;
  getRecord: (id: string) => ChatRecord | undefined;
  searchRecords: (query: string) => ChatRecord[];
  getFavoriteRecords: () => ChatRecord[];
}

export const useRecordStore = create<RecordState>((set, get) => ({
  records: [],
  isInitialized: false,

  init: () => {
    if (get().isInitialized) return;
    const saved = storage.get<ChatRecord[]>('records', null);
    if (saved && saved.length > 0) {
      const normalized = saved.map(r => ({
        ...r,
        mode: r.mode || (r.actorIds.length === 2 ? 'one-on-one' : 'group'),
        savedAt: r.savedAt || r.createdAt,
        pinnedMemories: r.pinnedMemories || [],
      }));
      set({ records: normalized, isInitialized: true });
    } else {
      set({ records: defaultRecords, isInitialized: true });
      storage.set('records', defaultRecords);
    }
  },

  addRecord: (title, summary, actorIds, messages, duration, mode = 'group', pinnedMemories = []) => {
    const now = Date.now();
    const newRecord: ChatRecord = {
      id: generateId(),
      title,
      summary,
      actorIds,
      messages,
      isFavorite: false,
      createdAt: now,
      duration,
      mode,
      savedAt: now,
      pinnedMemories,
    };
    const records = [newRecord, ...get().records];
    set({ records });
    storage.set('records', records);
  },

  updateRecord: (id, updates) => {
    const records = get().records.map(r =>
      r.id === id ? { ...r, ...updates } : r
    );
    set({ records });
    storage.set('records', records);
  },

  deleteRecord: (id) => {
    const records = get().records.filter(r => r.id !== id);
    set({ records });
    storage.set('records', records);
  },

  removeActorFromAllRecords: (actorId) => {
    const records = get().records.map(r => ({
      ...r,
      actorIds: r.actorIds.filter(id => id !== actorId),
      messages: r.messages.map(msg => 
        msg.actorId === actorId ? { ...msg, actorId: undefined } : msg
      ),
    }));
    set({ records });
    storage.set('records', records);
  },

  toggleFavorite: (id) => {
    const records = get().records.map(r =>
      r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
    );
    set({ records });
    storage.set('records', records);
  },

  getRecord: (id) => {
    return get().records.find(r => r.id === id);
  },

  searchRecords: (query) => {
    if (!query.trim()) return get().records;
    const lowerQuery = query.toLowerCase();
    return get().records.filter(
      r =>
        r.title.toLowerCase().includes(lowerQuery) ||
        r.summary.toLowerCase().includes(lowerQuery)
    );
  },

  getFavoriteRecords: () => {
    return get().records.filter(r => r.isFavorite);
  },
}));
