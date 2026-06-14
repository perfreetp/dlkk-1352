import { useState, useEffect } from 'react';
import { Search, Star, Download, Trash2, Clock, Users, BarChart3, FileText, Play } from 'lucide-react';
import { useRecordStore } from '@/store/useRecordStore';
import { useActorStore } from '@/store/useActorStore';
import { formatDate, formatTime } from '@/utils/storage';
import { exportChatAsText, exportChatAsMarkdown } from '@/utils/aiEngine';
import type { ChatRecord } from '@/types';

export default function Playback() {
  const { records, init: initRecords, toggleFavorite, deleteRecord, searchRecords, getFavoriteRecords } = useRecordStore();
  const { actors, init: initActors } = useActorStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [selectedRecord, setSelectedRecord] = useState<ChatRecord | null>(null);

  useEffect(() => {
    initActors();
    initRecords();
  }, [initActors, initRecords]);

  const displayRecords = activeTab === 'favorites'
    ? getFavoriteRecords()
    : searchRecords(searchQuery);

  const getActorById = (id: string) => actors.find(a => a.id === id);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExport = (record: ChatRecord, format: 'txt' | 'md') => {
    const recordActors = record.actorIds
      .map(id => getActorById(id))
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
    }));
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white font-serif mb-2">
            回放库
          </h1>
          <p className="text-violet-300/60 text-sm">
            查看历史对话记录，收藏精彩片段
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
          const recordActors = record.actorIds
            .map(id => getActorById(id))
            .filter(Boolean);
          const stats = getSpeechStats(record);

          return (
            <div
              key={record.id}
              className="glass-card glass-card-hover rounded-xl p-5 transition-all duration-300 cursor-pointer animate-slide-up group"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => setSelectedRecord(record)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white truncate">{record.title}</h3>
                    {record.isFavorite && (
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-violet-300/50 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(record.createdAt)}
                  </p>
                </div>
              </div>

              <p className="text-sm text-violet-200/70 line-clamp-2 mb-4">
                {record.summary}
              </p>

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1 text-xs text-violet-300/50">
                  <Users className="w-3 h-3" />
                  {record.actorIds.length} 个角色
                </div>
                <div className="flex items-center gap-1 text-xs text-violet-300/50">
                  <BarChart3 className="w-3 h-3" />
                  {record.messages.length} 条消息
                </div>
                <div className="flex items-center gap-1 text-xs text-violet-300/50">
                  <Play className="w-3 h-3" />
                  {formatDuration(record.duration)}
                </div>
              </div>

              <div className="flex -space-x-2 mb-3">
                {recordActors.slice(0, 5).map((actor) => (
                  <div
                    key={actor!.id}
                    className="w-7 h-7 rounded-full border-2 border-indigo-950 flex items-center justify-center text-sm"
                    style={{ background: `${actor!.color}30` }}
                    title={actor!.name}
                  >
                    {actor!.avatar}
                  </div>
                ))}
                {recordActors.length > 5 && (
                  <div className="w-7 h-7 rounded-full bg-violet-500/30 border-2 border-indigo-950 flex items-center justify-center text-xs text-violet-200">
                    +{recordActors.length - 5}
                  </div>
                )}
              </div>

              {/* 发言统计迷你条 */}
              {stats.length > 0 && (
                <div className="h-1.5 rounded-full bg-white/10 flex overflow-hidden">
                  {stats.map((stat) => {
                    const actor = getActorById(stat.actorId);
                    return (
                      <div
                        key={stat.actorId}
                        style={{
                          width: `${stat.percentage}%`,
                          backgroundColor: actor?.color || '#8b5cf6',
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
                  <Star className="w-3 h-3 inline mr-1" />
                  {record.isFavorite ? '已收藏' : '收藏'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleExport(record, 'md'); }}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-violet-300/60 hover:bg-white/10 transition-colors"
                >
                  <Download className="w-3 h-3 inline mr-1" />
                  导出
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
            {activeTab === 'favorites' ? '还没有收藏的对话' : '还没有对话记录'}
          </p>
        </div>
      )}

      {/* 详情弹窗 */}
      {selectedRecord && (
        <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div className="modal-content max-w-2xl max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedRecord.title}</h3>
                <p className="text-xs text-violet-300/50 mt-1">
                  {formatDate(selectedRecord.createdAt)} · {formatDuration(selectedRecord.duration)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleFavorite(selectedRecord.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    selectedRecord.isFavorite
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-white/5 text-violet-400 hover:bg-white/10'
                  }`}
                >
                  <Star className={`w-5 h-5 ${selectedRecord.isFavorite ? 'fill-amber-400' : ''}`} />
                </button>
                <button
                  onClick={() => handleExport(selectedRecord, 'md')}
                  className="p-2 rounded-lg bg-white/5 text-violet-400 hover:bg-white/10 transition-colors"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-medium text-violet-200/80 mb-2">发言统计</h4>
              <div className="space-y-2">
                {getSpeechStats(selectedRecord).map((stat) => {
                  const actor = getActorById(stat.actorId);
                  return (
                    <div key={stat.actorId} className="flex items-center gap-3">
                      <span className="text-sm w-20 truncate">{actor?.name}</span>
                      <div className="flex-1 progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${stat.percentage}%`,
                            backgroundColor: actor?.color || '#8b5cf6',
                          }}
                        />
                      </div>
                      <span className="text-xs text-violet-300/60 w-12 text-right">
                        {stat.percentage}% · {stat.count}条
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-violet-200/80 mb-2">对话内容</h4>
              <div className="max-h-64 overflow-y-auto space-y-3 p-3 bg-black/20 rounded-lg">
                {selectedRecord.messages.length === 0 ? (
                  <p className="text-center text-violet-300/50 text-sm py-4">暂无对话内容</p>
                ) : (
                  selectedRecord.messages.map((msg) => {
                    const actor = msg.actorId ? getActorById(msg.actorId) : null;
                    
                    if (msg.type === 'narration') {
                      return (
                        <div key={msg.id} className="text-center">
                          <span className="text-xs text-amber-400/80 italic">
                            【旁白】{msg.content}
                          </span>
                        </div>
                      );
                    }
                    
                    return (
                      <div key={msg.id} className="flex items-start gap-2">
                        <span className="text-base flex-shrink-0">{actor?.avatar}</span>
                        <div className="min-w-0">
                          <span className="text-xs text-violet-300/60 mr-2">{actor?.name}</span>
                          <span className="text-xs text-violet-400/40">{formatTime(msg.timestamp)}</span>
                          <p className="text-sm text-violet-100/90 mt-0.5">{msg.content}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setSelectedRecord(null)}
                className="btn-secondary"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
