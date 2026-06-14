import { Edit2, Trash2, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AIActor } from '@/types';

interface ActorCardProps {
  actor: AIActor;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ActorCard({ actor, onEdit, onDelete }: ActorCardProps) {
  const navigate = useNavigate();

  const handleChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/chat');
  };

  return (
    <div className="glass-card glass-card-hover rounded-xl p-4 transition-all duration-300 cursor-pointer group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ background: `${actor.color}20`, border: `1px solid ${actor.color}40` }}
          >
            {actor.avatar}
          </div>
          <div>
            <h3 className="font-semibold text-white">{actor.name}</h3>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: `${actor.color}20`, color: actor.color }}
            >
              {actor.tone}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleChat}
            className="p-1.5 rounded-lg hover:bg-violet-500/20 text-violet-400 hover:text-violet-300 transition-colors"
            title="加入聊天"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 rounded-lg hover:bg-violet-500/20 text-violet-400 hover:text-violet-300 transition-colors"
            title="编辑"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div>
          <p className="text-xs text-violet-300/50 mb-1">记忆</p>
          <p className="text-sm text-violet-200/70 line-clamp-2">{actor.memory || '暂无记忆设定'}</p>
        </div>
        <div>
          <p className="text-xs text-violet-300/50 mb-1">禁忌</p>
          <p className="text-sm text-red-300/70 line-clamp-1">{actor.taboo || '暂无禁忌设定'}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {actor.tags.map((tag) => (
          <span key={tag} className="tag text-xs">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
