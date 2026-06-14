import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Sparkles } from 'lucide-react';
import { useActorStore } from '@/store/useActorStore';
import ActorCard from '@/components/ActorCard';
import ActorModal from '@/components/ActorModal';
import type { AIActor } from '@/types';

export default function Square() {
  const { actors, init, searchActors, deleteActor } = useActorStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActor, setEditingActor] = useState<AIActor | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  const filteredActors = searchActors(searchQuery);

  const handleEdit = (actor: AIActor) => {
    setEditingActor(actor);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个角色吗？')) {
      deleteActor(id);
    }
  };

  const handleCreate = () => {
    setEditingActor(null);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingActor(null);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white font-serif mb-2">
            角色广场
          </h1>
          <p className="text-violet-300/60 text-sm">
            浏览和管理所有 AI 角色，创建属于你的角色世界
          </p>
        </div>
        <button onClick={handleCreate} className="btn-gold flex items-center gap-2">
          <Plus className="w-4 h-4" />
          创建角色
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-400/50" />
          <input
            type="text"
            placeholder="搜索角色名称、标签或语气..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-12"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredActors.map((actor, index) => (
          <div
            key={actor.id}
            className="animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <ActorCard
              actor={actor}
              onEdit={() => handleEdit(actor)}
              onDelete={() => handleDelete(actor.id)}
            />
          </div>
        ))}
      </div>

      {filteredActors.length === 0 && (
        <div className="text-center py-16">
          <Sparkles className="w-12 h-12 text-violet-400/30 mx-auto mb-4" />
          <p className="text-violet-300/50">
            {searchQuery ? '没有找到匹配的角色' : '还没有角色，点击右上角创建第一个吧！'}
          </p>
        </div>
      )}

      {isModalOpen && (
        <ActorModal
          actor={editingActor}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
