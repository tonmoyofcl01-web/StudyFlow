import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Clock3,
  ClipboardList,
  GraduationCap,
  Target,
  Sparkles,
  CalendarDays,
  RefreshCw,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

function StatCard({ label, value, detail, Icon, tint }) {
  return (
    <div className="surface soft-shadow min-h-[145px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tint}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-4 font-display text-3xl font-extrabold text-slate-900 dark:text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api('/dashboard');
      setData(result.data);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load your dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  if (loading) {
    return (
      <div className="surface grid min-h-64 place-items-center text-sm text-slate-400">
        <div className="flex items-center gap-2"><RefreshCw size={16} className="animate-spin" /> Preparing your overview…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface p-6">
        <h1 className="font-display text-xl font-extrabold text-slate-900 dark:text-white">Dashboard unavailable</h1>
        <p role="alert" className="mt-2 text-sm text-rose-600 dark:text-rose-300">{error}</p>
        <button type="button" onClick={load} className="btn-primary mt-4">Try again</button>
      </div>
    );
  }

  const todayMinutes = Number(data?.todayMinutes || 0);
  const weeklyStudy = data?.weeklyStudy || [];
  const maxWeeklyMinutes = Math.max(60, ...weeklyStudy.map((item) => Number(item.minutes || 0)));

  return (
    <div className="fade-in space-y-6 sm:space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm text-slate-500 dark:text-slate-400">{format(new Date(), 'EEEE, MMMM d, yyyy')}</div>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-white md:text-3xl">
            {greeting}, {user?.name?.split(' ')[0] || 'student'} <span className="text-amber-400">✦</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">A little progress today adds up to big results.</p>
        </div>
        <Link to="/app/timetable" className="btn-primary">
          <Sparkles size={16} /> Generate my study plan
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending assignments"
          value={data?.assignments?.pending || 0}
          detail={`${data?.assignments?.overdue || 0} overdue`}
          Icon={ClipboardList}
          tint="bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300"
        />
        <StatCard
          label="Study time today"
          value={`${Math.floor(todayMinutes / 60)}h ${todayMinutes % 60}m`}
          detail="Completed sessions"
          Icon={Clock3}
          tint="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300"
        />
        <StatCard
          label="Upcoming exams"
          value={data?.upcomingExams?.length || 0}
          detail="Next examinations"
          Icon={GraduationCap}
          tint="bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300"
        />
        <StatCard
          label="Active goals"
          value={data?.activeGoals || 0}
          detail={`${data?.subjectCount || 0} subjects added`}
          Icon={Target}
          tint="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <section className="surface soft-shadow p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-extrabold text-slate-900 dark:text-white">Today's study plan</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Your scheduled focus sessions</p>
            </div>
            <Link to="/app/calendar" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-300">
              View calendar <ArrowUpRight size={14} />
            </Link>
          </div>

          {data?.todaySchedule?.length ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.todaySchedule.map((session) => (
                <div key={session.id} className="flex gap-4 py-3 first:border-t first:border-slate-100 dark:first:border-slate-800">
                  <div className="w-20 shrink-0 pt-1 text-xs font-bold text-indigo-600 dark:text-indigo-300">
                    {format(new Date(session.start_at), 'h:mm a')}
                  </div>
                  <div className="w-1 shrink-0 rounded-full bg-indigo-400" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{session.title}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {session.duration_minutes} min · {String(session.status).replaceAll('_', ' ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-52 place-items-center py-8 text-center">
              <div>
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                  <CalendarDays size={22} />
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">A fresh page for today</div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">No sessions scheduled yet. Create a plan to get started.</p>
                <Link to="/app/timetable" className="mt-4 inline-block text-sm font-bold text-indigo-600 dark:text-indigo-300">Build my timetable →</Link>
              </div>
            </div>
          )}
        </section>

        <section className="surface soft-shadow p-5 sm:p-6">
          <h2 className="font-display text-lg font-extrabold text-slate-900 dark:text-white">Coming up</h2>
          <p className="mb-4 mt-1 text-xs text-slate-500 dark:text-slate-400">Your next academic milestones</p>
          {data?.upcomingExams?.length ? (
            <div className="mb-4 divide-y divide-slate-100 dark:divide-slate-800">
              {data.upcomingExams.map((exam) => (
                <div key={exam.id} className="py-3 first:border-t first:border-slate-100 dark:first:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 truncate text-sm font-bold text-slate-900 dark:text-white">{exam.title}</div>
                    <span className="shrink-0 rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-200">Exam</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{format(new Date(exam.exam_at), 'EEE, MMM d · h:mm a')}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-40 place-items-center text-center text-sm text-slate-500 dark:text-slate-400">
              No upcoming exams added.
            </div>
          )}
          <Link to="/app/examinations" className="text-xs font-bold text-indigo-600 dark:text-indigo-300">Manage examinations →</Link>
        </section>
      </div>

      <section className="surface soft-shadow p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-extrabold text-slate-900 dark:text-white">Weekly focus</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Completed study minutes over the last 7 days</p>
          </div>
          <Link to="/app/analytics" className="text-xs font-bold text-indigo-600 dark:text-indigo-300">Full analytics →</Link>
        </div>

        <div className="grid h-36 grid-cols-7 items-end gap-2 sm:gap-4">
          {Array.from({ length: 7 }, (_, index) => {
            const day = new Date();
            day.setDate(day.getDate() - 6 + index);
            const entry = weeklyStudy.find((item) => new Date(item.day).toDateString() === day.toDateString());
            const minutes = Number(entry?.minutes || 0);
            const height = minutes > 0 ? Math.max(6, (minutes / maxWeeklyMinutes) * 100) : 3;

            return (
              <div key={day.toISOString()} className="flex h-full min-w-0 flex-col items-center justify-end gap-2">
                <div className="w-full max-w-12 rounded-t-lg bg-indigo-500/85 transition-all" style={{ height: `${height}%` }} title={`${minutes} minutes`} />
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{format(day, 'EEEEE')}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
