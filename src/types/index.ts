export interface AIActor {
  id: string;
  name: string;
  avatar: string;
  tone: string;
  memory: string;
  taboo: string;
  tags: string[];
  color: string;
  createdAt: number;
  updatedAt: number;
}

export type StanceType = 'friendly' | 'neutral' | 'hostile' | 'complex';

export interface Relation {
  id: string;
  actorId1: string;
  actorId2: string;
  intimacy: number;
  stance: StanceType;
  description: string;
}

export type MessageType = 'ai' | 'narration' | 'system';

export interface ChatMessage {
  id: string;
  type: MessageType;
  actorId?: string;
  content: string;
  timestamp: number;
  isFavorite: boolean;
  isEdited: boolean;
  pinnedMemory?: string;
}

export type ChatMode = 'group' | 'one-on-one';

export interface ChatRoom {
  id: string;
  name: string;
  mode: ChatMode;
  actorIds: string[];
  messages: ChatMessage[];
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
  currentSpeakerIndex: number;
  isPlaying: boolean;
}

export interface Script {
  id: string;
  title: string;
  theme: string;
  opening: string;
  actorIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatRecord {
  id: string;
  title: string;
  summary: string;
  actorIds: string[];
  messages: ChatMessage[];
  isFavorite: boolean;
  createdAt: number;
  duration: number;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  actors: AIActor[];
  relations: Relation[];
  createdAt: number;
}

export type ChatSpeed = 'slow' | 'normal' | 'fast';
export type ExportFormat = 'txt' | 'json' | 'md' | 'markdown';

export interface AppSettings {
  theme: 'dark' | 'light' | 'ocean' | 'sunset';
  language: 'zh-CN';
  chatSpeed: ChatSpeed;
  autoPlay: boolean;
  exportFormat: ExportFormat;
  showTimestamp: boolean;
  animationsEnabled: boolean;
}

export interface SpeechStats {
  actorId: string;
  count: number;
  percentage: number;
}
