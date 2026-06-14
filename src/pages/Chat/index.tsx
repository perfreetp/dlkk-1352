import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Plus,
  AlignLeft,
  Edit3,
  Star,
  Download,
  Trash2,
  Users,
  BarChart3,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';
import { useActorStore } from '@/store/useActorStore';
import { useSettingStore } from '@/store/useSettingStore';
import { formatTime, generateId } from '@/utils/storage';
import { exportChatAsText, exportChatAsMarkdown } from '@/utils/aiEngine';
import type { ChatMessage } from '@/types';

export default function Chat() {
  const {
    rooms,
    currentRoomId,
    init: initChat,
    createRoom,
    setCurrentRoom,
    deleteRoom,
    addNarration,
    editMessage,
    toggleFavorite,
    startChat,
    pauseChat,
    togglePlay,
    getCurrentRoom,
    getSpeechStats,
    clearMessages,
  } = useChatStore();
  const { actors, init: initActors } = useActorStore();
  const { settings } = useSettingStore();

  const [showRoomList, setShowRoomList] = useState(true);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedActors, setSelectedActors] = useState<string[]>([]);
  const [chatMode, setChatMode] = useState<'group' | 'one-on-one'>('group');
  const [narrationText, setNarrationText] = useState('');
  const [showNarrationInput, setShowNarrationInput] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [showStats, setShowStats] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initActors();
    initChat();
  }, [initActors, initChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [getCurrentRoom()?.messages.length]);

  const currentRoom = getCurrentRoom();
  const speechStats = currentRoomId ? getSpeechStats(currentRoomId) : [];

  const handleCreateRoom = () => {
    if (!newRoomName.trim() || selectedActors.length === 0) return;
    const roomId = createRoom(newRoomName.trim(), selectedActors, chatMode);
    setCurrentRoom(roomId);
    setShowCreateRoom(false);
    setNewRoomName('');
    setSelectedActors([]);
  };

  const toggleActorSelection = (actorId: string) => {
    if (chatMode === 'one-on-one') {
      setSelectedActors([actorId]);
    } else {
      setSelectedActors(prev =>
        prev.includes(actorId)
          ? prev.filter(id => id !== actorId)
          : [...prev, actorId]
      );
    }
  };

  const handleAddNarration = () => {
    if (!narrationText.trim() || !currentRoomId) return;
    addNarration(currentRoomId, narrationText.trim());
    setNarrationText('');
    setShowNarrationInput(false);
  };

  const startEditMessage = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditingContent(msg.content);
  };

  const saveEditMessage = () => {
    if (!editingMessageId || !currentRoomId) return;
    editMessage(currentRoomId, editingMessageId, editingContent);
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleExport = () => {
    if (!currentRoom) return;
    const roomActors = actors.filter(a => currentRoom.actorIds.includes(a.id));
    
    let content: string;
    let filename: string;
    let mimeType: string;

    if (settings.exportFormat === 'txt') {
      content = exportChatAsText(currentRoom.messages, roomActors);
      filename = `${currentRoom.name}.txt`;
      mimeType = 'text/plain';
    } else if (settings.exportFormat === 'md') {
      content = exportChatAsMarkdown(currentRoom.messages, roomActors, currentRoom.name);
      filename = `${currentRoom.name}.md`;
      mimeType = 'text/markdown';
    } else {
      content = JSON.stringify(currentRoom.messages, null, 2);
      filename = `${currentRoom.name}.json`;
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getActorById = (id: string) => actors.find(a => a.id === id);

  return (
    <div className="animate-fade-in h-[calc(100vh-4rem)] -m-8">
      <div className="flex h-full">
        {/* 房间列表侧边栏 */}
        <div
          className={`${
            showRoomList ? 'w-64' : 'w-0'
          } transition-all duration-300 overflow-hidden border-r border-violet-500/20 bg-indigo-950/30`}
        >
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">聊天室</h3>
              <button
                onClick={() => setShowCreateRoom(true)}
                className="p-1.5 rounded-lg bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => setCurrentRoom(room.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    currentRoomId === room.id
                      ? 'bg-violet-500/20 border border-violet-500/30'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white truncate">{room.name}</p>
                    {room.isPlaying && (
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-violet-300/50 mt-1">
                    {room.actorIds.length} 个角色 · {room.messages.length} 条消息
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 主聊天区域 */}
        <div className="flex-1 flex flex-col">
          {/* 顶部栏 */}
          <div className="h-14 border-b border-violet-500/20 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowRoomList(!showRoomList)}
                className="p-2 rounded-lg hover:bg-white/5 text-violet-400 hover:text-violet-300 transition-colors"
              >
                <ChevronLeft className={`w-5 h-5 transition-transform ${!showRoomList ? 'rotate-180' : ''}`} />
              </button>
              {currentRoom ? (
                <div>
                  <h2 className="font-semibold text-white">{currentRoom.name}</h2>
                  <p className="text-xs text-violet-300/50">
                    {currentRoom.mode === 'group' ? '群聊模式' : '一对一模式'}
                  </p>
                </div>
              ) : (
                <p className="text-violet-300/50">选择或创建一个聊天室</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentRoom && (
                <>
                  <button
                    onClick={() => setShowStats(!showStats)}
                    className={`p-2 rounded-lg transition-colors ${
                      showStats ? 'bg-violet-500/20 text-violet-300' : 'hover:bg-white/5 text-violet-400 hover:text-violet-300'
                    }`}
                    title="发言统计"
                  >
                    <BarChart3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleExport}
                    className="p-2 rounded-lg hover:bg-white/5 text-violet-400 hover:text-violet-300 transition-colors"
                    title="导出对话"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 聊天内容区 */}
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {currentRoom ? (
                currentRoom.messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <Sparkles className="w-12 h-12 text-violet-400/30 mb-4" />
                    <p className="text-violet-300/50 mb-4">对话即将开始...</p>
                    <button
                      onClick={() => startChat(currentRoom.id)}
                      className="btn-primary"
                    >
                      开始对话
                    </button>
                  </div>
                ) : (
                  <>
                    {currentRoom.messages.map((msg) => {
                      const actor = msg.actorId ? getActorById(msg.actorId) : null;
                      
                      if (msg.type === 'narration') {
                        return (
                          <div key={msg.id} className="narration-bubble">
                            {editingMessageId === msg.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                  className="input-field text-sm"
                                  rows={2}
                                  autoFocus
                                />
                                <div className="flex gap-2 justify-center">
                                  <button
                                    onClick={() => setEditingMessageId(null)}
                                    className="text-xs text-violet-300/60 hover:text-violet-300"
                                  >
                                    取消
                                  </button>
                                  <button
                                    onClick={saveEditMessage}
                                    className="text-xs text-amber-400 hover:text-amber-300"
                                  >
                                    保存
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="group relative">
                                <p>{msg.content}</p>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                  <button
                                    onClick={() => startEditMessage(msg)}
                                    className="p-1 rounded bg-black/30 text-amber-300 hover:bg-black/50"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => toggleFavorite(currentRoom.id, msg.id)}
                                    className={`p-1 rounded bg-black/30 ${msg.isFavorite ? 'text-amber-400' : 'text-white/60'} hover:bg-black/50`}
                                  >
                                    <Star className={`w-3 h-3 ${msg.isFavorite ? 'fill-amber-400' : ''}`} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-start gap-3 group ${
                            msg.actorId === currentRoom.actorIds[0] ? 'flex-row' : 'flex-row-reverse'
                          }`}
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                            style={{ background: `${actor?.color}30`, border: `1px solid ${actor?.color}50` }}
                          >
                            {actor?.avatar}
                          </div>

                          <div className={`max-w-[70%] ${
                            msg.actorId === currentRoom.actorIds[0] ? 'items-start' : 'items-end'
                          }`}>
                            <p className={`text-xs text-violet-300/60 mb-1 ${
                              msg.actorId === currentRoom.actorIds[0] ? 'text-left' : 'text-right'
                            }`}>
                              {actor?.name} · {formatTime(msg.timestamp)}
                              {msg.isEdited && <span className="ml-1 text-violet-400/50">(已编辑)</span>}
                            </p>
                            
                            {editingMessageId === msg.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                  className="input-field text-sm"
                                  rows={2}
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setEditingMessageId(null)}
                                    className="text-xs text-violet-300/60 hover:text-violet-300"
                                  >
                                    取消
                                  </button>
                                  <button
                                    onClick={saveEditMessage}
                                    className="text-xs text-violet-400 hover:text-violet-300"
                                  >
                                    保存
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`chat-bubble-left relative ${
                                  msg.actorId !== currentRoom.actorIds[0] ? 'chat-bubble-right ml-auto' : ''
                                }`}
                                style={{
                                  background: msg.actorId !== currentRoom.actorIds[0]
                                    ? `linear-gradient(135deg, ${actor?.color}90 0%, ${actor?.color}60 100%)`
                                    : undefined
                                }}
                              >
                                <p className="text-sm text-white/95">{msg.content}</p>
                                
                                <div className={`absolute -bottom-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ${
                                  msg.actorId === currentRoom.actorIds[0] ? 'left-0' : 'right-0'
                                }`}>
                                  <button
                                    onClick={() => startEditMessage(msg)}
                                    className="p-1 rounded bg-black/30 text-white/60 hover:bg-black/50 hover:text-white"
                                    title="改写"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => toggleFavorite(currentRoom.id, msg.id)}
                                    className={`p-1 rounded bg-black/30 ${msg.isFavorite ? 'text-amber-400' : 'text-white/60'} hover:bg-black/50`}
                                    title="收藏"
                                  >
                                    <Star className={`w-3 h-3 ${msg.isFavorite ? 'fill-amber-400' : ''}`} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <Users className="w-12 h-12 text-violet-400/30 mb-4" />
                  <p className="text-violet-300/50">选择左侧聊天室或创建新的对话</p>
                </div>
              )}
            </div>

            {/* 统计侧边栏 */}
            {showStats && currentRoom && (
              <div className="w-56 border-l border-violet-500/20 p-4 bg-indigo-950/20">
                <h4 className="font-semibold text-white text-sm mb-4">发言统计</h4>
                <div className="space-y-3">
                  {speechStats.map((stat) => {
                    const actor = getActorById(stat.actorId);
                    return (
                      <div key={stat.actorId}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{actor?.avatar}</span>
                            <span className="text-xs text-violet-200/80">{actor?.name}</span>
                          </div>
                          <span className="text-xs text-violet-300/60">{stat.percentage}%</span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${stat.percentage}%`,
                              backgroundColor: actor?.color || '#8b5cf6',
                            }}
                          />
                        </div>
                        <p className="text-xs text-violet-300/50 mt-1">{stat.count} 条发言</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 底部控制栏 */}
          {currentRoom && (
            <div className="border-t border-violet-500/20 p-4">
              {showNarrationInput ? (
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={narrationText}
                    onChange={(e) => setNarrationText(e.target.value)}
                    placeholder="输入旁白内容..."
                    className="input-field flex-1 text-sm"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNarration()}
                  />
                  <button onClick={handleAddNarration} className="btn-gold text-sm">
                    添加
                  </button>
                  <button
                    onClick={() => setShowNarrationInput(false)}
                    className="btn-secondary text-sm"
                  >
                    取消
                  </button>
                </div>
              ) : null}

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowNarrationInput(!showNarrationInput)}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <AlignLeft className="w-4 h-4" />
                  旁白
                </button>

                <button
                  onClick={() => togglePlay(currentRoom.id)}
                  className="btn-primary flex items-center gap-2 px-8"
                >
                  {currentRoom.isPlaying ? (
                    <>
                      <Pause className="w-5 h-5" />
                      暂停
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      {currentRoom.messages.length > 0 ? '继续' : '开始'}
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    if (confirm('确定要清空所有对话吗？')) {
                      clearMessages(currentRoom.id);
                    }
                  }}
                  className="btn-secondary flex items-center gap-2 text-sm text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                  清空
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="text-xs text-violet-300/50">速度：</span>
                {['slow', 'normal', 'fast'].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => useSettingStore.getState().setChatSpeed(speed as any)}
                    className={`text-xs px-2 py-1 rounded-full transition-colors ${
                      settings.chatSpeed === speed
                        ? 'bg-violet-500/30 text-white'
                        : 'text-violet-300/50 hover:text-violet-300'
                    }`}
                  >
                    {speed === 'slow' ? '慢' : speed === 'normal' ? '正常' : '快'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 创建房间弹窗 */}
      {showCreateRoom && (
        <div className="modal-overlay" onClick={() => setShowCreateRoom(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">创建聊天室</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-violet-200/80 mb-2">房间名称</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="给聊天室起个名字"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm text-violet-200/80 mb-2">聊天模式</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setChatMode('group')}
                    className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                      chatMode === 'group'
                        ? 'bg-violet-500/30 text-white border border-violet-400/50'
                        : 'bg-white/5 text-violet-200/70 border border-transparent'
                    }`}
                  >
                    群聊
                  </button>
                  <button
                    onClick={() => setChatMode('one-on-one')}
                    className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                      chatMode === 'one-on-one'
                        ? 'bg-violet-500/30 text-white border border-violet-400/50'
                        : 'bg-white/5 text-violet-200/70 border border-transparent'
                    }`}
                  >
                    一对一
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-violet-200/80 mb-2">
                  选择角色 {chatMode === 'group' ? `(已选 ${selectedActors.length} 个)` : ''}
                </label>
                <div className="max-h-60 overflow-y-auto grid grid-cols-2 gap-2">
                  {actors.map((actor) => (
                    <button
                      key={actor.id}
                      onClick={() => toggleActorSelection(actor.id)}
                      className={`p-3 rounded-lg text-left transition-all ${
                        selectedActors.includes(actor.id)
                          ? 'bg-violet-500/20 border border-violet-400/50'
                          : 'bg-white/5 border border-transparent hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{actor.avatar}</span>
                        <div>
                          <p className="text-sm font-medium text-white">{actor.name}</p>
                          <p className="text-xs text-violet-300/50">{actor.tone}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateRoom(false)}
                className="btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={!newRoomName.trim() || selectedActors.length === 0}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
