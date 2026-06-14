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
  Bookmark,
  BookmarkX,
  Save,
  X,
  Pin,
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
    pinMemory,
    unpinMemory,
    pinMessageAsMemory,
    saveRoomToRecords,
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
  const [saveToast, setSaveToast] = useState(false);
  const [pinToast, setPinToast] = useState('');
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [newMemoryText, setNewMemoryText] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initActors();
    initChat();
  }, [initActors, initChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [getCurrentRoom()?.messages.length, getCurrentRoom()?.pinnedMemories?.length]);

  const currentRoom = getCurrentRoom();
  const speechStats = currentRoomId ? getSpeechStats(currentRoomId) : [];

  // 切换模式时重置选择
  useEffect(() => {
    setSelectedActors([]);
  }, [chatMode]);

  const toggleActorSelection = (actorId: string) => {
    if (chatMode === 'one-on-one') {
      setSelectedActors(prev => {
        if (prev.includes(actorId)) {
          return prev.filter(id => id !== actorId);
        }
        if (prev.length >= 2) {
          return [prev[1], actorId];
        }
        return [...prev, actorId];
      });
    } else {
      setSelectedActors(prev =>
        prev.includes(actorId)
          ? prev.filter(id => id !== actorId)
          : [...prev, actorId]
      );
    }
  };

  const handleCreateRoom = () => {
    if (!newRoomName.trim()) return;
    if (chatMode === 'one-on-one' && selectedActors.length !== 2) {
      alert('一对一聊天需要选择 2 个角色');
      return;
    }
    if (selectedActors.length === 0) {
      alert('请至少选择 1 个角色');
      return;
    }
    const roomId = createRoom(newRoomName.trim(), selectedActors, chatMode);
    setCurrentRoom(roomId);
    setShowCreateRoom(false);
    setNewRoomName('');
    setSelectedActors([]);
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

  const handlePinMessage = (msgId: string) => {
    if (!currentRoomId) return;
    pinMessageAsMemory(currentRoomId, msgId);
    setPinToast('已钉住为关键记忆');
    setTimeout(() => setPinToast(''), 1500);
  };

  const handleAddMemory = () => {
    if (!newMemoryText.trim() || !currentRoomId) return;
    pinMemory(currentRoomId, newMemoryText.trim());
    setNewMemoryText('');
    setShowAddMemory(false);
  };

  const handleSaveToRecords = () => {
    if (!currentRoomId) return;
    const res = saveRoomToRecords(currentRoomId);
    if (res) {
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
    }
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
    } else if (settings.exportFormat === 'md' || settings.exportFormat === 'markdown') {
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

  const getActorById = (id: string | undefined) => id ? actors.find(a => a.id === id) : undefined;

  return (
    <div className="animate-fade-in h-[calc(100vh-4rem)] -m-8 relative">
      {/* 保存成功提示 */}
      {saveToast && (
        <div className="absolute top-4 right-4 z-50 bg-emerald-500/90 text-white px-4 py-2 rounded-lg shadow-lg animate-slide-up text-sm">
          ✅ 已保存到回放库
        </div>
      )}
      {pinToast && (
        <div className="absolute top-4 right-4 z-50 bg-amber-500/90 text-white px-4 py-2 rounded-lg shadow-lg animate-slide-up text-sm">
          📌 {pinToast}
        </div>
      )}

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
                  className={`p-3 rounded-lg cursor-pointer transition-all group ${
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
                    {room.mode === 'group' ? '群聊' : '一对一'} · {room.actorIds.length} 角色 · {room.messages.length} 条
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`确定要删除聊天室「${room.name}」吗？`)) {
                        deleteRoom(room.id);
                      }
                    }}
                    className="mt-2 text-xs text-red-400/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    删除房间
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 主聊天区域 */}
        <div className="flex-1 flex flex-col min-w-0">
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
                    {currentRoom.mode === 'group' ? '群聊模式' : `一对一模式 · ${currentRoom.actorIds.length === 2 ? '双方就绪' : '角色不足'}`}
                    {(currentRoom.pinnedMemories?.length || 0) > 0 && ` · 📌 ${currentRoom.pinnedMemories.length}条关键记忆`}
                  </p>
                </div>
              ) : (
                <p className="text-violet-300/50">选择左侧聊天室或创建新的对话</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentRoom && (
                <>
                  <button
                    onClick={handleSaveToRecords}
                    className="p-2 rounded-lg hover:bg-white/5 text-emerald-400 hover:text-emerald-300 transition-colors"
                    title="保存到回放库"
                  >
                    <Save className="w-5 h-5" />
                  </button>
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
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* 固定记忆区域 */}
              {currentRoom && (currentRoom.pinnedMemories?.length || 0) + (showAddMemory ? 1 : 0) > 0 && (
                <div className="mx-6 mt-4 mb-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-medium">
                      <Pin className="w-3.5 h-3.5" />
                      关键记忆（{currentRoom.pinnedMemories?.length || 0}）
                    </div>
                    <button
                      onClick={() => setShowAddMemory(!showAddMemory)}
                      className="text-xs text-amber-400/70 hover:text-amber-400"
                    >
                      {showAddMemory ? '取消' : '+ 手动添加'}
                    </button>
                  </div>
                  
                  {showAddMemory && (
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newMemoryText}
                        onChange={(e) => setNewMemoryText(e.target.value)}
                        placeholder="输入需要固定的关键设定..."
                        className="input-field text-sm flex-1 py-1.5"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleAddMemory()}
                      />
                      <button onClick={handleAddMemory} className="btn-gold text-xs px-3">添加</button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {currentRoom.pinnedMemories?.map((mem, idx) => (
                      <div
                        key={idx}
                        className="group relative px-3 py-1.5 bg-amber-500/15 rounded-lg text-xs text-amber-200/90 border border-amber-500/20 flex items-center gap-2"
                      >
                        <span className="truncate max-w-sm">{mem}</span>
                        <button
                          onClick={() => unpinMemory(currentRoom.id, idx)}
                          className="opacity-0 group-hover:opacity-100 text-amber-400/60 hover:text-amber-400 transition-opacity"
                          title="取消钉住"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 消息列表 */}
              <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-4">
                {currentRoom ? (
                  currentRoom.messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <Sparkles className="w-12 h-12 text-violet-400/30 mb-4" />
                      <p className="text-violet-300/50 mb-4">对话即将开始...</p>
                      <button
                        onClick={() => startChat(currentRoom.id)}
                        className="btn-primary"
                        disabled={currentRoom.actorIds.length < 2}
                      >
                        开始对话
                      </button>
                      {currentRoom.actorIds.length < 2 && (
                        <p className="text-xs text-red-400/60 mt-2">至少需要 2 个角色才能开始对话</p>
                      )}
                      {/* 添加记忆按钮 */}
                      <button
                        onClick={() => setShowAddMemory(true)}
                        className="mt-4 text-xs text-amber-400/70 hover:text-amber-400 flex items-center gap-1"
                      >
                        <Pin className="w-3 h-3" />
                        先钉住一些关键设定
                      </button>
                    </div>
                  ) : (
                    <>
                      {currentRoom.messages.map((msg) => {
                        const actor = getActorById(msg.actorId);
                        
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
                                      title="改写"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handlePinMessage(msg.id)}
                                      className="p-1 rounded bg-black/30 text-amber-400 hover:bg-black/50"
                                      title="钉住为关键记忆"
                                    >
                                      <Pin className="w-3 h-3" />
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
                          );
                        }

                        // 判断是否靠右（第一个角色靠左，其他靠右）
                        const isLeft = msg.actorId === currentRoom.actorIds[0];
                        const hasValidActor = !!actor;

                        return (
                          <div
                            key={msg.id}
                            className={`flex items-start gap-3 group ${
                              isLeft ? 'flex-row' : 'flex-row-reverse'
                            }`}
                          >
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                              style={{ 
                                background: hasValidActor ? `${actor?.color}30` : '#ffffff10',
                                border: `1px solid ${hasValidActor ? `${actor?.color}50` : '#ffffff20'}`,
                              }}
                              title={actor?.name || '未知角色'}
                            >
                              {actor?.avatar || '❓'}
                            </div>

                            <div className={`max-w-[70%] ${
                              isLeft ? 'items-start' : 'items-end'
                            }`}>
                              <p className={`text-xs text-violet-300/60 mb-1 ${
                                isLeft ? 'text-left' : 'text-right'
                              }`}>
                                {actor?.name || '未知角色'} · {formatTime(msg.timestamp)}
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
                                  <div className={`flex gap-2 ${isLeft ? '' : 'justify-end'}`}>
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
                                    !isLeft ? 'chat-bubble-right ml-auto' : ''
                                  } ${!hasValidActor ? 'opacity-50' : ''}`}
                                  style={{
                                    background: !isLeft && hasValidActor
                                      ? `linear-gradient(135deg, ${actor?.color}90 0%, ${actor?.color}60 100%)`
                                      : undefined
                                  }}
                                >
                                  <p className="text-sm text-white/95">{msg.content}</p>
                                  
                                  <div className={`absolute -bottom-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ${
                                    isLeft ? 'left-0' : 'right-0'
                                  }`}>
                                    <button
                                      onClick={() => startEditMessage(msg)}
                                      className="p-1 rounded bg-black/30 text-white/60 hover:bg-black/50 hover:text-white"
                                      title="改写"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handlePinMessage(msg.id)}
                                      className="p-1 rounded bg-black/30 text-amber-400 hover:bg-black/50"
                                      title="钉住为关键记忆"
                                    >
                                      <Pin className="w-3 h-3" />
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
            </div>

            {/* 统计侧边栏 */}
            {showStats && currentRoom && (
              <div className="w-56 border-l border-violet-500/20 p-4 bg-indigo-950/20 overflow-y-auto">
                <h4 className="font-semibold text-white text-sm mb-4">发言统计</h4>
                <div className="space-y-3">
                  {speechStats.length === 0 && (
                    <p className="text-xs text-violet-300/40">暂无发言数据</p>
                  )}
                  {speechStats.map((stat) => {
                    const actor = getActorById(stat.actorId);
                    return (
                      <div key={stat.actorId}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{actor?.avatar || '❓'}</span>
                            <span className="text-xs text-violet-200/80 truncate max-w-[100px]">
                              {actor?.name || '未知'}
                            </span>
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

                <h4 className="font-semibold text-white text-sm mb-3 mt-6 pt-4 border-t border-white/10">当前角色</h4>
                <div className="space-y-2">
                  {currentRoom.actorIds.map(id => {
                    const a = getActorById(id);
                    return (
                      <div key={id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5">
                        <span>{a?.avatar || '❓'}</span>
                        <span className="text-xs text-violet-200/80 truncate">{a?.name || '未知角色'}</span>
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
                  onClick={() => {
                    if (currentRoom.actorIds.length < 2) {
                      alert('至少需要 2 个角色才能开始对话');
                      return;
                    }
                    togglePlay(currentRoom.id);
                  }}
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
                    if (confirm('确定要清空所有对话吗？固定记忆会保留。')) {
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
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
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
                    🎭 群聊
                    <p className="text-[10px] opacity-60 mt-0.5">3人及以上讨论</p>
                  </button>
                  <button
                    onClick={() => setChatMode('one-on-one')}
                    className={`flex-1 py-2 rounded-lg text-sm transition-all ${
                      chatMode === 'one-on-one'
                        ? 'bg-violet-500/30 text-white border border-violet-400/50'
                        : 'bg-white/5 text-violet-200/70 border border-transparent'
                    }`}
                  >
                    💬 一对一
                    <p className="text-[10px] opacity-60 mt-0.5">双方深度对话</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-violet-200/80 mb-2">
                  选择角色 
                  {chatMode === 'group' 
                    ? `（已选 ${selectedActors.length} 个，至少2个）` 
                    : `（${selectedActors.length}/2，需选2个）`
                  }
                </label>
                <div className="max-h-64 overflow-y-auto grid grid-cols-2 gap-2">
                  {actors.length === 0 && (
                    <div className="col-span-2 text-center py-6 text-violet-300/50 text-sm">
                      暂无角色，请先在角色广场创建
                    </div>
                  )}
                  {actors.map((actor) => {
                    const selected = selectedActors.includes(actor.id);
                    const disabled = chatMode === 'one-on-one' 
                      && selectedActors.length >= 2 
                      && !selected;
                    return (
                      <button
                        key={actor.id}
                        onClick={() => !disabled && toggleActorSelection(actor.id)}
                        className={`p-3 rounded-lg text-left transition-all relative ${
                          selected
                            ? 'bg-violet-500/20 border border-violet-400/50'
                            : disabled
                            ? 'bg-white/5 border border-transparent opacity-40 cursor-not-allowed'
                            : 'bg-white/5 border border-transparent hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{actor.avatar}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">{actor.name}</p>
                            <p className="text-xs text-violet-300/50 truncate">{actor.tone}</p>
                          </div>
                          {selected && (
                            <div className="w-5 h-5 rounded-full bg-violet-500 text-white text-xs flex items-center justify-center">
                              {selectedActors.indexOf(actor.id) + 1}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {chatMode === 'one-on-one' && selectedActors.length === 2 && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-sm text-emerald-300">✅ 双方已就绪，点击创建后即可开始对话</p>
                </div>
              )}
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
                disabled={
                  !newRoomName.trim() ||
                  selectedActors.length < 2 ||
                  (chatMode === 'one-on-one' && selectedActors.length !== 2)
                }
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                创建房间
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
