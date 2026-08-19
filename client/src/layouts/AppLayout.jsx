import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PenSquare,
  FileText,
  CalendarDays,
  Share2,
  Settings,
  LogOut,
  Menu,
  X,
  Layers,
  Globe,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Create Post', path: '/create', icon: PenSquare },
  { name: 'Posts', path: '/posts', icon: FileText },
  { name: 'Calendar', path: '/calendar', icon: CalendarDays },
  { name: 'Accounts', path: '/accounts', icon: Share2 },
  { name: 'Settings', path: '/settings', icon: Settings }
];

export const AppLayout = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebarBg = isDark
    ? 'bg-slate-900/95 border-slate-800/80'
    : 'bg-white border-slate-200';

  const navActive = isDark
    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm'
    : 'bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm';

  const navInactive = isDark
    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100';

  const userCardBg = isDark
    ? 'bg-slate-950/60 border-slate-800/60'
    : 'bg-slate-50 border-slate-200';

  const mainBg = isDark ? 'bg-slate-950' : 'bg-slate-50';
  const topbarBg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const logoText = isDark ? 'text-white' : 'text-slate-900';
  const userNameText = isDark ? 'text-white' : 'text-slate-800';
  const brandSubText = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`min-h-screen ${mainBg} text-slate-100 flex flex-col md:flex-row transition-colors duration-300`}>
      {/* Mobile Top Header */}
      <div className={`md:hidden flex items-center justify-between p-4 ${topbarBg} border-b`}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Layers className="w-5 h-5" />
          </div>
          <span className={`font-bold tracking-tight ${logoText}`}>OmniPost Studio</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl transition ${isDark ? 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-100'}`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2 rounded-lg ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:flex flex-col w-full md:w-64 ${sidebarBg} border-r p-5 shrink-0 backdrop-blur-xl z-20 transition-colors duration-300`}
      >
        {/* Desktop Brand Logo */}
        <div className="hidden md:flex items-center gap-3 px-2 py-3 mb-6">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className={`font-bold tracking-tight text-base ${logoText}`}>OmniPost Studio</h1>
            <p className={`text-[11px] ${brandSubText}`}>Social Media Hub</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive ? navActive : navInactive
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Theme Toggle + User Card */}
        <div className="pt-4 mt-6 border-t border-slate-800/80 space-y-3">
          {/* Dark/Light Toggle */}
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
              isDark
                ? 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20'
                : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200'
            }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <div className="flex items-center gap-2">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
            <div className={`relative w-10 h-5 rounded-full transition-colors ${isDark ? 'bg-slate-700' : 'bg-indigo-200'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full shadow transition-all ${isDark ? 'left-0.5 bg-slate-400' : 'left-5 bg-indigo-600'}`} />
            </div>
          </button>

          {/* User Card & Logout */}
          <div className={`flex items-center justify-between p-2.5 rounded-xl border ${userCardBg}`}>
            <div className="min-w-0 flex-1 mr-2">
              <p className={`text-xs font-semibold truncate ${userNameText}`}>{user?.name || 'User'}</p>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate">
                <Globe className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">{user?.timezone || 'UTC'}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto max-h-screen">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
