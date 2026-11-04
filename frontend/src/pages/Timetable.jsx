import { useState } from 'react';
import {
  Sparkles,
  CalendarClock,
  AlertTriangle,
  Lock,
  Clock,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../lib/api';

function localDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function subtractOccupiedTime(availability, sessions, bufferMinutes = 10) {
  const occupied = (sessions || [])
    .filter((session) => session.status !== 'cancelled')
    .map((session) => {
      const start = new Date(session.start_at).getTime();
      const explicitEnd = session.end_at ? new Date(session.end_at).getTime() : NaN;
      const duration = Number(session.duration_minutes) || 0;
      const end = Number.isFinite(explicitEnd)
        ? explicitEnd
        : start + duration * 60000;

      return { start, end: end + bufferMinutes * 60000 };
    })
    .filter((range) => Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start)
    .sort((a, b) => a.start - b.start);

  return availability.flatMap((slot) => {
    let fragments = [{
      start: new Date(slot.start).getTime(),
      end: new Date(slot.end).getTime(),
    }];

    occupied.forEach((blocked) => {
      fragments = fragments.flatMap((fragment) => {
        if (blocked.end <= fragment.start || blocked.start >= fragment.end) {
          return [fragment];
        }

        const remaining = [];
        if (blocked.start > fragment.start) {
          remaining.push({ start: fragment.start, end: Math.min(blocked.start, fragment.end) });
        }
        if (blocked.end < fragment.end) {
          remaining.push({ start: Math.max(blocked.end, fragment.start), end: fragment.end });
        }
        return remaining;
      });
    });

    return fragments
      .filter((fragment) => fragment.end - fragment.start >= 15 * 60000)
      .map((fragment) => ({
        start: new Date(fragment.start).toISOString(),
        end: new Date(fragment.end).toISOString(),
      }));
  });
}

function localDateTimeInputMin(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function totalMinutes(ranges) {
  return ranges.reduce((total, range) => {
    return total + Math.max(0, (new Date(range.end) - new Date(range.start)) / 60000);
  }, 0);
}

export default function Timetable() {
  const [slots, setSlots] = useState([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sessionMinutes, setSessionMinutes] = useState(50);
  const [maxDailyMinutes, setMaxDailyMinutes] = useState(240);
  const [saved, setSaved] = useState(false);
  const [excludedMinutes, setExcludedMinutes] = useState(0);

  const addSlot = () => {
    setError('');
    if (!start || !end) {
      setError('Choose both an availability start and end time.');
      return;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
      setError('The end time must be later than the start time.');
      return;
    }
    if (startDate <= new Date()) {
      setError('Choose a future availability window. Past time cannot be scheduled.');
      return;
    }

    const overlaps = slots.some((slot) => {
      const existingStart = new Date(slot.start);
      const existingEnd = new Date(slot.end);
      return startDate < existingEnd && endDate > existingStart;
    });

    if (overlaps) {
      setError('This availability window overlaps an existing window.');
      return;
    }

    setSlots((current) => [
      ...current,
      { start: startDate.toISOString(), end: endDate.toISOString() },
    ].sort((a, b) => new Date(a.start) - new Date(b.start)));
    setData(null);
    setSaved(false);
    setExcludedMinutes(0);
    setStart('');
    setEnd('');
  };

  const generate = async (save = false) => {
    setBusy(true);
    setError('');

    try {
      if (!slots.length) {
        throw new Error('Add at least one available time window first.');
      }
      if (Number(sessionMinutes) < 15 || Number(sessionMinutes) > 240) {
        throw new Error('Session length must be between 15 and 240 minutes.');
      }
      if (Number(maxDailyMinutes) < 30 || Number(maxDailyMinutes) > 720) {
        throw new Error('Daily study limit must be between 30 and 720 minutes.');
      }

      // Exclude existing sessions before generation as a client-side safety
      // net. The backend scheduler also checks its existing-session records.
      const existingResult = await api('/study-sessions');
      const existingSessions = Array.isArray(existingResult.data) ? existingResult.data : [];
      const freeAvailability = subtractOccupiedTime(slots, existingSessions, 10);

      if (!freeAvailability.length) {
        throw new Error('Your selected availability is already occupied by saved study sessions. Add another free time window.');
      }

      const blockedMinutes = Math.max(0, Math.round(totalMinutes(slots) - totalMinutes(freeAvailability)));
      setExcludedMinutes(blockedMinutes);

      const result = await api('/timetable/generate', {
        method: 'POST',
        body: {
          availability: freeAvailability,
          save,
          preferences: {
            sessionMinutes: Number(sessionMinutes),
            shortBreakMinutes: 10,
            maxDailyMinutes: Number(maxDailyMinutes),
          },
        },
      });

      setData(result.data);
      setSaved(save);
    } catch (requestError) {
      setError(requestError.message || 'Unable to generate your timetable.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fade-in space-y-6">
      <div className="max-w-3xl">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200">
          <Sparkles size={14} /> SMART STUDY PLANNER
        </div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white md:text-3xl">
          A timetable that works with your life.
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Add the times you are available. StudyFlow will allocate pending assignments and upcoming exam preparation around your deadlines, priorities and daily capacity.
        </p>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertTriangle size={17} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(340px,.82fr)_minmax(0,1.18fr)]">
        <section className="surface soft-shadow p-5 sm:p-6">
          <div className="mb-5">
            <div className="text-xs font-bold uppercase tracking-[.14em] text-indigo-500">Step 1</div>
            <h2 className="mt-1 font-display text-lg font-extrabold text-slate-900 dark:text-white">Your availability</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Add each date and time window when you can study.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="available-from">Available from</label>
              <input
                id="available-from"
                type="datetime-local"
                className="field"
                value={start}
                min={localDateTimeInputMin()}
                onChange={(event) => {
                  setStart(event.target.value);
                  setData(null);
                  setSaved(false);
                }}
              />
            </div>
            <div>
              <label className="label" htmlFor="available-until">Available until</label>
              <input
                id="available-until"
                type="datetime-local"
                className="field"
                value={end}
                min={start || localDateTimeInputMin()}
                onChange={(event) => {
                  setEnd(event.target.value);
                  setData(null);
                  setSaved(false);
                }}
              />
            </div>

            <button type="button" onClick={addSlot} className="btn-ghost w-full">
              + Add availability window
            </button>

            {slots.length > 0 && (
              <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Your available windows</span>
                  <span className="text-[11px] text-slate-400">{slots.length} added</span>
                </div>
                {slots.map((slot, index) => (
                  <div key={`${slot.start}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-[#141d2e]">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                        {localDateTime(slot.start)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Until {new Date(slot.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSlots((current) => current.filter((_, slotIndex) => slotIndex !== index));
                        setData(null);
                        setSaved(false);
                      }}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                      aria-label={`Remove availability window ${index + 1}`}
                      title="Remove window"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div>
                <label className="label" htmlFor="session-length">Session length (min)</label>
                <input
                  id="session-length"
                  type="number"
                  min="15"
                  max="240"
                  className="field"
                  value={sessionMinutes}
                  onChange={(event) => setSessionMinutes(event.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="daily-limit">Daily limit (min)</label>
                <input
                  id="daily-limit"
                  type="number"
                  min="30"
                  max="720"
                  className="field"
                  value={maxDailyMinutes}
                  onChange={(event) => setMaxDailyMinutes(event.target.value)}
                />
              </div>
            </div>

            {excludedMinutes > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200">
                {excludedMinutes} minutes were reserved around your existing study sessions to prevent timetable conflicts.
              </div>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={() => generate(false)}
              className="btn-primary w-full"
            >
              <Sparkles size={16} /> {busy ? 'Building your plan…' : 'Generate timetable'}
            </button>
            <p className="text-[11px] leading-5 text-slate-500 dark:text-slate-400">
              A preview is created first. Review the proposed sessions before saving them to your calendar.
            </p>
          </div>
        </section>

        <section className="surface soft-shadow min-h-[420px] p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
              <CalendarClock size={19} />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-[.14em] text-indigo-500">Step 2</div>
              <h2 className="font-display text-lg font-extrabold text-slate-900 dark:text-white">Your generated plan</h2>
            </div>
          </div>

          {!data ? (
            <div className="grid min-h-[300px] place-items-center text-center">
              <div>
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                  <Sparkles size={23} />
                </div>
                <h3 className="font-display font-extrabold text-slate-900 dark:text-white">Your next focused week starts here</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                  Add your availability and generate a balanced study plan.
                </p>
              </div>
            </div>
          ) : (
            <div>
              {saved && (
                <div role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <CheckCircle2 size={17} /> Sessions saved to your calendar.
                </div>
              )}

              <div className="mb-5 grid grid-cols-3 gap-2">
                {[
                  ['Sessions', data.summary?.session_count ?? data.sessions?.length ?? 0],
                  ['Scheduled', `${data.summary?.scheduled_minutes ?? 0} min`],
                  ['Unplanned', data.summary?.unscheduled_tasks ?? 0],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/70">
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{label}</div>
                    <div className="mt-1 font-display text-lg font-extrabold text-slate-900 dark:text-white sm:text-xl">{value}</div>
                  </div>
                ))}
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {(data.sessions || []).map((session, index) => (
                  <div key={`${session.start_at}-${index}`} className="flex gap-3 py-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                      <Clock size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{session.title}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {localDateTime(session.start_at)} · {session.duration_minutes} min
                      </div>
                      {session.reason && <div className="mt-1 text-xs text-indigo-600 dark:text-indigo-300">{session.reason}</div>}
                    </div>
                  </div>
                ))}
              </div>

              {(data.warnings || []).map((warning, index) => (
                <div key={index} className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                  <AlertTriangle size={16} className="shrink-0" />
                  <div>
                    <b>{warning.title}:</b> {warning.message}
                    {Number(warning.unallocated_minutes) > 0 ? ` ${warning.unallocated_minutes} minutes remain unallocated.` : ''}
                  </div>
                </div>
              ))}

              {!data.sessions?.length && !data.warnings?.length && (
                <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">No tasks needed scheduling.</div>
              )}

              {data.sessions?.length > 0 && !saved && (
                <button type="button" disabled={busy} onClick={() => generate(true)} className="btn-primary mt-5 w-full">
                  {busy ? 'Saving sessions…' : 'Save generated sessions'}
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      <div className="flex items-start gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
        <Lock size={14} className="mt-0.5 shrink-0" />
        Existing manually locked sessions are preserved by the scheduling engine. Generated previews are not saved automatically.
      </div>
    </div>
  );
}
