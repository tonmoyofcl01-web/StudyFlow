import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Timer,
  CalendarDays,
  CalendarRange,
  Target,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Sparkles,
  PanelLeftClose,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const groups = [
  {
    label: 'Workspace',
    items: [
      ['Overview', '/app', LayoutDashboard],
      ['Assignments', '/app/assignments', ClipboardList],
      ['Examinations', '/app/examinations', GraduationCap],
      ['Subjects', '/app/subjects', BookOpen],
      ['Study sessions', '/app/sessions', Timer],
    ],
  },
  {
    label: 'Plan & improve',
    items: [
      ['Timetable planner', '/app/timetable', Sparkles],
      ['My timetable', '/app/my-timetable', CalendarRange],
      ['Calendar', '/app/calendar', CalendarDays],
      ['Goals', '/app/goals', Target],
      ['Analytics', '/app/analytics', BarChart3],
    ],
  },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
          aria-label="Close navigation menu"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r border-slate-100 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-[#101827] lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main navigation"
      >
        <div className="flex h-[72px] shrink-0 items-center gap-3 px-5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/20">
            <BookOpen size={19} />
          </div>
          <div className="min-w-0">
            <div className="font-display text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
              studyflow<span className="text-indigo-500">.</span>
            </div>
            <div className="text-[10px] uppercase tracking-[.15em] text-slate-400">
              Student workspace
            </div>
          </div>

          <button
            type="button"
            className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        <nav className="scrollbar sidebar-nav min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {groups.map((group) => (
            <div key={group.label} className="mb-4">
              <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">
                {group.label}
              </div>

              {group.items.map(([label, to, Icon]) => (
                <NavLink
                  end={to === '/app'}
                  onClick={onClose}
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `nav-item mb-1 ${isActive ? 'active' : ''}`
                  }
                >
                  <Icon size={17} className="shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}

          <div className="mb-4">
            <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">
              Personal
            </div>

            <NavLink
              to="/app/notifications"
              onClick={onClose}
              className={({ isActive }) => `nav-item mb-1 ${isActive ? 'active' : ''}`}
            >
              <Bell size={17} className="shrink-0" />
              <span>Notifications</span>
            </NavLink>

            <NavLink
              to="/app/settings"
              onClick={onClose}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Settings size={17} className="shrink-0" />
              <span>Settings</span>
            </NavLink>
          </div>
        </nav>

        <div className="shrink-0 border-t border-slate-100 p-4 dark:border-slate-800">
          <div className="flex min-w-0 items-center gap-3 rounded-xl p-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-100 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">
              {user?.name?.[0]?.toUpperCase() || 'S'}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-slate-800 dark:text-white">
                {user?.name || 'Student'}
              </div>
              <div className="truncate text-xs text-slate-400">
                {user?.email || ''}
              </div>
            </div>

            <button
              type="button"
              title="Sign out"
              aria-label="Sign out"
              onClick={signOut}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
