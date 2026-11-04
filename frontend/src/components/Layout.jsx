import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, Moon, Sun } from 'lucide-react';
import Sidebar from './Sidebar';
import { useTheme } from '../context/ThemeContext';

export default function Layout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const location = useLocation();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMobileNavOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileNavOpen]);

  return (
    <div className="min-h-screen bg-[#f7f8fc] dark:bg-[#0c1220]">
      <Sidebar
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      <div className="min-h-screen lg:pl-[250px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-100 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-[#101827]/95 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileNavOpen}
            >
              <Menu size={20} />
            </button>

            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[.16em] text-slate-500 dark:text-slate-400">
                StudyFlow · Student workspace
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={toggle}
            className="btn-ghost h-10 w-10 !p-0"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </header>

        <main className="mx-auto min-h-[calc(100vh-64px)] w-full max-w-[1600px] p-4 pt-6 sm:p-6 sm:pt-7 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
