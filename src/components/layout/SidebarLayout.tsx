import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Users,
  Bot,
  MessageSquare,
  Network,
  FileText,
  History,
  Settings,
  Sparkles,
} from 'lucide-react';

const navItems = [
  { path: '/square', icon: Users, label: '角色广场' },
  { path: '/my-ai', icon: Bot, label: '我的 AI' },
  { path: '/chat', icon: MessageSquare, label: '聊天室' },
  { path: '/relations', icon: Network, label: '关系网' },
  { path: '/scripts', icon: FileText, label: '剧本板' },
  { path: '/playback', icon: History, label: '回放库' },
  { path: '/settings', icon: Settings, label: '设置' },
];

export default function SidebarLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 flex-shrink-0 border-r border-violet-500/20 bg-indigo-950/40 backdrop-blur-xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white font-serif">AI 互聊</h1>
              <p className="text-xs text-violet-300/60">创作灵感工具</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-violet-500/20">
          <div className="glass-card rounded-xl p-4">
            <p className="text-xs text-violet-300/60 mb-2">💡 小贴士</p>
            <p className="text-sm text-violet-200/80">
              创建多个角色，设定他们之间的关系，让对话更加生动有趣！
            </p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
