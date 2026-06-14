import { create } from 'zustand';
import type { ChatRoom, ChatMessage, ChatMode, SpeechStats, PinnedMemory } from '@/types';
import { storage, generateId } from '@/utils/storage';
import { generateAIResponse, getChatSpeedInterval } from '@/utils/aiEngine';
import { useActorStore } from './useActorStore';
import { useSettingStore } from './useSettingStore';
import { useRecordStore } from './useRecordStore';

interface ChatState {
  rooms: ChatRoom[];
  currentRoomId: string | null;
  isInitialized: boolean;
  timer: number | null;
  
  init: () => void;
  createRoom: (name: string, actorIds: string[], mode?: ChatMode, parentRecordId?: string, parentRecordTitle?: string) => string;
  setCurrentRoom: (roomId: string | null) => void;
  deleteRoom: (roomId: string) => void;
  
  addMessage: (roomId: string, message: ChatMessage) => void;
  addNarration: (roomId: string, content: string) => void;
  editMessage: (roomId: string, messageId: string, newContent: string) => void;
  toggleFavorite: (roomId: string, messageId: string) => void;
  pinMemory: (roomId: string, text: string) => void;
  unpinMemory: (roomId: string, memoryId: string) => void;
  pinMessageAsMemory: (roomId: string, messageId: string) => void;
  removeActorFromAllRooms: (actorId: string) => void;
  saveRoomToRecords: (roomId: string) => string | null;
  restoreRoomFromRecord: (recordId: string) => string | null;
  
  startChat: (roomId: string) => void;
  pauseChat: (roomId: string) => void;
  togglePlay: (roomId: string) => void;
  
  nextSpeaker: (roomId: string) => void;
  
  getCurrentRoom: () => ChatRoom | undefined;
  getSpeechStats: (roomId: string) => SpeechStats[];
  
  clearMessages: (roomId: string) => void;
}

// 兼容旧数据：把 string[] 转成 PinnedMemory[]
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

