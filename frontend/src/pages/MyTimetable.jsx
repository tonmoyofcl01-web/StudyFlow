import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  RefreshCw,
  CalendarPlus,
  ListChecks,
} from 'lucide-react';
import { api } from '../lib/api';

const HOUR_HEIGHT = 72;
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 20;

function asDate(value) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfWeek(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

function addDays(value, amount) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

function dateKey(value) {
  const date = asDate(value);
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTime(value) {
  const date = asDate(value);
  if (!date) return 'Time unavailable';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatWeek(value) {
  return value.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: value.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

function getSessionEnd(session) {
  const explicitEnd = asDate(session.end_at);
  if (explicitEnd) return explicitEnd;

  const start = asDate(session.start_at);
  if (!start) return null;

  return new Date(start.getTime() + Math.max(1, Number(session.duration_minutes) || 1) * 60000);
}

function statusClasses(status) {
  switch (status) {
    case 'in_progress':
      return 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100';
    case 'completed':
      return 'border-slate-500/50 bg-slate-500/15 text-slate-200';
    case 'cancelled':
      return 'border-rose-400/50 bg-rose-500/15 text-rose-100';
    default:
      return 'border-indigo-400/50 bg-indigo-500/15 text-indigo-100';
  }
}

function statusLabel(status) {
  return String(status || 'scheduled').replaceAll('_', ' ');
}

/**
 * Lay out overlapping events in side-by-side lanes.
 * Lane count is calculated per overlapping cluster, not for the entire day.
 * This prevents later, non-overlapping sessions from being unnecessarily
 * compressed to half-width.
 */
function layoutLanes(items) {
  const sorted = [...items]
    .map((item) => {
      const start = asDate(item.start_at);
      const end = getSessionEnd(item);
      return start && end && end > start
        ? { ...item, _start: start, _end: end }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => a._start - b._start || a._end - b._end);

  const result = [];
  let cluster = [];
  let clusterEnd = -Infinity;

  const flushCluster = () => {
    if (!cluster.length) return;

    const laneEnds = [];
    const placed = cluster.map((item) => {
      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= item._start.getTime());
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = item._end.getTime();
      return { ...item, _lane: lane };
    });

    const laneCount = Math.max(1, laneEnds.length);
    placed.forEach((item) => result.push({ ...item, _laneCount: laneCount }));

    cluster = [];
    clusterEnd = -Infinity;
  };

  sorted.forEach((item) => {
    if (cluster.length && item._start.getTime() >= clusterEnd) {
      flushCluster();
    }

    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item._end.getTime());
  });

  flushCluster();
  return result;
}

function getVisibleHours(weekSessions) {
  if (!weekSessions.length) {
    return {
      startHour: DEFAULT_START_HOUR,
      endHour: DEFAULT_END_HOUR,
      hourLabels: Array.from(
        { length: DEFAULT_END_HOUR - DEFAULT_START_HOUR },
        (_, index) => DEFAULT_START_HOUR + index,
      ),
    };
  }

  const starts = weekSessions.map((session) => asDate(session.start_at)).filter(Boolean);
  const ends = weekSessions.map(getSessionEnd).filter(Boolean);
  const earliest = Math.min(...starts.map((date) => date.getHours() + date.getMinutes() / 60));
  const latest = Math.max(...ends.map((date) => date.getHours() + date.getMinutes() / 60));

  // Keep one hour of context around the first and last session while avoiding
  // a mostly empty 6 AM–10 PM grid for students who study in the evening.
  const startHour = Math.max(0, Math.floor(earliest) - 1);
  const endHour = Math.min(24, Math.max(startHour + 1, Math.ceil(latest) + 1));

  return {
    startHour,
    endHour,
    hourLabels: Array.from({ length: endHour - startHour }, (_, index) => startHour + index),
  };
}

export default function MyTimetable() {
  const [sessions, setSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [sessionResult, subjectResult] = await Promise.all([
        api('/study-sessions'),
        api('/subjects'),
      ]);

      setSessions(Array.isArray(sessionResult.data) ? sessionResult.data : []);
      setSubjects(Array.isArray(subjectResult.data) ? subjectResult.data : []);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load your saved study sessions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const subjectNames = useMemo(() => {
    const map = new Map();
    subjects.forEach((subject) => map.set(Number(subject.id), subject.name));
    return map;
  }, [subjects]);

  const sessionsByDay = useMemo(() => {
    const grouped = new Map(days.map((day) => [dateKey(day), []]));

    sessions.forEach((session) => {
      if (session.status === 'cancelled') return;
      const start = asDate(session.start_at);
      if (!start) return;

      const key = dateKey(start);
      if (grouped.has(key)) grouped.get(key).push(session);
    });

    grouped.forEach((items, key) => grouped.set(key, layoutLanes(items)));
    return grouped;
  }, [days, sessions]);

  const weekSessions = useMemo(
    () => days.flatMap((day) => sessionsByDay.get(dateKey(day)) || []),
    [days, sessionsByDay],
  );

  const weekMinutes = weekSessions.reduce(
    (total, session) => total + (Number(session.duration_minutes) || 0),
    0,
  );
  const completedCount = weekSessions.filter((session) => session.status === 'completed').length;

  const { startHour, endHour, hourLabels } = useMemo(
    () => getVisibleHours(weekSessions),
    [weekSessions],
  );

  const gridHeight = (endHour - startHour) * HOUR_HEIGHT;
  const todayKey = dateKey(new Date());
  const rangeLabel = `${formatWeek(weekStart)} – ${formatWeek(addDays(weekStart, 6))}`;

  const moveWeek = (amount) => {
    setWeekStart((current) => addDays(current, amount * 7));
  };

  const now = new Date();
  const nowOffset = ((now.getHours() * 60 + now.getMinutes() - startHour * 60) / 60) * HOUR_HEIGHT;
  const nowIsVisible = nowOffset >= 0 && nowOffset <= gridHeight;

  return (
    <div className="fade-in space-y-5">
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200">
            <CalendarDays size={14} /> YOUR SAVED STUDY PLAN
          </div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white md:text-3xl">
            My Timetable
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            See your saved study sessions across the week, including their times, subjects and status.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center 2xl:justify-end">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => moveWeek(-1)}
              className="btn-ghost grid h-10 w-10 shrink-0 place-items-center !p-0"
              aria-label="Previous week"
              title="Previous week"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="min-w-[150px] flex-1 text-center text-sm font-bold text-slate-800 dark:text-slate-100 sm:flex-none" aria-live="polite">
              {rangeLabel}
            </div>
            <button
              type="button"
              onClick={() => moveWeek(1)}
              className="btn-ghost grid h-10 w-10 shrink-0 place-items-center !p-0"
              aria-label="Next week"
              title="Next week"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
              className="btn-ghost h-10 flex-1 px-3 text-sm font-semibold sm:flex-none"
            >
              This week
            </button>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="btn-ghost inline-flex h-10 flex-1 items-center justify-center gap-2 px-3 text-sm font-semibold disabled:opacity-60 sm:flex-none"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <Link
              to="/app/sessions"
              className="btn-primary inline-flex h-10 w-full items-center justify-center gap-2 px-3 text-sm sm:w-auto"
            >
              <ListChecks size={16} /> Manage sessions
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{error}</span>
          <button type="button" onClick={load} className="font-bold underline underline-offset-2">
            Try again
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="surface p-4">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sessions this week</div>
          <div className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-white">
            {weekSessions.length}
          </div>
        </div>
        <div className="surface p-4">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Planned study time</div>
          <div className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-white">
            {Math.floor(weekMinutes / 60)}h {weekMinutes % 60}m
          </div>
        </div>
        <div className="surface p-4">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completed sessions</div>
          <div className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-white">
            {completedCount}
          </div>
        </div>
      </div>

      <section className="surface soft-shadow overflow-hidden" aria-label="Weekly study timetable">
        {loading ? (
          <div className="grid min-h-[260px] place-items-center text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <RefreshCw size={17} className="animate-spin" /> Loading your saved timetable…
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[1080px]">
              <div className="sticky top-16 z-10 grid grid-cols-[68px_repeat(7,minmax(0,1fr))] border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-[#111c2d]">
                <div className="flex items-center justify-center border-r border-slate-200 px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-700">
                  Time
                </div>
                {days.map((day) => {
                  const key = dateKey(day);
                  const isToday = key === todayKey;

                  return (
                    <div
                      key={key}
                      className={`border-r border-slate-200 px-2 py-3 text-center last:border-r-0 dark:border-slate-700 ${
                        isToday ? 'bg-indigo-50/80 dark:bg-indigo-950/30' : ''
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {day.toLocaleDateString([], { weekday: 'short' })}
                      </div>
                      <div
                        className={`mx-auto mt-1 grid h-8 w-8 place-items-center rounded-full text-sm font-extrabold ${
                          isToday ? 'bg-indigo-600 text-white' : 'text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {day.getDate()}
                      </div>
                      {isToday && (
                        <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
                          Today
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-[68px_repeat(7,minmax(0,1fr))]">
                <div
                  className="border-r border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-[#111827]"
                  style={{ height: gridHeight }}
                >
                  {hourLabels.map((hour) => (
                    <div
                      key={hour}
                      className="relative border-b border-slate-200/70 pr-2 text-right dark:border-slate-700/70"
                      style={{ height: HOUR_HEIGHT }}
                    >
                      <span className="relative -top-2 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                        {new Date(2000, 0, 1, hour).toLocaleTimeString([], {
                          hour: 'numeric',
                          hour12: true,
                        })}
                      </span>
                    </div>
                  ))}
                </div>

                {days.map((day) => {
                  const key = dateKey(day);
                  const daySessions = sessionsByDay.get(key) || [];
                  const isToday = key === todayKey;

                  return (
                    <div
                      key={key}
                      className={`relative border-r border-slate-200 last:border-r-0 dark:border-slate-700 ${
                        isToday ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''
                      }`}
                      style={{
                        height: gridHeight,
                        backgroundImage:
                          'repeating-linear-gradient(to bottom, transparent 0, transparent 71px, rgba(148,163,184,.16) 71px, rgba(148,163,184,.16) 72px)',
                      }}
                    >
                      {isToday && nowIsVisible && (
                        <div
                          className="pointer-events-none absolute left-0 right-0 z-[2] border-t-2 border-rose-400"
                          style={{ top: nowOffset }}
                          aria-label="Current time"
                        >
                          <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-rose-400" />
                        </div>
                      )}

                      {daySessions.map((session) => {
                        const start = session._start || asDate(session.start_at);
                        const end = session._end || getSessionEnd(session);
                        if (!start || !end) return null;

                        const startMinutes = start.getHours() * 60 + start.getMinutes();
                        const offsetMinutes = Math.max(0, startMinutes - startHour * 60);
                        const duration = Math.max(1, (end.getTime() - start.getTime()) / 60000);
                        const top = (offsetMinutes / 60) * HOUR_HEIGHT + 2;
                        const remainingGridHeight = Math.max(0, gridHeight - top);
                        const height = Math.min(
                          remainingGridHeight,
                          Math.max(36, (duration / 60) * HOUR_HEIGHT - 4),
                        );
                        if (height <= 0) return null;

                        const laneWidth = 100 / session._laneCount;
                        const left = laneWidth * session._lane;
                        const isOverlapping = session._laneCount > 1;
                        const subjectName =
                          subjectNames.get(Number(session.subject_id)) || 'General study';
                        const tone = statusClasses(session.status);

                        return (
                          <div
                            key={session.id}
                            title={`${session.title}\n${subjectName}\n${formatTime(start)} – ${formatTime(end)} · ${session.duration_minutes} min\nStatus: ${statusLabel(session.status)}`}
                            aria-label={`${session.title}, ${subjectName}, ${formatTime(start)}, ${session.duration_minutes} minutes, ${statusLabel(session.status)}`}
                            className={`absolute z-[1] min-w-0 overflow-hidden rounded-lg border shadow-sm ${tone} ${
                              isOverlapping ? 'p-1' : 'p-2'
                            }`}
                            style={{
                              top,
                              height,
                              left: `calc(${left}% + 2px)`,
                              width: `calc(${laneWidth}% - 4px)`,
                            }}
                          >
                            <div className={`${height < 50 ? 'line-clamp-1' : 'line-clamp-2'} break-words text-[9px] font-extrabold leading-[1.15] sm:text-[10px]`}>
                              {session.title}
                            </div>

                            {height >= 64 && (
                              <div className="mt-1 truncate text-[8px] opacity-80">
                                {subjectName}
                              </div>
                            )}
                            {!isOverlapping && height >= 52 && height < 64 && (
                              <div className="mt-1 truncate text-[9px] opacity-80">
                                {subjectName}
                              </div>
                            )}

                            {height >= 50 && (
                              <div className="mt-1 flex flex-wrap items-center gap-x-1 text-[8px] font-semibold leading-3 opacity-90 sm:text-[9px]">
                                <span>{formatTime(start)}</span>
                                <span>·</span>
                                <span>{Number(session.duration_minutes) || Math.round(duration)} min</span>
                              </div>
                            )}

                            {!isOverlapping && height >= 78 && (
                              <div className="mt-1 truncate text-[8px] font-bold uppercase tracking-wide opacity-75">
                                {statusLabel(session.status)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {!loading && !error && weekSessions.length === 0 && (
          <div className="border-t border-slate-200 px-5 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <p className="font-semibold text-slate-700 dark:text-slate-200">
              No saved study sessions this week
            </p>
            <p className="mt-1">
              Use the study planner to generate a plan or add a session manually.
            </p>
            <div className="mt-3">
              <Link
                to="/app/timetable"
                className="inline-flex items-center gap-2 font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-300"
              >
                <CalendarPlus size={15} /> Open study planner
              </Link>
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" /> Scheduled
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> In progress
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-500" /> Completed
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> Cancelled
        </span>
        <span className="ml-auto inline-flex items-center gap-1">
          <Clock3 size={13} /> Times shown in your local time zone
        </span>
      </div>
    </div>
  );
}
