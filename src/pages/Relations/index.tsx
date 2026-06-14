import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit2, Trash2, Info } from 'lucide-react';
import { useActorStore } from '@/store/useActorStore';
import { useRelationStore } from '@/store/useRelationStore';
import type { StanceType, Relation } from '@/types';

const stanceColors: Record<StanceType, string> = {
  friendly: '#4ade80',
  neutral: '#94a3b8',
  hostile: '#f87171',
  complex: '#a78bfa',
};

const stanceLabels: Record<StanceType, string> = {
  friendly: '友好',
  neutral: '中立',
  hostile: '敌对',
  complex: '复杂',
};

export default function Relations() {
  const { actors, init: initActors } = useActorStore();
  const { relations, init: initRelations, addRelation, updateRelation, deleteRelation, getRelation } = useRelationStore();
  const [selectedActor, setSelectedActor] = useState<string | null>(null);
  const [showAddRelation, setShowAddRelation] = useState(false);
  const [editingRelation, setEditingRelation] = useState<Relation | null>(null);
  const [actor1, setActor1] = useState('');
  const [actor2, setActor2] = useState('');
  const [intimacy, setIntimacy] = useState(50);
  const [stance, setStance] = useState<StanceType>('neutral');
  const [description, setDescription] = useState('');
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNode, setDraggingNode] = useState<string | null>(null);

  useEffect(() => {
    initActors();
    initRelations();
  }, [initActors, initRelations]);

  useEffect(() => {
    if (!canvasRef.current || actors.length === 0) return;
    
    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;
    
    const positions: Record<string, { x: number; y: number }> = {};
    actors.forEach((actor, index) => {
      const angle = (index / actors.length) * Math.PI * 2 - Math.PI / 2;
      positions[actor.id] = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    });
    
    setNodePositions(positions);
  }, [actors.length]);

  const handleMouseDown = (e: React.MouseEvent, actorId: string) => {
    e.preventDefault();
    setDraggingNode(actorId);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingNode || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setNodePositions(prev => ({
      ...prev,
      [draggingNode]: { x, y },
    }));
  }, [draggingNode]);

  const handleMouseUp = useCallback(() => {
    setDraggingNode(null);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleAddRelation = () => {
    if (!actor1 || !actor2 || actor1 === actor2) return;
    
    if (editingRelation) {
      updateRelation(editingRelation.id, {
        actorId1: actor1,
        actorId2: actor2,
        intimacy,
        stance,
        description,
      });
    } else {
      addRelation(actor1, actor2, intimacy, stance, description);
    }
    
    setShowAddRelation(false);
    setEditingRelation(null);
    setActor1('');
    setActor2('');
    setIntimacy(50);
    setStance('neutral');
    setDescription('');
  };

  const openEditRelation = (relation: Relation) => {
    setEditingRelation(relation);
    setActor1(relation.actorId1);
    setActor2(relation.actorId2);
    setIntimacy(relation.intimacy);
    setStance(relation.stance);
    setDescription(relation.description);
    setShowAddRelation(true);
  };

  const getActorById = (id: string) => actors.find(a => a.id === id);

  const actorRelations = selectedActor 
    ? relations.filter(r => r.actorId1 === selectedActor || r.actorId2 === selectedActor)
    : relations;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white font-serif mb-2">
            关系网
          </h1>
          <p className="text-violet-300/60 text-sm">
            可视化展示角色之间的关系，可拖拽调整位置
          </p>
        </div>
        <button
          onClick={() => {
            setEditingRelation(null);
            setActor1('');
            setActor2('');
            setIntimacy(50);
            setStance('neutral');
            setDescription('');
            setShowAddRelation(true);
          }}
          className="btn-gold flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          添加关系
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 关系图谱 */}
        <div className="lg:col-span-2">
          <div
            ref={canvasRef}
            className="glass-card rounded-xl h-[500px] relative overflow-hidden cursor-grab active:cursor-grabbing"
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {relations.map((rel) => {
                const pos1 = nodePositions[rel.actorId1];
                const pos2 = nodePositions[rel.actorId2];
                if (!pos1 || !pos2) return null;
                
                const midX = (pos1.x + pos2.x) / 2;
                const midY = (pos1.y + pos2.y) / 2;
                
                return (
                  <g key={rel.id}>
                    <line
                      x1={pos1.x}
                      y1={pos1.y}
                      x2={pos2.x}
                      y2={pos2.y}
                      stroke={stanceColors[rel.stance]}
                      strokeWidth={2 + rel.intimacy / 25}
                      strokeDasharray={rel.stance === 'complex' ? '6 4' : 'none'}
                      opacity={0.6}
                    />
                    <text
                      x={midX}
                      y={midY - 5}
                      textAnchor="middle"
                      fill="white"
                      fontSize="10"
                      opacity={0.7}
                    >
                      {rel.intimacy}%
                    </text>
                  </g>
                );
              })}
            </svg>

            {actors.map((actor) => {
              const pos = nodePositions[actor.id];
              if (!pos) return null;
              
              return (
                <div
                  key={actor.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ left: pos.x, top: pos.y }}
                  onMouseDown={(e) => handleMouseDown(e, actor.id)}
                  onClick={() => setSelectedActor(actor.id === selectedActor ? null : actor.id)}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all ${
                      selectedActor === actor.id ? 'ring-2 ring-amber-400 scale-110' : 'hover:scale-105'
                    }`}
                    style={{
                      background: `${actor.color}30`,
                      border: `2px solid ${actor.color}60`,
                      boxShadow: `0 0 20px ${actor.color}30`,
                    }}
                  >
                    {actor.avatar}
                  </div>
                  <p className="text-xs text-center text-white/80 mt-1 font-medium">
                    {actor.name}
                  </p>
                </div>
              );
            })}
          </div>

          {/* 图例 */}
          <div className="flex gap-4 mt-4 justify-center">
            {Object.entries(stanceLabels).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: stanceColors[key as StanceType] }}
                />
                <span className="text-xs text-violet-300/60">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 关系列表 */}
        <div className="glass-card rounded-xl p-4 max-h-[500px] overflow-y-auto">
          <h3 className="font-semibold text-white mb-4">
            {selectedActor
              ? `${getActorById(selectedActor)?.name} 的关系`
              : '所有关系'}
          </h3>

          <div className="space-y-3">
            {actorRelations.map((rel) => {
              const a1 = getActorById(rel.actorId1);
              const a2 = getActorById(rel.actorId2);
              
              return (
                <div
                  key={rel.id}
                  className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{a1?.avatar}</span>
                      <span className="text-violet-300/50 text-sm">↔</span>
                      <span className="text-lg">{a2?.avatar}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditRelation(rel)}
                        className="p-1 rounded hover:bg-violet-500/20 text-violet-400"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('确定要删除这条关系吗？')) {
                            deleteRelation(rel.id);
                          }
                        }}
                        className="p-1 rounded hover:bg-red-500/20 text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${stanceColors[rel.stance]}20`,
                        color: stanceColors[rel.stance],
                      }}
                    >
                      {stanceLabels[rel.stance]}
                    </span>
                    <span className="text-xs text-violet-300/60">
                      亲密度 {rel.intimacy}%
                    </span>
                  </div>
                  
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${rel.intimacy}%`,
                        backgroundColor: stanceColors[rel.stance],
                      }}
                    />
                  </div>
                  
                  {rel.description && (
                    <p className="text-xs text-violet-300/50 mt-2 line-clamp-2">
                      {rel.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {actorRelations.length === 0 && (
            <div className="text-center py-8">
              <Info className="w-8 h-8 text-violet-400/30 mx-auto mb-2" />
              <p className="text-sm text-violet-300/50">暂无关系数据</p>
            </div>
          )}
        </div>
      </div>

      {/* 添加/编辑关系弹窗 */}
      {showAddRelation && (
        <div className="modal-overlay" onClick={() => setShowAddRelation(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">
              {editingRelation ? '编辑关系' : '添加关系'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-violet-200/80 mb-2">角色 1</label>
                  <select
                    value={actor1}
                    onChange={(e) => setActor1(e.target.value)}
                    className="input-field"
                  >
                    <option value="">选择角色</option>
                    {actors.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-violet-200/80 mb-2">角色 2</label>
                  <select
                    value={actor2}
                    onChange={(e) => setActor2(e.target.value)}
                    className="input-field"
                  >
                    <option value="">选择角色</option>
                    {actors.filter(a => a.id !== actor1).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-violet-200/80 mb-2">
                  立场
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(stanceLabels) as StanceType[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStance(s)}
                      className={`py-2 px-2 rounded-lg text-xs transition-all ${
                        stance === s
                          ? 'ring-2 ring-white/50'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: `${stanceColors[s]}20`,
                        color: stanceColors[s],
                      }}
                    >
                      {stanceLabels[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-violet-200/80 mb-2">
                  亲密度: {intimacy}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={intimacy}
                  onChange={(e) => setIntimacy(Number(e.target.value))}
                  className="w-full accent-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm text-violet-200/80 mb-2">关系描述</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="描述一下他们之间的关系..."
                  rows={2}
                  className="input-field resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddRelation(false)}
                className="btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={handleAddRelation}
                disabled={!actor1 || !actor2 || actor1 === actor2}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingRelation ? '保存' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