export const useChatStore = create<ChatState>((set, get) => ({
  rooms: [],
  currentRoomId: null,
  isInitialized: false,
  timer: null,

  init: () => {
    if (get().isInitialized) return;
    const saved = storage.get<ChatRoom[]>('chatRooms', null);
    if (saved && saved.length > 0) {
      const normalized = saved.map(room => ({
        ...room,
        pinnedMemories: normalizePinnedMemories(room.pinnedMemories),
      }));
      set({ rooms: normalized, isInitialized: true });
    } else {
      set({ isInitialized: true });
    }
  },

  createRoom: (name, actorIds, mode = 'group', parentRecordId, parentRecordTitle) => {
    const now = Date.now();
    const newRoom: ChatRoom = {
      id: generateId(),
      name,
      mode,
      actorIds: [...actorIds],
      messages: [],
      isPinned: false,
      createdAt: now,
      updatedAt: now,
      currentSpeakerIndex: 0,
      isPlaying: false,
      pinnedMemories: [],
      ...(parentRecordId ? { parentRecordId, parentRecordTitle } : {}),
    };
    const rooms = [...get().rooms, newRoom];
    set({ rooms, currentRoomId: newRoom.id });
    storage.set('chatRooms', rooms);
    return newRoom.id;
  },

  setCurrentRoom: (roomId) => {
    set({ currentRoomId: roomId });
  },

  deleteRoom: (roomId) => {
    const rooms = get().rooms.filter(r => r.id !== roomId);
    const currentRoomId = get().currentRoomId === roomId ? null : get().currentRoomId;
    set({ rooms, currentRoomId });
    storage.set('chatRooms', rooms);
  },

  addMessage: (roomId, message) => {
    const rooms = get().rooms.map(room =>
      room.id === roomId
        ? { ...room, messages: [...room.messages, message], updatedAt: Date.now() }
        : room
    );
    set({ rooms });
    storage.set('chatRooms', rooms);
  },

  addNarration: (roomId, content) => {
    const narration: ChatMessage = {
      id: generateId(),
      type: 'narration',
      content,
      timestamp: Date.now(),
      isFavorite: false,
      isEdited: false,
    };
    get().addMessage(roomId, narration);
  },

  editMessage: (roomId, messageId, newContent) => {
    const rooms = get().rooms.map(room =>
      room.id === roomId
        ? {
            ...room,
            messages: room.messages.map(msg =>
              msg.id === messageId
                ? { ...msg, content: newContent, isEdited: true }
                : msg
            ),
            updatedAt: Date.now(),
          }
        : room
    );
    set({ rooms });
    storage.set('chatRooms', rooms);
  },

  toggleFavorite: (roomId, messageId) => {
    const rooms = get().rooms.map(room =>
      room.id === roomId
        ? {
            ...room,
            messages: room.messages.map(msg =>
              msg.id === messageId
                ? { ...msg, isFavorite: !msg.isFavorite }
                : msg
            ),
          }
        : room
    );
    set({ rooms });
    storage.set('chatRooms', rooms);
  },

  pinMemory: (roomId, text) => {
    const memory: PinnedMemory = {
      id: generateId(),
      text,
      source: 'manual',
      createdAt: Date.now(),
    };
    const rooms = get().rooms.map(room =>
      room.id === roomId
        ? { 
            ...room, 
            pinnedMemories: [...room.pinnedMemories, memory],
            updatedAt: Date.now() 
          }
        : room
    );
    set({ rooms });
    storage.set('chatRooms', rooms);
  },

  unpinMemory: (roomId, memoryId) => {
    const rooms = get().rooms.map(room => {
      if (room.id !== roomId) return room;
      return { 
        ...room, 
        pinnedMemories: room.pinnedMemories.filter(m => m.id !== memoryId),
        updatedAt: Date.now() 
      };
    });
    set({ rooms });
    storage.set('chatRooms', rooms);
  },

  pinMessageAsMemory: (roomId, messageId) => {
    const room = get().rooms.find(r => r.id === roomId);
    if (!room) return;
    const msg = room.messages.find(m => m.id === messageId);
    if (!msg) return;
    const text = `【${msg.type === 'narration' ? '旁白' : '角色发言'}】${msg.content}`;
    
    const memory: PinnedMemory = {
      id: generateId(),
      text,
      source: 'message',
      sourceMessageId: messageId,
      createdAt: Date.now(),
    };
    
    const rooms = get().rooms.map(r =>
      r.id === roomId
        ? { ...r, pinnedMemories: [...r.pinnedMemories, memory], updatedAt: Date.now() }
        : r
    );
    set({ rooms });
    storage.set('chatRooms', rooms);
  },

  // ⚠️ 历史保真：不再从 actorIds 移除，也不把消息 actorId 置 undefined
  // 展示层通过"未知角色占位"兜底
  removeActorFromAllRooms: (_actorId) => {
    // no-op
  },

  saveRoomToRecords: (roomId) => {
    const room = get().rooms.find(r => r.id === roomId);
    if (!room) return null;
    
    const actors = useActorStore.getState().actors;
    const roomActors = actors.filter(a => room.actorIds.includes(a.id));
    const actorNames = roomActors.map(a => a.name).join('、');
    
    // 保存角色快照（含当时的名字/头像/颜色），删除角色后也能还原展示
    const actorsSnapshot = room.actorIds.map(id => {
      const actor = actors.find(a => a.id === id);
      if (actor) {
        return {
          id: actor.id,
          name: actor.name,
          avatar: actor.avatar,
          tone: actor.tone,
          color: actor.color,
        };
      }
      return {
        id,
        name: '未知角色',
        avatar: '❓',
        tone: 'neutral',
        color: '#64748b',
      };
    });
    
    let summary = '';
    const narrationMsgs = room.messages.filter(m => m.type === 'narration');
    const aiMsgs = room.messages.filter(m => m.type === 'ai');
    
    if (narrationMsgs.length > 0) {
      summary = narrationMsgs[0].content;
    } else if (aiMsgs.length > 0) {
      summary = `${actorNames}的对话：${aiMsgs[0].content.substring(0, 50)}${aiMsgs[0].content.length > 50 ? '...' : ''}`;
    } else {
      summary = `${actorNames || '角色'}的对话记录`;
    }
    
    let duration = 0;
    if (room.messages.length > 0) {
      const first = room.messages[0].timestamp;
      const last = room.messages[room.messages.length - 1].timestamp;
      duration = Math.round((last - first) / 1000);
    }
    
    const recordStore = useRecordStore.getState();
    if (!recordStore.isInitialized) {
      recordStore.init();
    }
    
    recordStore.addRecord(
      room.name,
      summary,
      [...room.actorIds],
      actorsSnapshot,
      room.messages.map(m => ({ ...m })),
      duration,
      room.mode,
      [...room.pinnedMemories],
      room.parentRecordId
    );
    
    return 'ok';
  },

  restoreRoomFromRecord: (recordId) => {
    const record = useRecordStore.getState().getRecord(recordId);
    if (!record) return null;

    // 历史保真：保留所有原始 actorIds（含已删除的），让 UI 统一占位
    // 这样发言统计、人数摘要都和当时一致
    const actorIds = [...record.actorIds];

    const now = Date.now();
    const newRoom: ChatRoom = {
      id: generateId(),
      name: `${record.title}（续）`,
      mode: record.mode,
      actorIds,
      messages: record.messages.map(m => ({ ...m })),
      isPinned: false,
      createdAt: now,
      updatedAt: now,
      currentSpeakerIndex: 0,
      isPlaying: false,
      pinnedMemories: (record.pinnedMemories || []).map(m => ({ ...m })),
      parentRecordId: record.id,
      parentRecordTitle: record.title,
    };
    const rooms = [...get().rooms, newRoom];
    set({ rooms, currentRoomId: newRoom.id });
    storage.set('chatRooms', rooms);
    
    // 通知 recordStore 这是一个新分支
    useRecordStore.getState().addBranch(record.id, newRoom.name);
    
    return newRoom.id;
  },

  startChat: (roomId) => {
    const { rooms } = get();
    const room = rooms.find(r => r.id === roomId);
    if (!room || room.isPlaying) return;
    if (room.actorIds.length === 0) return;

    const updatedRooms = rooms.map(r =>
      r.id === roomId ? { ...r, isPlaying: true } : r
    );
    set({ rooms: updatedRooms });
    storage.set('chatRooms', updatedRooms);

    get().nextSpeaker(roomId);
  },

  pauseChat: (roomId) => {
    const { rooms, timer } = get();
    if (timer) {
      clearTimeout(timer);
      set({ timer: null });
    }
    
    const updatedRooms = rooms.map(r =>
      r.id === roomId ? { ...r, isPlaying: false } : r
    );
    set({ rooms: updatedRooms });
    storage.set('chatRooms', updatedRooms);
  },

  togglePlay: (roomId) => {
    const room = get().rooms.find(r => r.id === roomId);
    if (!room) return;
    
    if (room.isPlaying) {
      get().pauseChat(roomId);
    } else {
      get().startChat(roomId);
    }
  },

  nextSpeaker: (roomId) => {
    const { rooms, timer } = get();
    if (timer) clearTimeout(timer);
    
    const room = rooms.find(r => r.id === roomId);
    if (!room || !room.isPlaying || room.actorIds.length === 0) return;

    const actors = useActorStore.getState().actors;
    const currentActor = actors.find(a => a.id === room.actorIds[room.currentSpeakerIndex]);
    
    // 提取关键记忆的纯文本给 AI 引擎
    const pinnedTexts = (room.pinnedMemories || []).map(m => m.text);
    
    if (currentActor) {
      const response = generateAIResponse(
        currentActor,
        room.messages,
        actors,
        pinnedTexts
      );
      
      const updatedRooms = rooms.map(r =>
        r.id === roomId
          ? { ...r, messages: [...r.messages, response], updatedAt: Date.now() }
          : r
      );
      set({ rooms: updatedRooms });
      storage.set('chatRooms', updatedRooms);
    }

    const settingStore = useSettingStore.getState();
    const interval = getChatSpeedInterval(settingStore.settings.chatSpeed);
    
    // 跳过已删除的角色（找不到 actor 的就跳到下一位）
    let nextIndex = (room.currentSpeakerIndex + 1) % room.actorIds.length;
    let safeGuard = 0;
    while (!actors.find(a => a.id === room.actorIds[nextIndex]) && safeGuard < room.actorIds.length) {
      nextIndex = (nextIndex + 1) % room.actorIds.length;
      safeGuard++;
    }
    
    const updatedRooms2 = get().rooms.map(r =>
      r.id === roomId
        ? { ...r, currentSpeakerIndex: nextIndex }
        : r
    );
    set({ rooms: updatedRooms2 });
    storage.set('chatRooms', updatedRooms2);

    const newTimer = window.setTimeout(() => {
      if (get().rooms.find(r => r.id === roomId)?.isPlaying) {
        get().nextSpeaker(roomId);
      }
    }, interval);
    
    set({ timer: newTimer });
  },

  getCurrentRoom: () => {
    const { rooms, currentRoomId } = get();
    return rooms.find(r => r.id === currentRoomId);
  },

  getSpeechStats: (roomId): SpeechStats[] => {
    const room = get().rooms.find(r => r.id === roomId);
    if (!room) return [];

    // 历史保真：所有 actorId 都计入，即使 actor 已删除
    const aiMessages = room.messages.filter(m => m.type === 'ai' && m.actorId);
    const total = aiMessages.length;
    
    const statsMap = new Map<string, number>();
    aiMessages.forEach(msg => {
      if (msg.actorId) {
        statsMap.set(msg.actorId, (statsMap.get(msg.actorId) || 0) + 1);
      }
    });

    return Array.from(statsMap.entries()).map(([actorId, count]) => ({
      actorId,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  },

  clearMessages: (roomId) => {
    const rooms = get().rooms.map(room =>
      room.id === roomId
        ? { ...room, messages: [], currentSpeakerIndex: 0, isPlaying: false, updatedAt: Date.now() }
        : room
    );
    if (get().timer) {
      clearTimeout(get().timer);
      set({ timer: null });
    }
    set({ rooms });
    storage.set('chatRooms', rooms);
  },
}));
