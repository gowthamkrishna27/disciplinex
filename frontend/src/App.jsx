import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AddSchedule from './pages/AddSchedule';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import AICoach from './pages/AICoach';
import { 
  CalendarRange, 
  LayoutDashboard, 
  CalendarPlus, 
  BarChart3, 
  Settings as SettingsIcon,
  Flame,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';

const Layout = () => {
  const { user, logout, isDark, toggleTheme } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'planner':
        return <AddSchedule />;
      case 'analytics':
        return <Analytics />;
      case 'ai-coach':
        return <AICoach />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark text-color-text-light dark:text-color-text-dark font-sans flex flex-col transition-colors duration-300">
      
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-bg-card-dark/80 backdrop-blur-md border-b border-border-light dark:border-border-dark py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          
          {/* Brand Logo */}
          <div 
            onClick={() => setActivePage('dashboard')} 
            className="flex items-center gap-2 cursor-pointer select-none group"
          >
            <div className="w-9 h-9 rounded-xl bg-brand-purple/10 dark:bg-brand-purple/20 flex items-center justify-center text-brand-purple transition group-hover:scale-105">
              <svg className="w-5 h-5" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M25 25H50C62 25 70 32 70 45C70 58 62 65 50 65H25V25Z" stroke="currentColor" strokeWidth="10" strokeLinejoin="round" />
                <path d="M70 25L35 65" stroke="#7c3aed" strokeWidth="12" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-display font-bold tracking-tight text-lg text-zinc-900 dark:text-white">
              DisciplineX
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => setActivePage('dashboard')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold select-none cursor-pointer transition ${
                activePage === 'dashboard'
                  ? 'bg-zinc-150 dark:bg-zinc-800 text-brand-purple dark:text-white'
                  : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </button>

            <button
              onClick={() => setActivePage('planner')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold select-none cursor-pointer transition ${
                activePage === 'planner'
                  ? 'bg-zinc-150 dark:bg-zinc-800 text-brand-purple dark:text-white'
                  : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              Routine Designer
            </button>

            <button
              onClick={() => setActivePage('analytics')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold select-none cursor-pointer transition ${
                activePage === 'analytics'
                  ? 'bg-zinc-150 dark:bg-zinc-800 text-brand-purple dark:text-white'
                  : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Analytics
            </button>

            <button
              onClick={() => setActivePage('ai-coach')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold select-none cursor-pointer transition ${
                activePage === 'ai-coach'
                  ? 'bg-zinc-150 dark:bg-zinc-800 text-brand-purple dark:text-white'
                  : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Coach
            </button>

            <button
              onClick={() => setActivePage('settings')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold select-none cursor-pointer transition ${
                activePage === 'settings'
                  ? 'bg-zinc-150 dark:bg-zinc-800 text-brand-purple dark:text-white'
                  : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              Settings
            </button>
          </nav>

          {/* Action Blocks */}
          <div className="flex items-center gap-2">
            
            {/* Theme Toggle Icon Button */}
            <button
              onClick={toggleTheme}
              className="p-2 border border-border-light dark:border-border-dark text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-xl transition cursor-pointer"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4.5 h-4.5 text-brand-amber" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            <div className="w-px h-6 bg-border-light dark:bg-border-dark mx-1 hidden sm:block"></div>

            {/* Quick Profile Info */}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-zinc-950 dark:text-zinc-200 leading-tight">
                {user.name}
              </span>
              <span className="text-[9px] text-zinc-400">
                Goal: {user.dailyGoal}h / day
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Pages Content viewport */}
      <main className="flex-grow pb-16">
        {renderActivePage()}
      </main>

      {/* Mobile Sticky Tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-bg-card-dark/95 border-t border-border-light dark:border-border-dark backdrop-blur-md px-6 py-2">
        <div className="flex items-center justify-around">
          
          <button 
            onClick={() => setActivePage('dashboard')} 
            className={`flex flex-col items-center gap-1 cursor-pointer transition ${activePage === 'dashboard' ? 'text-brand-purple' : 'text-zinc-400'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[9px] font-bold">Today</span>
          </button>

          <button 
            onClick={() => setActivePage('planner')} 
            className={`flex flex-col items-center gap-1 cursor-pointer transition ${activePage === 'planner' ? 'text-brand-purple' : 'text-zinc-400'}`}
          >
            <CalendarPlus className="w-5 h-5" />
            <span className="text-[9px] font-bold">Designer</span>
          </button>

          <button 
            onClick={() => setActivePage('analytics')} 
            className={`flex flex-col items-center gap-1 cursor-pointer transition ${activePage === 'analytics' ? 'text-brand-purple' : 'text-zinc-400'}`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[9px] font-bold">Analytics</span>
          </button>

          <button 
            onClick={() => setActivePage('ai-coach')} 
            className={`flex flex-col items-center gap-1 cursor-pointer transition ${activePage === 'ai-coach' ? 'text-brand-purple' : 'text-zinc-400'}`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[9px] font-bold">AI Coach</span>
          </button>

          <button 
            onClick={() => setActivePage('settings')} 
            className={`flex flex-col items-center gap-1 cursor-pointer transition ${activePage === 'settings' ? 'text-brand-purple' : 'text-zinc-400'}`}
          >
            <SettingsIcon className="w-5 h-5" />
            <span className="text-[9px] font-bold">Settings</span>
          </button>

        </div>
      </div>

    </div>
  );
};

const AuthWrapper = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex flex-col justify-center items-center font-sans text-zinc-400">
        <div className="w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold">Synchronizing account token...</p>
      </div>
    );
  }

  return user ? <Layout /> : <Login />;
};

export const App = () => {
  return (
    <AuthProvider>
      <AuthWrapper />
    </AuthProvider>
  );
};

export default App;
