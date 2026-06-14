import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Palette, Zap, Download, Trash2, Info, Save } from 'lucide-react';
import { useSettingStore } from '@/store/useSettingStore';
import type { AppSettings } from '@/types';

export default function Settings() {
  const { settings, init: initSettings, updateSettings, resetSettings } = useSettingStore();
  const [localSettings, setLocalSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    initSettings();
  }, [initSettings]);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  if (!localSettings) {
    return <div className="animate-fade-in"><p className="text-violet-300/50">加载中...</p></div>;
  }

  const handleChange = (key: keyof AppSettings, value: any) => {
    setLocalSettings(prev => {
      if (!prev) return prev;
      return { ...prev, [key]: value };
    });
    setSaved(false);
  };

  const handleSave = () => {
    if (localSettings) {
      updateSettings(localSettings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleReset = () => {
    if (confirm('确定要恢复默认设置吗？')) {
      resetSettings();
    }
  };

  const handleClearAllData = () => {
    if (confirm('⚠️ 警告：这将删除所有本地数据（角色、关系、剧本、记录、模板），此操作不可恢复！')) {
      if (confirm('再次确认：确定要清空所有数据吗？')) {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('ai-chat-'));
        keys.forEach(k => localStorage.removeItem(k));
        location.reload();
      }
    }
  };

  const speedOptions = [
    { value: 'slow', label: '慢速', description: '间隔约 3 秒' },
    { value: 'normal', label: '正常', description: '间隔约 1.5 秒' },
    { value: 'fast', label: '快速', description: '间隔约 0.5 秒' },
  ];

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white font-serif mb-2">
            设置
          </h1>
          <p className="text-violet-300/60 text-sm">
            个性化你的使用体验
          </p>
        </div>
        <button
          onClick={handleSave}
          className={`btn-primary flex items-center gap-2 text-sm ${saved ? 'bg-green-500/20 text-green-400' : ''}`}
        >
          <Save className="w-4 h-4" />
          {saved ? '已保存' : '保存设置'}
        </button>
      </div>

      <div className="space-y-6">
        {/* 主题设置 */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">主题设置</h3>
              <p className="text-xs text-violet-300/50">选择你喜欢的配色主题</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleChange('theme', 'dark')}
              className={`p-4 rounded-xl transition-all ${
                localSettings.theme === 'dark'
                  ? 'ring-2 ring-amber-400 bg-white/10'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="h-10 rounded-lg bg-gradient-to-br from-indigo-900 to-violet-900 mb-2" />
              <p className="text-sm text-white font-medium">深邃紫</p>
              <p className="text-xs text-violet-300/50">默认主题</p>
            </button>

            <button
              onClick={() => handleChange('theme', 'ocean')}
              className={`p-4 rounded-xl transition-all ${
                localSettings.theme === 'ocean'
                  ? 'ring-2 ring-amber-400 bg-white/10'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="h-10 rounded-lg bg-gradient-to-br from-slate-800 to-cyan-800 mb-2" />
              <p className="text-sm text-white font-medium">海洋蓝</p>
              <p className="text-xs text-violet-300/50">清爽冷静</p>
            </button>

            <button
              onClick={() => handleChange('theme', 'sunset')}
              className={`p-4 rounded-xl transition-all ${
                localSettings.theme === 'sunset'
                  ? 'ring-2 ring-amber-400 bg-white/10'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="h-10 rounded-lg bg-gradient-to-br from-orange-900 to-rose-900 mb-2" />
              <p className="text-sm text-white font-medium">落日橙</p>
              <p className="text-xs text-violet-300/50">温暖热情</p>
            </button>
          </div>
        </div>

        {/* 聊天速度 */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">聊天速度</h3>
              <p className="text-xs text-violet-300/50">调节 AI 自动发言的速度</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {speedOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleChange('chatSpeed', opt.value)}
                className={`p-4 rounded-xl text-left transition-all ${
                  localSettings.chatSpeed === opt.value
                    ? 'ring-2 ring-amber-400 bg-white/10'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <p className="text-sm text-white font-medium">{opt.label}</p>
                <p className="text-xs text-violet-300/50">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 导出格式 */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">导出格式</h3>
              <p className="text-xs text-violet-300/50">选择对话稿的默认导出格式</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleChange('exportFormat', 'markdown')}
              className={`p-4 rounded-xl text-left transition-all ${
                localSettings.exportFormat === 'markdown'
                  ? 'ring-2 ring-amber-400 bg-white/10'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <p className="text-sm text-white font-medium">Markdown</p>
              <p className="text-xs text-violet-300/50">格式丰富，易于阅读</p>
            </button>

            <button
              onClick={() => handleChange('exportFormat', 'txt')}
              className={`p-4 rounded-xl text-left transition-all ${
                localSettings.exportFormat === 'txt'
                  ? 'ring-2 ring-amber-400 bg-white/10'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <p className="text-sm text-white font-medium">纯文本</p>
              <p className="text-xs text-violet-300/50">简洁通用，兼容性强</p>
            </button>
          </div>
        </div>

        {/* 显示设置 */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">显示设置</h3>
              <p className="text-xs text-violet-300/50">调整界面显示效果</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">显示时间戳</p>
                <p className="text-xs text-violet-300/50">在每条消息旁显示时间</p>
              </div>
              <button
                onClick={() => handleChange('showTimestamp', !localSettings.showTimestamp)}
                className={`w-12 h-7 rounded-full transition-all relative ${
                  localSettings.showTimestamp ? 'bg-amber-500' : 'bg-white/20'
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                    localSettings.showTimestamp ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="border-t border-white/10 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">动画效果</p>
                  <p className="text-xs text-violet-300/50">启用页面过渡动画</p>
                </div>
                <button
                  onClick={() => handleChange('animationsEnabled', !localSettings.animationsEnabled)}
                  className={`w-12 h-7 rounded-full transition-all relative ${
                    localSettings.animationsEnabled ? 'bg-amber-500' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                      localSettings.animationsEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 数据管理 */}
        <div className="glass-card rounded-xl p-6 border border-red-500/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">数据管理</h3>
              <p className="text-xs text-violet-300/50">管理你的本地数据</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleReset}
              className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 text-left transition-all"
            >
              <p className="text-sm text-white">恢复默认设置</p>
              <p className="text-xs text-violet-300/50">仅重置设置项，不影响角色和记录</p>
            </button>

            <button
              onClick={handleClearAllData}
              className="w-full p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-left transition-all border border-red-500/30"
            >
              <p className="text-sm text-red-400">清空所有数据</p>
              <p className="text-xs text-red-400/60">删除所有角色、关系、剧本和记录</p>
            </button>
          </div>
        </div>

        {/* 关于 */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Info className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">关于</h3>
              <p className="text-xs text-violet-300/50">AI 互聊工作室</p>
            </div>
          </div>

          <div className="text-sm text-violet-200/70 space-y-2">
            <p>版本：1.0.0</p>
            <p>
              一款面向写作者和社群运营者的 AI 角色对话模拟工具。
              所有数据均保存在本地浏览器中，无需联网即可使用。
            </p>
            <p className="text-xs text-violet-300/40 pt-2">
              © 2025 AI Chat Studio. 纯前端实现。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
