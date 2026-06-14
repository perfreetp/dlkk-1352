import { useState, useEffect } from 'react';
import { Layers, Plus, Download, Trash2, Users, Sparkles, Network } from 'lucide-react';
import { useTemplateStore } from '@/store/useTemplateStore';
import { useActorStore } from '@/store/useActorStore';
import { useRelationStore } from '@/store/useRelationStore';
import { generateId } from '@/utils/storage';
import type { Template, AIActor, Relation } from '@/types';

export default function MyAI() {
  const { templates, init: initTemplates, addTemplate, deleteTemplate } = useTemplateStore();
  const { actors, init: initActors, addActorFromTemplate } = useActorStore();
  const { relations, init: initRelations } = useRelationStore();
  const [activeTab, setActiveTab] = useState<'actors' | 'templates'>('templates');
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [selectedActorIds, setSelectedActorIds] = useState<string[]>([]);

  useEffect(() => {
    initActors();
    initTemplates();
    initRelations();
  }, [initActors, initTemplates, initRelations]);

  const toggleActorSelect = (id: string) => {
    setSelectedActorIds(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleCreateTemplate = () => {
    if (!templateName.trim() || selectedActorIds.length === 0) return;
    
    const selectedActors = actors.filter(a => selectedActorIds.includes(a.id));
    const selectedRelations = relations.filter(
      r => selectedActorIds.includes(r.actorId1) && selectedActorIds.includes(r.actorId2)
    );
    
    addTemplate(templateName.trim(), templateDesc.trim(), selectedActors, selectedRelations);
    setShowCreateTemplate(false);
    setTemplateName('');
    setTemplateDesc('');
    setSelectedActorIds([]);
  };

  const applyTemplate = (template: Template) => {
    const actorCount = template.actors.length;
    const relCount = template.relations.length;
    let msg = `确定要应用模板「${template.name}」吗？\n将添加 ${actorCount} 个角色`;
    if (relCount > 0) {
      msg += ` 和 ${relCount} 条角色关系`;
    }
    msg += '。\n（已存在的同名角色会被自动复用）';
    if (confirm(msg)) {
      const idMap = new Map<string, string>();
      
      template.actors.forEach(actor => {
        const newActor = addActorFromTemplate(actor);
        if (newActor) {
          idMap.set(actor.id, newActor.id);
        }
      });
      
      // 应用关系
      let relApplied = 0;
      template.relations.forEach(rel => {
        const newId1 = idMap.get(rel.actorId1);
        const newId2 = idMap.get(rel.actorId2);
        if (newId1 && newId2) {
          const newRel: Relation = {
            id: generateId(),
            actorId1: newId1,
            actorId2: newId2,
            intimacy: rel.intimacy,
            stance: rel.stance,
            description: rel.description,
          };
          // 调用 addRelationDirect 避免重复检查
          const relStore = useRelationStore.getState();
          const existing = relStore.getRelation(newId1, newId2);
          if (!existing) {
            // @ts-ignore
            if (relStore.addRelationDirect) {
              // @ts-ignore
              relStore.addRelationDirect(newRel);
            } else {
              relStore.addRelation(newId1, newId2, rel.intimacy, rel.stance, rel.description);
            }
            relApplied++;
          }
        }
      });
      
      alert(`✅ 模板应用成功！\n角色：${actorCount} 个\n关系：${relApplied} 条已恢复\n\n现在可以去关系网页面查看亲密度和立场了。`);
    }
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这个模板吗？')) {
      deleteTemplate(id);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white font-serif mb-2">
            我的 AI
          </h1>
          <p className="text-violet-300/60 text-sm">
            管理你的 AI 角色和模板，快速复用角色组合
          </p>
        </div>
      </div>

      {/* 标签切换 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('actors')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'actors'
              ? 'bg-violet-500/20 text-white border border-violet-500/30'
              : 'text-violet-300/60 hover:text-violet-200 hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          我的角色
          <span className="ml-2 text-xs opacity-60">({actors.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'templates'
              ? 'bg-violet-500/20 text-white border border-violet-500/30'
              : 'text-violet-300/60 hover:text-violet-200 hover:bg-white/5'
          }`}
        >
          <Layers className="w-4 h-4 inline mr-2" />
          模板库
          <span className="ml-2 text-xs opacity-60">({templates.length})</span>
        </button>
      </div>

      {/* 角色列表 */}
      {activeTab === 'actors' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {actors.map((actor, index) => (
              <div
                key={actor.id}
                className="glass-card glass-card-hover rounded-xl p-4 transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: `${actor.color}20`, border: `1px solid ${actor.color}40` }}
                  >
                    {actor.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{actor.name}</h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full inline-block"
                      style={{ background: `${actor.color}20`, color: actor.color }}
                    >
                      {actor.tone}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {actor.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="tag text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {actors.length === 0 && (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-violet-400/30 mx-auto mb-4" />
              <p className="text-violet-300/50">还没有角色，去角色广场创建吧！</p>
            </div>
          )}
        </div>
      )}

      {/* 模板列表 */}
      {activeTab === 'templates' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowCreateTemplate(true)}
              className="btn-gold flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              创建模板
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template, index) => (
              <div
                key={template.id}
                className="glass-card glass-card-hover rounded-xl p-5 transition-all duration-300 cursor-pointer animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => applyTemplate(template)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <Layers className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{template.name}</h3>
                      <p className="text-xs text-violet-300/50">
                        {template.actors.length} 个角色 · {template.relations.length} 条关系
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteTemplate(template.id, e)}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-sm text-violet-200/70 mb-4 line-clamp-2">
                  {template.description || '暂无描述'}
                </p>

                <div className="flex -space-x-2">
                  {template.actors.slice(0, 5).map((actor) => (
                    <div
                      key={actor.id}
                      className="w-8 h-8 rounded-full border-2 border-indigo-950 flex items-center justify-center text-sm"
                      style={{ background: `${actor.color}30` }}
                      title={actor.name}
                    >
                      {actor.avatar}
                    </div>
                  ))}
                  {template.actors.length > 5 && (
                    <div className="w-8 h-8 rounded-full bg-violet-500/30 border-2 border-indigo-950 flex items-center justify-center text-xs text-violet-200">
                      +{template.actors.length - 5}
                    </div>
                  )}
                </div>

                <button
                  className="mt-4 w-full py-2 rounded-lg bg-violet-500/20 text-violet-200 text-sm font-medium hover:bg-violet-500/30 transition-colors"
                  onClick={(e) => { e.stopPropagation(); applyTemplate(template); }}
                >
                  <Download className="w-4 h-4 inline mr-1" />
                  应用模板
                </button>
              </div>
            ))}
          </div>

          {templates.length === 0 && (
            <div className="text-center py-16">
              <Sparkles className="w-12 h-12 text-violet-400/30 mx-auto mb-4" />
              <p className="text-violet-300/50">还没有模板，点击右上角创建第一个吧！</p>
            </div>
          )}
        </div>
      )}

      {/* 创建模板弹窗 */}
      {showCreateTemplate && (
        <div className="modal-overlay" onClick={() => setShowCreateTemplate(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">创建模板</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-violet-200/80 mb-2">模板名称</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="给模板起个名字"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm text-violet-200/80 mb-2">模板描述</label>
                <textarea
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  placeholder="简单描述这个模板的用途..."
                  rows={2}
                  className="input-field resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-violet-200/80 mb-2">
                  选择角色（已选 {selectedActorIds.length} 个）
                </label>
                <div className="max-h-60 overflow-y-auto grid grid-cols-2 gap-2">
                  {actors.map((actor) => (
                    <button
                      key={actor.id}
                      onClick={() => toggleActorSelect(actor.id)}
                      className={`p-3 rounded-lg text-left transition-all ${
                        selectedActorIds.includes(actor.id)
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
                onClick={() => setShowCreateTemplate(false)}
                className="btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={handleCreateTemplate}
                disabled={!templateName.trim() || selectedActorIds.length === 0}
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
