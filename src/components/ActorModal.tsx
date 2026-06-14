import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useActorStore } from '@/store/useActorStore';
import type { AIActor } from '@/types';

interface ActorModalProps {
  actor: AIActor | null;
  onClose: () => void;
}

const avatarOptions = ['🌧️', '🗿', '☀️', '🍂', '😂', '🎩', '🦊', '🐱', '🐶', '🌸', '⭐', '🌙', '🎭', '🎨', '📚', '🎵'];

const toneOptions = ['温和友善', '高冷傲娇', '活泼开朗', '深沉忧郁', '幽默风趣', '知性优雅', '严肃认真', '神秘莫测'];

const colorOptions = ['#60a5fa', '#6366f1', '#fbbf24', '#a78bfa', '#f87171', '#14b8a6', '#34d399', '#f472b6'];

export default function ActorModal({ actor, onClose }: ActorModalProps) {
  const { addActor, updateActor } = useActorStore();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🎭');
  const [tone, setTone] = useState('温和友善');
  const [memory, setMemory] = useState('');
  const [taboo, setTaboo] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [color, setColor] = useState('#6366f1');

  useEffect(() => {
    if (actor) {
      setName(actor.name);
      setAvatar(actor.avatar);
      setTone(actor.tone);
      setMemory(actor.memory);
      setTaboo(actor.taboo);
      setTagsInput(actor.tags.join('，'));
      setColor(actor.color);
    }
  }, [actor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tags = tagsInput.split(/[，,、\s]+/).filter(t => t.trim());
    const actorData = {
      name: name.trim(),
      avatar,
      tone,
      memory: memory.trim(),
      taboo: taboo.trim(),
      tags,
      color,
    };

    if (actor) {
      updateActor(actor.id, actorData);
    } else {
      addActor(actorData);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white font-serif">
            {actor ? '编辑角色' : '创建角色'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-violet-500/20 text-violet-400 hover:text-violet-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-violet-200/80 mb-2">头像</label>
            <div className="flex flex-wrap gap-2">
              {avatarOptions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                    avatar === emoji
                      ? 'bg-violet-500/30 ring-2 ring-violet-400'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-violet-200/80 mb-2">角色颜色</label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-indigo-950' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-violet-200/80 mb-2">姓名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入角色名称"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-violet-200/80 mb-2">语气风格</label>
            <div className="flex flex-wrap gap-2">
              {toneOptions.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    tone === t
                      ? 'bg-violet-500/30 text-white border border-violet-400/50'
                      : 'bg-white/5 text-violet-200/70 border border-transparent hover:bg-white/10'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-violet-200/80 mb-2">记忆设定</label>
            <textarea
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              placeholder="角色的背景故事、性格特点、重要记忆..."
              rows={3}
              className="input-field resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-violet-200/80 mb-2">禁忌设定</label>
            <textarea
              value={taboo}
              onChange={(e) => setTaboo(e.target.value)}
              placeholder="角色不想谈论的话题、反感的事情..."
              rows={2}
              className="input-field resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-violet-200/80 mb-2">标签（用逗号或空格分隔）</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="例如：温柔，文艺，治愈"
              className="input-field"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
            >
              {actor ? '保存修改' : '创建角色'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
