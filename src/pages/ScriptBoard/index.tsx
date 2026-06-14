import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Sparkles, Play, FileText } from 'lucide-react';
import { useScriptStore } from '@/store/useScriptStore';
import { useActorStore } from '@/store/useActorStore';
import { generateOpeningByTheme } from '@/utils/aiEngine';
import type { Script } from '@/types';

const themeOptions = [
  '日常闲聊',
  '情感讨论',
  '工作讨论',
  '学术探讨',
  '创意 brainstorm',
  '角色扮演',
  '悬疑推理',
  '温馨治愈',
];

export default function ScriptBoard() {
  const { scripts, init: initScripts, addScript, updateScript, deleteScript, generateOpening } = useScriptStore();
  const { actors, init: initActors } = useActorStore();
  
  const [showCreate, setShowCreate] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('日常闲聊');
  const [opening, setOpening] = useState('');
  const [selectedActorIds, setSelectedActorIds] = useState<string[]>([]);

  useEffect(() => {
    initActors();
    initScripts();
  }, [initActors, initScripts]);

  const toggleActorSelect = (id: string) => {
    setSelectedActorIds(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleGenerateOpening = () => {
    if (selectedActorIds.length === 0) {
      alert('请先选择角色');
      return;
    }
    const selectedActors = selectedActorIds
      .map(id => actors.find(a => a.id === id))
      .filter(Boolean) as any[];
    const generated = generateOpeningByTheme(theme, selectedActors);
    setOpening(generated);
  };

  const handleSubmit = () => {
    if (!title.trim() || selectedActorIds.length === 0) return;
    
    if (editingScript) {
      updateScript(editingScript.id, {
        title: title.trim(),
        theme,
        opening: opening.trim(),
        actorIds: selectedActorIds,
      });
    } else {
      addScript(title.trim(), theme, opening.trim(), selectedActorIds);
    }
    
    setShowCreate(false);
    setEditingScript(null);
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setTheme('日常闲聊');
    setOpening('');
    setSelectedActorIds([]);
  };

  const openEdit = (script: Script) => {
    setEditingScript(script);
    setTitle(script.title);
    setTheme(script.theme);
    setOpening(script.opening);
    setSelectedActorIds(script.actorIds);
    setShowCreate(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个剧本吗？')) {
      deleteScript(id);
    }
  };

  const getActorById = (id: string) => actors.find(a => a.id === id);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white font-serif mb-2">
            剧本板
          </h1>
          <p className="text-violet-300/60 text-sm">
            按主题生成开场，管理你的对话剧本
          </p>
        </div>
        <button
          onClick={() => {
            setEditingScript(null);
            resetForm();
            setShowCreate(true);
          }}
          className="btn-gold flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          新建剧本
        </button>
      </div>

      {/* 剧本列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scripts.map((script, index) => {
          const scriptActors = script.actorIds
            .map(id => getActorById(id))
            .filter(Boolean);

          return (
            <div
              key={script.id}
              className="glass-card glass-card-hover rounded-xl p-5 transition-all duration-300 animate-slide-up group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{script.title}</h3>
                    <span className="tag tag-gold text-xs">{script.theme}</span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(script)}
                    className="p-1.5 rounded-lg hover:bg-violet-500/20 text-violet-400 hover:text-violet-300"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(script.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-violet-200/70 mb-4 line-clamp-3 leading-relaxed">
                {script.opening}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  {scriptActors.slice(0, 4).map((actor) => (
                    <div
                      key={actor!.id}
                      className="w-7 h-7 rounded-full border-2 border-indigo-950 flex items-center justify-center text-sm"
                      style={{ background: `${actor!.color}30` }}
                      title={actor!.name}
                    >
                      {actor!.avatar}
                    </div>
                  ))}
                  {scriptActors.length > 4 && (
                    <div className="w-7 h-7 rounded-full bg-violet-500/30 border-2 border-indigo-950 flex items-center justify-center text-xs text-violet-200">
                      +{scriptActors.length - 4}
                    </div>
                  )}
                </div>
                <button
                  className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                  onClick={() => {
                    // Navigate to chat with this script
                    alert('跳转到聊天室开始对话...');
                  }}
                >
                  <Play className="w-3 h-3" />
                  开始
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {scripts.length === 0 && (
        <div className="text-center py-16">
          <Sparkles className="w-12 h-12 text-violet-400/30 mx-auto mb-4" />
          <p className="text-violet-300/50">还没有剧本，点击右上角创建第一个吧！</p>
        </div>
      )}

      {/* 创建/编辑剧本弹窗 */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content max-w-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">
              {editingScript ? '编辑剧本' : '新建剧本'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-violet-200/80 mb-2">剧本标题</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="给剧本起个名字"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm text-violet-200/80 mb-2">主题</label>
                <div className="flex flex-wrap gap-2">
                  {themeOptions.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                        theme === t
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-white/5 text-violet-200/70 border border-transparent hover:bg-white/10'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-violet-200/80 mb-2">
                  选择角色（{selectedActorIds.length} 个）
                </label>
                <div className="max-h-40 overflow-y-auto grid grid-cols-3 gap-2">
                  {actors.map((actor) => (
                    <button
                      key={actor.id}
                      onClick={() => toggleActorSelect(actor.id)}
                      className={`p-2 rounded-lg text-left transition-all ${
                        selectedActorIds.includes(actor.id)
                          ? 'bg-violet-500/20 border border-violet-400/50'
                          : 'bg-white/5 border border-transparent hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{actor.avatar}</span>
                        <span className="text-xs text-white truncate">{actor.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-violet-200/80">开场描述</label>
                  <button
                    onClick={handleGenerateOpening}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    AI 生成
                  </button>
                </div>
                <textarea
                  value={opening}
                  onChange={(e) => setOpening(e.target.value)}
                  placeholder="描述故事开场的场景..."
                  rows={4}
                  className="input-field resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!title.trim() || selectedActorIds.length === 0}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingScript ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
