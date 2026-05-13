import { Link, Outlet, useNavigate } from 'react-router-dom';
import { FolderKanban, LayoutDashboard, LogOut, Search, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-shell min-h-screen md:flex">
      <aside className="flex w-full flex-col border-b border-white/10 bg-black/30 p-4 text-white backdrop-blur-xl md:min-h-screen md:w-72 md:border-b-0 md:border-r md:p-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-gray-950">
            <Sparkles size={18} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">TaskFlow</h1>
            <p className="text-xs text-white/50">Project command center</p>
          </div>
        </div>
        <nav className="flex flex-1 gap-2 md:block md:space-y-2">
          <Link to="/" className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white">
            <LayoutDashboard size={18} /> Dashboard
          </Link>
          <Link to="/projects" className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white">
            <FolderKanban size={18} /> Projects
          </Link>
        </nav>
        <div className="rounded-lg border border-white/10 bg-white/10 p-4">
          <p className="text-sm font-semibold">{user?.name}</p>
          <p className="mb-3 break-all text-xs text-white/50">{user?.email}</p>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex items-center gap-2 text-sm font-semibold text-rose-200 hover:text-white"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="border-b border-white/10 bg-white/10 px-4 py-4 backdrop-blur-xl md:px-8">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">Workspace</p>
              <h2 className="text-xl font-bold text-white">Plan, assign, ship.</h2>
            </div>
            <div className="flex max-w-md items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white/50">
              <Search size={16} />
              <span className="text-sm">Search projects, tasks, people</span>
            </div>
          </div>
        </div>
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
