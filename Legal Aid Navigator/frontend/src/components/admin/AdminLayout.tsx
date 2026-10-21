import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Scale, FileText, Users, CalendarDays, Landmark, BarChart3, Settings, LogOut, UserCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const NAV = [
  { to: '/admin', label: 'Applications', icon: FileText, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/admin/authorities', label: 'Authorities', icon: Landmark },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-ivory-200 text-bark-600">
      <aside className="w-60 shrink-0 hidden md:flex flex-col bg-ivory-100 border-r border-khaki-100 px-4 py-5 sticky top-0 h-screen">
        <div className="flex items-center gap-3 px-2 mb-8">
          <Scale size={30} strokeWidth={1.6} className="text-olive-500" />
          <div>
            <p className="font-serif font-bold text-[0.95rem] text-olive-800 leading-tight">Legal Aid Navigator</p>
            <p className="text-xs text-bark-400">Admin Portal</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1" aria-label="Admin navigation">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-olive-500 text-white shadow-sm' : 'text-bark-500 hover:bg-ivory-300'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-khaki-100 pt-4">
          <div className="flex items-center gap-3 px-2 mb-3">
            <UserCircle size={34} className="text-khaki-400" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-olive-800 truncate">{user?.full_name || user?.username}</p>
              <p className="text-xs text-bark-400">Administrator</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm text-bark-500 hover:bg-ivory-300"
          >
            <LogOut size={17} /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        {/* Compact top bar for small screens */}
        <div className="md:hidden flex items-center justify-between bg-ivory-100 border-b border-khaki-100 px-4 py-3">
          <span className="font-serif font-bold text-olive-800">Admin Portal</span>
          <button onClick={handleLogout} className="text-sm text-bark-500 flex items-center gap-1">
            <LogOut size={15} /> Logout
          </button>
        </div>
        <div className="md:hidden flex gap-1 overflow-x-auto bg-ivory-100 border-b border-khaki-100 px-2 py-2">
          {NAV.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium ${
                  isActive ? 'bg-olive-500 text-white' : 'text-bark-500'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        <div className="max-w-6xl mx-auto px-5 md:px-8 py-7">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
