import { create } from 'zustand';
import type { ChatRecord, ChatMessage, ChatMode, PinnedMemory, ActorSnapshot, ReviewNotes } from '@/types';
import { storage, generateId } from '@/utils/storage';
import { defaultRecords } from '@/data/mockData';

interface RecordState {
  records: ChatRecord[];
  isInitialized: boolean;
  init: () => void;
  addRecord: (
    title: string,
    summary: string,
    actorIds: string[],
    actorsSnapshot: ActorSnapshot[],
    messages: ChatMessage[],
    duration: number,
    mode?: ChatMode,
    pinnedMemories?: PinnedMemory[],
    parentId?: string
  ) => string;
  updateRecord: (id: string, updates: Partial<ChatRecord>) => void;
  deleteRecord: (id: string) => void;
  removeActorFromAllRecords: (actorId: string) => void;
  toggleFavorite: (id: string) => void;
  getRecord: (id: string) => ChatRecord | undefined;
  searchRecords: (query: string) => ChatRecord[];
  getRecordsByTag: (tag: string) => ChatRecord[];
  getAllTags: () => string[];
  getFavoriteRecords: () => ChatRecord[];
  addBranch: (parentId: string, branchRoomName: string) => void;
  updateReviewNotes: (id: string, notes: Partial<ReviewNotes>) => void;
  updateBranchName: (id: string, newName: string) => void;
  getBranchesForRecord: (parentId: string) => ChatRecord[];
}

const normalizePinnedMemories = (raw: any): PinnedMemory[] => {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((item: any) => {
    if (typeof item === 'string') {
      return {
        id: generateId(),
        text: item,
        source: 'manual' as const,
        createdAt: Date.now(),
      };
    }
    return {
      id: item.id || generateId(),
      text: item.text || '',
      source: item.source || 'manual',
      sourceMessageId: item.sourceMessageId,
      recordSource: item.recordSource,
      createdAt: item.createdAt || Date.now(),
    };
  });
};

const snapshotArrayToMap = (arr: ActorSnapshot[] | Record<string, ActorSnapshot> | undefined): Record<string, ActorSnapshot> => {
  if (!arr) return {};
  if (Array.isArray(arr)) {
    const map: Record<string, ActorSnapshot> = {};
    arr.forEach(s => { if (s?.id) map[s.id] = s; });
    return map;
  }
  return arr;
};

const emptyNotes: ReviewNotes = { conflict: '', characterStates: '', nextSteps: '', tags: [] };

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
        pinnedMemories: normalizePinnedMemories(r.pinnedMemories),
        actorsSnapshot: snapshotArrayToMap((r as any).actorsSnapshot),
        reviewNotes: { ...emptyNotes, ...((r as any).reviewNotes || {}) },
        reviewSummary: (r as any).reviewSummary || '',
        parentId: (r as any).parentId,
        branchName: (r as any).branchName,
        branchDisplayName: (r as any).branchDisplayName,
      }));
      set({ records: normalized, isInitialized: true });
    } else {
      set({ records: defaultRecords, isInitialized: true });
      storage.set('records', defaultRecords);
    }
  },

  addRecord: (title, summary, actorIds, actorsSnapshot, messages, duration, mode = 'group', pinnedMemories = [], parentId) => {
    const now = Date.now();
    const newId = generateId();
    
    // 数组转对象存储
    const actorsSnapshotMap = snapshotArrayToMap(actorsSnapshot);
    
    // 自动生成分支名（如果是续写的）
    let branchName: string | undefined;
    if (parentId) {
      const siblings = get().records.filter(r => r.parentId === parentId);
      branchName = `续写${siblings.length + 1}`;
    }
    
    const newRecord: ChatRecord = {
      id: newId,
      title,
      summary,
      actorIds,
      actorsSnapshot: actorsSnapshotMap,
      messages,
      isFavorite: false,
      createdAt: now,
      duration,
      mode,
      savedAt: now,
      pinnedMemories,
      reviewNotes: { ...emptyNotes },
      reviewSummary: '',
      ...(parentId ? { parentId, branchName } : {}),
    };
    const records = [newRecord, ...get().records];
    set({ records });
    storage.set('records', records);
    return newId;
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

  // ⚠️ 历史保真：不再从 actorIds 移除，也不把消息 actorId 置 undefined
  // 展示层会通过 actorsSnapshot 和"未知角色占位"兜底
  removeActorFromAllRecords: (_actorId) => {
    // no-op
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
        r.summary.toLowerCase().includes(lowerQuery) ||
        (r.reviewSummary || '').toLowerCase().includes(lowerQuery) ||
        (r.reviewNotes?.tags || []).some(t => t.toLowerCase().includes(lowerQuery)) ||
        (r.branchName || '').toLowerCase().includes(lowerQuery) ||
        (r.branchDisplayName || '').toLowerCase().includes(lowerQuery)
    );
  },

  getRecordsByTag: (tag) => {
    if (!tag) return get().records;
    return get().records.filter(r => (r.reviewNotes?.tags || []).includes(tag));
  },

  getAllTags: () => {
    const tagSet = new Set<string>();
    get().records.forEach(r => {
      (r.reviewNotes?.tags || []).forEach(t => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  },

  getFavoriteRecords: () => {
    return get().records.filter(r => r.isFavorite);
  },

  addBranch: (_parentId, _branchRoomName) => {
    // 实际分支在用户点击保存时由 addRecord(parentId) 自动创建
  },

  updateReviewNotes: (id, notes) => {
    const records = get().records.map(r => {
      if (r.id !== id) return r;
      const mergedNotes: ReviewNotes = { ...r.reviewNotes, ...notes };
      // 确保 tags 是数组
      if (!mergedNotes.tags || !Array.isArray(mergedNotes.tags)) mergedNotes.tags = [];
      // 自动生成摘要：优先 conflict，再 nextSteps，再 characterStates，取前 60 字
      const parts: string[] = [];
      if (mergedNotes.conflict) parts.push(mergedNotes.conflict);
      if (mergedNotes.nextSteps) parts.push(mergedNotes.nextSteps);
      if (mergedNotes.characterStates) parts.push(mergedNotes.characterStates);
      const full = parts.join('｜');
      const reviewSummary = full.length > 60 ? full.substring(0, 60) + '…' : full;
      return { ...r, reviewNotes: mergedNotes, reviewSummary, savedAt: Date.now() };
    });
    set({ records });
    storage.set('records', records);
  },

  updateBranchName: (id, newName) => {
    const records = get().records.map(r =>
      r.id === id ? { ...r, branchDisplayName: newName.trim() || undefined, savedAt: Date.now() } : r
    );
    set({ records });
    storage.set('records', records);
  },

  getBranchesForRecord: (parentId) => {
    return get().records.filter(r => r.parentId === parentId);
  },
}));
