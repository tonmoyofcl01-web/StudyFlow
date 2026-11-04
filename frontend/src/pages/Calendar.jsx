import { useEffect, useMemo, useState } from 'react';
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addDays,
  subDays,
} from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

const eventStyles = {
  assignment: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200',
  examination: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200',
  'study-session': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200',
};

const eventLabels = {
  assignment: 'Assignment',
  examination: 'Examination',
  'study-session': 'Study session',
};

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [view, setView] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const range = useMemo(() => {
    if (view === 'day') {
      return { start: currentDate, end: currentDate };
    }

    if (view === 'week') {
      return {
        start: startOfWeek(currentDate),
        end: endOfWeek(currentDate),
      };
    }

    return {
      start: startOfWeek(startOfMonth(currentDate)),
      end: endOfWeek(endOfMonth(currentDate)),
    };
  }, [currentDate, view]);

  const days = useMemo(
    () => eachDayOfInterval({ start: range.start, end: range.end }),
    [range],
  );

  useEffect(() => {
    let active = true;

    const fetchEvents = async () => {
      setLoading(true);
      setError('');

      try {
        const from = range.start.toISOString();
        const to = range.end.toISOString();
        const result = await api(
          `/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        );

        if (active) {
          setEvents(Array.isArray(result.data) ? result.data : []);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || 'Unable to load calendar events.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchEvents();
    return () => {
      active = false;
    };
  }, [range]);

  const move = (direction) => {
    setCurrentDate((date) => {
      if (view === 'month') {
        return direction > 0 ? addMonths(date, 1) : subMonths(date, 1);
      }
      if (view === 'week') {
        return direction > 0 ? addDays(date, 7) : subDays(date, 7);
      }
      return direction > 0 ? addDays(date, 1) : subDays(date, 1);
    });
  };

  const heading = view === 'day'
    ? format(currentDate, 'EEEE, MMM d, yyyy')
    : view === 'week'
      ? `${format(range.start, 'MMM d')} – ${format(range.end, 'MMM d, yyyy')}`
      : format(currentDate, 'MMMM yyyy');

  const eventsForDay = (day) => events.filter((event) => {
    const eventDate = new Date(event.date);
    return !Number.isNaN(eventDate.getTime()) && isSameDay(eventDate, day);
  });

  return (
    <div className="fade-in space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-1 text-xs font-bold uppercase tracking-[.14em] text-indigo-500">
            Plan your time
          </div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
            Academic calendar
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Your deadlines, exams and study sessions in one view.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
            {['month', 'week', 'day'].map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => setView(option)}
                aria-pressed={view === option}
                className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize transition ${
                  view === option
                    ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-200'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn-ghost h-10 w-10 !p-0"
            onClick={() => move(-1)}
            aria-label="Previous period"
          >
            <ChevronLeft size={17} />
          </button>

          <div className="calendar-period-label min-w-[150px] px-1 text-center text-sm font-bold">
            {heading}
          </div>

          <button
            type="button"
            className="btn-ghost h-10 w-10 !p-0"
            onClick={() => move(1)}
            aria-label="Next period"
          >
            <ChevronRight size={17} />
          </button>

          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setCurrentDate((date) => new Date(date))}
            className="inline-flex items-center gap-2 font-semibold underline underline-offset-4"
          >
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      )}

      <section className="surface calendar-shell soft-shadow overflow-hidden">
        {view !== 'day' && (
          <div className="calendar-weekday-row grid grid-cols-7 border-b">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="calendar-weekday px-1 py-3 text-center text-[10px] font-bold uppercase tracking-wide sm:text-xs">
                {day}
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid min-h-[320px] place-items-center text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <RefreshCw size={16} className="animate-spin" />
              Loading calendar…
            </div>
          </div>
        ) : (
          <div className={`calendar-grid calendar-grid-${view} grid ${view === 'day' ? 'grid-cols-1' : 'grid-cols-7'}`}>
            {days.map((day) => {
              const dayEvents = eventsForDay(day);
              const today = isSameDay(day, new Date());
              const outsideMonth = view === 'month' && !isSameMonth(day, currentDate);

              return (
                <div
                  key={day.toISOString()}
                  className={`calendar-day-cell min-w-0 border-b border-r border-slate-100 p-2 dark:border-slate-800 sm:p-3 ${
                    outsideMonth ? 'calendar-day-outside' : ''
                  } ${today ? 'calendar-day-today' : ''}`}
                >
                  <div className="mb-2 flex items-center justify-between gap-1">
                    <span className={`calendar-day-number ${today ? 'calendar-day-number-today' : ''}`}>
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-slate-400">
                        {dayEvents.length} {dayEvents.length === 1 ? 'item' : 'items'}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {dayEvents.slice(0, view === 'day' ? 20 : 3).map((event) => {
                      const eventTime = event.date
                        ? new Date(event.date).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : '';

                      return (
                        <div
                          key={`${event.type}-${event.id}`}
                          title={`${event.title}${eventTime ? ` · ${eventTime}` : ''}`}
                          className={`truncate rounded-md px-1.5 py-1 text-[10px] font-semibold leading-4 sm:text-[11px] ${
                            eventStyles[event.type] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {view === 'day' && eventTime ? `${eventTime} · ` : ''}
                          {event.title}
                        </div>
                      );
                    })}

                    {dayEvents.length > 3 && view !== 'day' && (
                      <div className="px-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        +{dayEvents.length - 3} more
                      </div>
                    )}

                    {view === 'day' && dayEvents.length === 0 && (
                      <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-700">
                        Nothing scheduled for this day.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-semibold text-slate-700 dark:text-slate-200">Event types</span>
        {Object.entries(eventStyles).map(([key]) => (
          <span key={key} className="flex items-center gap-2 capitalize">
            <i className={`h-2.5 w-2.5 rounded-sm ${
              key === 'assignment' ? 'bg-amber-400' : key === 'examination' ? 'bg-rose-400' : 'bg-indigo-400'
            }`} />
            {eventLabels[key]}
          </span>
        ))}
        <span className="ml-auto inline-flex items-center gap-1 text-slate-400">
          <CalendarDays size={13} /> {events.length} events in view
        </span>
      </div>
    </div>
  );
}
