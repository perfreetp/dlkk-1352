import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, Download, Trash2, Clock, Users, BarChart3, FileText, Play, ArrowLeft, Pin, MessageSquare, Heart, AlertCircle, RotateCcw, UserX, GitBranch, MessageSquareQuote, FileEdit } from 'lucide-react';
import { useRecordStore } from '@/store/useRecordStore';
import { useActorStore } from '@/store/useActorStore';
import { useChatStore } from '@/store/useChatStore';
import { formatDate, formatTime } from '@/utils/storage';
import { exportChatAsText, exportChatAsMarkdown } from '@/utils/aiEngine';
import type { ChatRecord, AIActor, ActorSnapshot, PinnedMemory, ReviewNotes } from '@/types';

// 未知角色占位，避免空头像/空名字
const UNKNOWN_ACTOR: AIActor = {
  id: 'unknown',
  name: '未知角色',
  avatar: '❓',
  tone: 'neutral',
  memory: '',
  taboo: '',
  tags: [],
  color: '#64748b',
  createdAt: 0,
  updatedAt: 0,
};

export default function Playback() {
  const navigate = useNavigate();
  const { records, init: initRecords, toggleFavorite, deleteRecord, searchRecords, getFavoriteRecords, updateReviewNotes, getBranchesForRecord } = useRecordStore();
  const { actors, init: initActors } = useActorStore();
  const { restoreRoomFromRecord } = useChatStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [selectedRecord, setSelectedRecord] = useState<ChatRecord | null>(null);
  const [toast, setToast] = useState<string>('');
  const [reviewDraft, setReviewDraft] = useState<ReviewNotes>({ conflict: '', characterStates: '', nextSteps: '' });

  useEffect(() => {
    initActors();
    initRecords();
  }, [initActors, initRecords]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // 选中记录变化时，把记录里的复盘备注同步到草稿
  useEffect(() => {
    if (selectedRecord) {
      setReviewDraft({
        conflict: selectedRecord.reviewNotes?.conflict || '',
        characterStates: selectedRecord.reviewNotes?.characterStates || '',
        nextSteps: selectedRecord.reviewNotes?.nextSteps || '',
      });
    }
  }, [selectedRecord?.id]);

  const displayRecords = activeTab === 'favorites'
    ? getFavoriteRecords()
    : searchRecords(searchQuery);

  // 从 snapshot 还原一个可展示的 AIActor（找不到 snapshot 就回落到真实 actor，最后 UNKNOWN）
  const snapshotToActor = (snap?: ActorSnapshot): AIActor | null => {
    if (!snap) return null;
    return {
      id: snap.id,
      name: snap.name,
      avatar: snap.avatar,
      color: snap.color,
      tone: snap.tone,
      memory: '',
      taboo: '',
      tags: [],
      createdAt: 0,
      updatedAt: 0,
    };
  };

  // 查找角色：优先用 record.actorsSnapshot 里保存时的快照，再回落到实时 actors，最后 UNKNOWN
  const getActorForRecord = (record: ChatRecord, id?: string): AIActor => {
    if (!id) return UNKNOWN_ACTOR;
    const snap = record.actorsSnapshot?.[id];
    if (snap) return snapshotToActor(snap) || UNKNOWN_ACTOR;
    const live = actors.find(a => a.id === id);
    return live || UNKNOWN_ACTOR;
  };

  // 查找角色，找不到返回 UNKNOWN_ACTOR
  const getActorById = (id?: string): AIActor => {
    if (!id) return UNKNOWN_ACTOR;
    return actors.find(a => a.id === id) || UNKNOWN_ACTOR;
  };

  // 判断角色是否已删除（并且没有快照可用时，才认为是已删除）
  const isActorDeleted = (id: string) => !actors.some(a => a.id === id);

  // 关键记忆的 source 标签
  const memorySourceLabel = (mem: PinnedMemory) => 
    mem.source === 'message' 
      ? { text: '从消息提炼', icon: <MessageSquareQuote className="w-3 h-3" />, className: 'bg-rose-500/15 text-rose-200 border-rose-500/30' }
      : { text: '手动钉住', icon: <Pin className="w-3 h-3" />, className: 'bg-amber-500/15 text-amber-200 border-amber-500/30' };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExport = (record: ChatRecord, format: 'txt' | 'md') => {
    const recordActors = record.actorIds
      .map(id => getActorForRecord(record, id))
      .filter(Boolean) as any[];
    
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'txt') {
      content = exportChatAsText(record.messages, recordActors);
      filename = `${record.title}.txt`;
      mimeType = 'text/plain';
    } else {
      content = exportChatAsMarkdown(record.messages, recordActors, record.title);
      filename = `${record.title}.md`;
      mimeType = 'text/markdown';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 计算发言统计
  const getSpeechStats = (record: ChatRecord) => {
    const aiMessages = record.messages.filter(m => m.type === 'ai' && m.actorId);
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
    })).sort((a, b) => b.count - a.count);
  };

  const favoriteCount = (record: ChatRecord) =>
    record.messages.filter(m => m.isFavorite).length;

  // 继续创作：把记录恢复到聊天室并跳转
  const handleContinue = (record: ChatRecord) => {
    const roomId = restoreRoomFromRecord(record.id);
    if (roomId) {
      setToast(`✅ 已恢复到聊天室：${record.title}（续写分支）`);
      setTimeout(() => navigate('/chat'), 700);
    } else {
      setToast('❌ 恢复失败，请重试');
    }
  };

  // 保存复盘备注
  const handleSaveReview = () => {
    if (!selectedRecord) return;
    updateReviewNotes(selectedRecord.id, reviewDraft);
    setToast('✅ 复盘备注已保存');
    // 刷新 selectedRecord 到最新的
    setSelectedRecord(records.find(r => r.id === selectedRecord.id) || selectedRecord);
  };

  const modeLabel = (mode?: string) => {
    if (mode === 'one-on-one') return { text: '一对一', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    return { text: '群聊', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' };
  };

  return (
    <div className="animate-fade-in relative">
      {/* Toast 提示 */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 glass-card px-5 py-3 rounded-xl border border-violet-500/30 text-sm text-white shadow-2xl animate-fade-in">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white font-serif mb-2">
            回放库
          </h1>
          <p className="text-violet-300/60 text-sm">
            复盘历史对话，收藏精彩片段，一键恢复继续创作
          </p>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-400/50" />
          <input
            type="text"
            placeholder="搜索对话记录..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-12"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-violet-500/20 text-white border border-violet-500/30'
                : 'text-violet-300/60 hover:text-violet-200 hover:bg-white/5'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            全部
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'favorites'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-violet-300/60 hover:text-violet-200 hover:bg-white/5'
            }`}
          >
            <Star className="w-4 h-4 inline mr-2" />
            收藏
          </button>
        </div>
      </div>

      {/* 记录列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayRecords.map((record, index) => {
          const stats = getSpeechStats(record);
          const favs = favoriteCount(record);
          const modeStyle = modeLabel(record.mode);
          const deletedCount = record.actorIds.filter(id => isActorDeleted(id)).length;
          const hasSnapshot = !!record.actorsSnapshot && Object.keys(record.actorsSnapshot).length > 0;
          const branches = getBranchesForRecord(record.id);
          const parent = record.parentId ? records.find(r => r.id === record.parentId) : null;

          return (
            <div
              key={record.id}
              className="glass-card glass-card-hover rounded-xl p-5 transition-all duration-300 cursor-pointer animate-slide-up group relative"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => setSelectedRecord(record)}
            >
              {deletedCount > 0 && (
                <div className="absolute top-2 right-2 text-xs bg-slate-500/20 text-slate-300 px-2 py-0.5 rounded-full flex items-center gap-1 border border-slate-500/30">
                  <UserX className="w-3 h-3" />
                  {deletedCount} 位角色已删除
                </div>
              )}

              <div className="flex items-start justify-between mb-3 pr-8">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${modeStyle.color}`}>
                      {modeStyle.text}
                    </span>
                    {record.branchName && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-300 border-emerald-500/30 flex items-center gap-1">
                        <GitBranch className="w-3 h-3" />
                        {record.branchName}
                      </span>
                    )}
                    <h3 className="font-semibold text-white truncate">{record.title}</h3>
                  </div>
                  {parent && (
                    <p className="text-[11px] text-emerald-400/80 mb-1 flex items-center gap-1 truncate">
                      <RotateCcw className="w-3 h-3 flex-shrink-0" />
                      续写自：{parent.title}
                    </p>
                  )}
                  <p className="text-xs text-violet-300/50 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    保存于 {formatDate(record.savedAt || record.createdAt)}
                    {hasSnapshot && <span className="ml-1 text-sky-400/60">· 已保存快照</span>}
                  </p>
                </div>
              </div>

              <p className="text-sm text-violet-200/70 line-clamp-2 mb-2">
                {record.summary || '（暂无摘要）'}
              </p>

              {record.reviewSummary && (
                <div className="mb-3 p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                  <p className="text-[11px] text-violet-300/70 flex items-center gap-1 mb-0.5">
                    <FileEdit className="w-3 h-3" />
                    复盘备注
                  </p>
                  <p className="text-xs text-violet-200/80 line-clamp-2">{record.reviewSummary}</p>
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1 text-xs text-violet-300/50">
                  <Users className="w-3 h-3" />
                  {record.actorIds.length} 个角色
                </div>
                <div className="flex items-center gap-1 text-xs text-violet-300/50">
                  <MessageSquare className="w-3 h-3" />
                  {record.messages.length} 条
                </div>
                <div className="flex items-center gap-1 text-xs text-violet-300/50">
                  <Play className="w-3 h-3" />
                  {formatDuration(record.duration)}
                </div>
                {favs > 0 && (
                  <div className="flex items-center gap-1 text-xs text-amber-400">
                    <Heart className="w-3 h-3 fill-amber-400" />
                    {favs}
                  </div>
                )}
                {branches.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-emerald-400">
                    <GitBranch className="w-3 h-3" />
                    {branches.length} 个续写
                  </div>
                )}
              </div>

              {/* 角色头像行 - 优先用快照 */}
              <div className="flex -space-x-2 mb-3">
                {record.actorIds.slice(0, 5).map((id, idx) => {
                  const actor = getActorForRecord(record, id);
                  const deleted = isActorDeleted(id) && !record.actorsSnapshot?.[id];
                  return (
                    <div
                      key={`${id}-${idx}`}
                      className={`w-7 h-7 rounded-full border-2 border-indigo-950 flex items-center justify-center text-sm ${deleted ? 'opacity-50' : ''}`}
                      style={{ background: `${actor.color}30` }}
                      title={`${actor.name}${deleted ? '（已删除）' : ''}`}
                    >
                      {actor.avatar}
                    </div>
                  );
                })}
                {record.actorIds.length > 5 && (
                  <div className="w-7 h-7 rounded-full bg-violet-500/30 border-2 border-indigo-950 flex items-center justify-center text-xs text-violet-200">
                    +{record.actorIds.length - 5}
                  </div>
                )}
              </div>

              {/* 发言占比迷你条 */}
              {stats.length > 0 && (
                <div className="h-1.5 rounded-full bg-white/10 flex overflow-hidden">
                  {stats.map((stat) => {
                    const actor = getActorForRecord(record, stat.actorId);
                    return (
                      <div
                        key={stat.actorId}
                        style={{
                          width: `${stat.percentage}%`,
                          backgroundColor: actor.color,
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(record.id); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    record.isFavorite
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-white/5 text-violet-300/60 hover:bg-white/10'
                  }`}
                >
                  <Star className={`w-3 h-3 inline mr-1 ${record.isFavorite ? 'fill-amber-400' : ''}`} />
                  {record.isFavorite ? '已收藏' : '收藏'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleContinue(record); }}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors border border-emerald-500/30"
                >
                  <RotateCcw className="w-3 h-3 inline mr-1" />
                  继续创作
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('确定要删除这条记录吗？')) {
                      deleteRecord(record.id);
                    }
                  }}
                  className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {displayRecords.length === 0 && (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-violet-400/30 mx-auto mb-4" />
          <p className="text-violet-300/50">
            {activeTab === 'favorites' ? '还没有收藏的对话' : '还没有对话记录，去聊天室创作一段吧～'}
          </p>
        </div>
      )}

      {/* 详情弹窗 */}
      {selectedRecord && (
        <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div className="modal-content max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* 顶部栏 */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-violet-500/20 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="p-2 rounded-lg hover:bg-white/5 text-violet-300 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${modeLabel(selectedRecord.mode).color}`}>
                      {modeLabel(selectedRecord.mode).text}
                    </span>
                    {selectedRecord.branchName && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-300 border-emerald-500/30 flex items-center gap-1">
                        <GitBranch className="w-3 h-3" />
                        {selectedRecord.branchName}
                      </span>
                    )}
                    <h3 className="text-lg font-bold text-white">{selectedRecord.title}</h3>
                    {selectedRecord.isFavorite && (
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    )}
                  </div>
                  <p className="text-xs text-violet-300/50">
                    保存于 {formatDate(selectedRecord.savedAt || selectedRecord.createdAt)} · 对话时长 {formatDuration(selectedRecord.duration)}
                  </p>
                  {selectedRecord.parentId && (() => {
                    const parent = records.find(r => r.id === selectedRecord.parentId);
                    return parent ? (
                      <p className="text-[11px] text-emerald-400/90 mt-1 flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" />
                        续写自「{parent.title}」
                      </p>
                    ) : null;
                  })()}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleFavorite(selectedRecord.id)}
                  className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                    selectedRecord.isFavorite
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-white/5 text-violet-400 hover:bg-white/10'
                  }`}
                >
                  <Star className={`w-4 h-4 inline mr-1 ${selectedRecord.isFavorite ? 'fill-amber-400' : ''}`} />
                  {selectedRecord.isFavorite ? '已收藏' : '收藏对话'}
                </button>
                <button
                  onClick={() => handleContinue(selectedRecord)}
                  className="px-3 py-2 rounded-lg transition-colors text-sm bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30"
                >
                  <RotateCcw className="w-4 h-4 inline mr-1" />
                  继续创作
                </button>
                <button
                  onClick={() => handleExport(selectedRecord, 'md')}
                  className="px-3 py-2 rounded-lg bg-white/5 text-violet-400 hover:bg-white/10 transition-colors text-sm"
                >
                  <Download className="w-4 h-4 inline mr-1" />
                  导出
                </button>
              </div>
            </div>

            {/* 聚合信息区：参与角色卡片 + 收藏状态 + 发言占比摘要 */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 flex-shrink-0">
              {/* 参与角色卡片 */}
              <div className="md:col-span-6 glass-card p-4 rounded-xl border border-violet-500/20">
                <h4 className="text-sm font-medium text-violet-200/80 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-violet-400" />
                  参与角色（{selectedRecord.actorIds.length}）
                  {selectedRecord.actorsSnapshot && Object.keys(selectedRecord.actorsSnapshot).length > 0 && (
                    <span className="text-[10px] text-sky-400/70 ml-1">· 已保存快照</span>
                  )}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedRecord.actorIds.map((id, idx) => {
                    const actor = getActorForRecord(selectedRecord, id);
                    const hasSnapshot = !!selectedRecord.actorsSnapshot?.[id];
                    const deleted = isActorDeleted(id) && !hasSnapshot;
                    return (
                      <div
                        key={`${id}-${idx}`}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${deleted ? 'bg-slate-500/10 border-slate-500/30 opacity-70' : ''}`}
                        style={{ background: deleted ? undefined : `${actor.color}15`, borderColor: deleted ? undefined : `${actor.color}40` }}
                      >
                        <span className="text-base">{actor.avatar}</span>
                        <div>
                          <div className="text-sm font-medium text-white flex items-center gap-1">
                            {actor.name}
                            {deleted && <UserX className="w-3 h-3 text-slate-400" />}
                            {hasSnapshot && !deleted && <span className="text-[9px] text-sky-400/80 border border-sky-500/30 px-1 rounded">快照</span>}
                          </div>
                          {deleted ? (
                            <div className="text-[10px] text-slate-400">角色已删除</div>
                          ) : (
                            <div className="text-[10px] text-violet-300/60">{actor.tone}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 收藏状态 + 关键记忆摘要 */}
              <div className="md:col-span-3 glass-card p-4 rounded-xl border border-violet-500/20">
                <h4 className="text-sm font-medium text-violet-200/80 mb-3 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-amber-400" />
                  收藏摘要
                </h4>
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-violet-300/60">对话整体</span>
                    <span className={`text-sm font-medium ${selectedRecord.isFavorite ? 'text-amber-400' : 'text-violet-300/60'}`}>
                      {selectedRecord.isFavorite ? '⭐ 已收藏' : '未收藏'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-violet-300/60">收藏消息数</span>
                    <span className="text-sm font-medium text-amber-300">
                      {favoriteCount(selectedRecord)} 条
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-violet-300/60">关键记忆</span>
                    <span className="text-sm font-medium text-amber-300 flex items-center gap-1">
                      <Pin className="w-3 h-3" />
                      {(selectedRecord.pinnedMemories || []).length} 条
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-violet-300/60">消息总数</span>
                    <span className="text-sm font-medium text-white">{selectedRecord.messages.length} 条</span>
                  </div>
                </div>
              </div>

              {/* 发言占比摘要 */}
              <div className="md:col-span-3 glass-card p-4 rounded-xl border border-violet-500/20">
                <h4 className="text-sm font-medium text-violet-200/80 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-violet-400" />
                  发言占比
                </h4>
                <div className="space-y-2.5">
                  {getSpeechStats(selectedRecord).slice(0, 4).map((stat) => {
                    const actor = getActorForRecord(selectedRecord, stat.actorId);
                    const hasSnapshot = !!selectedRecord.actorsSnapshot?.[stat.actorId];
                    const deleted = isActorDeleted(stat.actorId) && !hasSnapshot;
                    return (
                      <div key={stat.actorId} className="flex items-center gap-2">
                        <span className={`text-sm w-16 truncate ${deleted ? 'opacity-60' : ''}`}>
                          {actor.avatar} {actor.name}
                        </span>
                        <div className="flex-1 progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${stat.percentage}%`,
                              backgroundColor: actor.color,
                            }}
                          />
                        </div>
                        <span className="text-xs text-violet-300/60 w-10 text-right">
                          {stat.percentage}%
                        </span>
                      </div>
                    );
                  })}
                  {getSpeechStats(selectedRecord).length === 0 && (
                    <p className="text-xs text-violet-300/50">暂无 AI 发言</p>
                  )}
                </div>
              </div>

              {/* 续写分支关系卡 */}
              {(() => {
                const branches = getBranchesForRecord(selectedRecord.id);
                const parent = selectedRecord.parentId ? records.find(r => r.id === selectedRecord.parentId) : null;
                if (branches.length === 0 && !parent) return null;
                return (
                  <div className="md:col-span-12 glass-card p-4 rounded-xl border border-emerald-500/20">
                    <h4 className="text-sm font-medium text-emerald-300/90 mb-3 flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-emerald-400" />
                      续写分支关系
                    </h4>
                    <div className="flex flex-wrap gap-4">
                      {parent && (
                        <div className="flex-1 min-w-[200px] p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                          <p className="text-[10px] text-emerald-400/80 mb-1">上游原记录</p>
                          <button
                            onClick={() => setSelectedRecord(parent)}
                            className="text-sm text-white font-medium hover:text-emerald-300 transition-colors text-left flex items-center gap-1"
                          >
                            <ArrowLeft className="w-3 h-3" />
                            {parent.title}
                          </button>
                        </div>
                      )}
                      {branches.length > 0 && (
                        <div className="flex-1 min-w-[200px] p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                          <p className="text-[10px] text-emerald-400/80 mb-2">已续写的分支（{branches.length}）</p>
                          <div className="space-y-1">
                            {branches.map(b => (
                              <button
                                key={b.id}
                                onClick={() => setSelectedRecord(b)}
                                className="block w-full text-left text-xs text-violet-200/90 hover:text-emerald-300 py-0.5 transition-colors truncate"
                              >
                                <GitBranch className="w-3 h-3 inline mr-1" />
                                {b.branchName || '续写'} · {b.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 关键记忆面板 - 带 source 标签 */}
            {(selectedRecord.pinnedMemories || []).length > 0 && (
              <div className="mb-4 flex-shrink-0">
                <h4 className="text-sm font-medium text-amber-300/90 mb-2 flex items-center gap-2">
                  <Pin className="w-4 h-4" />
                  关键记忆（{(selectedRecord.pinnedMemories || []).length}）
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(selectedRecord.pinnedMemories || []).map((mem) => {
                    const src = memorySourceLabel(mem);
                    return (
                      <div
                        key={mem.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-200/90 border border-amber-500/30 max-w-md"
                        title={mem.text}
                      >
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${src.className} flex items-center gap-1 flex-shrink-0`}>
                          {src.icon}
                          {src.text}
                        </span>
                        <span className="text-xs truncate">{mem.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 提示条（角色已删除但无快照时） */}
            {selectedRecord.actorIds.some(id => isActorDeleted(id) && !selectedRecord.actorsSnapshot?.[id]) && (
              <div className="mb-4 flex-shrink-0 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-slate-500/10 border border-slate-500/30">
                <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  部分角色已被删除且未保存快照，消息中会显示为「❓ 未知角色」。有快照的角色已还原到保存时的状态。
                </div>
              </div>
            )}

            {/* 对话内容（可滚动） */}
            <div className="flex-1 flex flex-col min-h-0 mb-4">
              <h4 className="text-sm font-medium text-violet-200/80 mb-2 flex-shrink-0 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-violet-400" />
                对话内容（{selectedRecord.messages.length}）
              </h4>
              <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-black/20 rounded-lg min-h-0">
                {selectedRecord.messages.length === 0 ? (
                  <p className="text-center text-violet-300/50 text-sm py-6">暂无对话内容</p>
                ) : (
                  selectedRecord.messages.map((msg) => {
                    const actor = msg.actorId ? getActorForRecord(selectedRecord, msg.actorId) : null;
                    const hasSnapshot = msg.actorId ? !!selectedRecord.actorsSnapshot?.[msg.actorId] : false;
                    const actorDeleted = msg.actorId ? (isActorDeleted(msg.actorId) && !hasSnapshot) : false;
                    
                    if (msg.type === 'narration') {
                      return (
                        <div key={msg.id} className="text-center">
                          <span className={`text-xs italic ${msg.isFavorite ? 'text-amber-300' : 'text-amber-400/80'}`}>
                            {msg.isFavorite && <Heart className="w-3 h-3 inline mr-1 fill-amber-400" />}
                            【旁白】{msg.content}
                          </span>
                        </div>
                      );
                    }
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-2 ${actorDeleted ? 'opacity-70' : ''}`}
                      >
                        <span className="text-base flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                              style={{ background: actor ? `${actor.color}30` : 'transparent' }}>
                          {actor?.avatar || '❓'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs mr-2" style={{ color: actor?.color || '#64748b' }}>
                            {actor?.name || '未知角色'}
                            {actorDeleted && <span className="text-slate-400 ml-1">（已删除）</span>}
                            {hasSnapshot && !actorDeleted && <span className="text-sky-400/70 ml-1 text-[10px]">·快照</span>}
                          </span>
                          <span className="text-xs text-violet-400/40">{formatTime(msg.timestamp)}</span>
                          {msg.isFavorite && (
                            <Heart className="w-3 h-3 inline ml-1.5 text-amber-400 fill-amber-400" />
                          )}
                          <p className="text-sm text-violet-100/90 mt-0.5">{msg.content}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 复盘备注编辑区 */}
            <div className="mb-4 flex-shrink-0 glass-card p-4 rounded-xl border border-violet-500/20">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-violet-200/80 flex items-center gap-2">
                  <FileEdit className="w-4 h-4 text-violet-400" />
                  复盘备注
                </h4>
                <button
                  onClick={handleSaveReview}
                  className="px-3 py-1 text-xs rounded-lg bg-violet-500/20 text-violet-200 hover:bg-violet-500/30 border border-violet-500/30 transition-colors"
                >
                  💾 保存备注
                </button>
              </div>
              {selectedRecord.reviewSummary && (
                <div className="mb-3 p-2.5 bg-violet-500/10 rounded-lg border border-violet-500/20">
                  <p className="text-[10px] text-violet-300/60 mb-0.5">已生成摘要（列表可见）</p>
                  <p className="text-xs text-violet-200/90">{selectedRecord.reviewSummary}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-violet-300/70 mb-1 block flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-rose-400/70" />
                    冲突点
                  </label>
                  <textarea
                    value={reviewDraft.conflict}
                    onChange={(e) => setReviewDraft(d => ({ ...d, conflict: e.target.value }))}
                    placeholder="记录这段对话的核心冲突、矛盾点..."
                    rows={3}
                    className="input-field text-xs w-full resize-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-violet-300/70 mb-1 block flex items-center gap-1">
                    <Users className="w-3 h-3 text-sky-400/70" />
                    角色状态
                  </label>
                  <textarea
                    value={reviewDraft.characterStates}
                    onChange={(e) => setReviewDraft(d => ({ ...d, characterStates: e.target.value }))}
                    placeholder="当前各方情绪、关系、立场..."
                    rows={3}
                    className="input-field text-xs w-full resize-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-violet-300/70 mb-1 block flex items-center gap-1">
                    <Play className="w-3 h-3 text-emerald-400/70" />
                    后续打算
                  </label>
                  <textarea
                    value={reviewDraft.nextSteps}
                    onChange={(e) => setReviewDraft(d => ({ ...d, nextSteps: e.target.value }))}
                    placeholder="接下来想怎么发展、埋下什么伏笔..."
                    rows={3}
                    className="input-field text-xs w-full resize-none"
                  />
                </div>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="flex justify-between pt-4 border-t border-violet-500/20 flex-shrink-0">
              <button
                onClick={() => setSelectedRecord(null)}
                className="btn-secondary"
              >
                关闭
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport(selectedRecord, 'md')}
                  className="btn-secondary"
                >
                  <Download className="w-4 h-4 inline mr-1" />
                  导出 Markdown
                </button>
                <button
                  onClick={() => handleContinue(selectedRecord)}
                  className="btn-primary bg-emerald-600 hover:bg-emerald-500"
                >
                  <RotateCcw className="w-4 h-4 inline mr-1" />
                  恢复到聊天室继续创作
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
