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
  getFavoriteRecords: () => ChatRecord[];
  addBranch: (parentId: string, branchRoomName: string) => void;
  updateReviewNotes: (id: string, notes: Partial<ReviewNotes>) => void;
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
      createdAt: item.createdAt || Date.now(),
    };
  });
};

const emptyNotes: ReviewNotes = { conflict: '', characterStates: '', nextSteps: '' };

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
        actorsSnapshot: (r as any).actorsSnapshot || [],
        reviewNotes: (r as any).reviewNotes || { ...emptyNotes },
        reviewSummary: (r as any).reviewSummary || '',
        parentId: (r as any).parentId,
        branchName: (r as any).branchName,
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
      actorsSnapshot,
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
        (r.reviewSummary || '').toLowerCase().includes(lowerQuery)
    );
  },

  getFavoriteRecords: () => {
    return get().records.filter(r => r.isFavorite);
  },

  // 记录一个续写分支（但此时续写房间还没保存，先占个空？——
  //  实际上用户会在续写房间里再点"保存到回放库"，那时 addRecord 已经用 parentId 自动加分支。
  //  这个 addBranch 只是给聊天室 restore 后立即可见一个占位提示，可选实现）
  addBranch: (_parentId, _branchRoomName) => {
    // 实际分支在用户点击保存时由 addRecord(parentId) 自动创建
  },

  updateReviewNotes: (id, notes) => {
    const records = get().records.map(r => {
      if (r.id !== id) return r;
      const mergedNotes: ReviewNotes = { ...r.reviewNotes, ...notes };
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

  getBranchesForRecord: (parentId) => {
    return get().records.filter(r => r.parentId === parentId);
  },
}));
