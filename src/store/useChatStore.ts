import { create } from 'zustand';
import type { ChatRoom, ChatMessage, ChatMode, SpeechStats } from '@/types';
import { storage, generateId } from '@/utils/storage';
import { generateAIResponse, getChatSpeedInterval } from '@/utils/aiEngine';
import { useActorStore } from './useActorStore';
import { useSettingStore } from './useSettingStore';

interface ChatState {
  rooms: ChatRoom[];
  currentRoomId: string | null;
  isInitialized: boolean;
  timer: number | null;
  
  init: () => void;
  createRoom: (name: string, actorIds: string[], mode?: ChatMode) => string;
  setCurrentRoom: (roomId: string | null) => void;
  deleteRoom: (roomId: string) => void;
  
  addMessage: (roomId: string, message: ChatMessage) => void;
  addNarration: (roomId: string, content: string) => void;
  editMessage: (roomId: string, messageId: string, newContent: string) => void;
  toggleFavorite: (roomId: string, messageId: string) => void;
  pinMemory: (roomId: string, memory: string) => void;
  
  startChat: (roomId: string) => void;
  pauseChat: (roomId: string) => void;
  togglePlay: (roomId: string) => void;
  
  nextSpeaker: (roomId: string) => void;
  
  getCurrentRoom: () => ChatRoom | undefined;
  getSpeechStats: (roomId: string) => SpeechStats[];
  
  clearMessages: (roomId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  rooms: [],
  currentRoomId: null,
  isInitialized: false,
  timer: null,

  init: () => {
    if (get().isInitialized) return;
    const saved = storage.get<ChatRoom[]>('chatRooms', null);
    if (saved && saved.length > 0) {
      set({ rooms: saved, isInitialized: true });
    } else {
      set({ isInitialized: true });
    }
  },

  createRoom: (name, actorIds, mode = 'group') => {
    const now = Date.now();
    const newRoom: ChatRoom = {
      id: generateId(),
      name,
      mode,
      actorIds,
      messages: [],
      isPinned: false,
      createdAt: now,
      updatedAt: now,
      currentSpeakerIndex: 0,
      isPlaying: false,
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

  pinMemory: (roomId, memory) => {
    const rooms = get().rooms.map(room =>
      room.id === roomId
        ? { ...room, updatedAt: Date.now() }
        : room
    );
    set({ rooms });
    storage.set('chatRooms', rooms);
  },

  startChat: (roomId) => {
    const { rooms } = get();
    const room = rooms.find(r => r.id === roomId);
    if (!room || room.isPlaying) return;

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
    
    if (currentActor) {
      const lastActorId = room.currentSpeakerIndex > 0 
        ? room.actorIds[(room.currentSpeakerIndex - 1 + room.actorIds.length) % room.actorIds.length]
        : null;
      
      const response = generateAIResponse(
        currentActor,
        room.messages,
        actors,
        undefined
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
    
    const nextIndex = (room.currentSpeakerIndex + 1) % room.actorIds.length;
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
