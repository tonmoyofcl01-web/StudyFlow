import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Timer, Coffee, Focus } from 'lucide-react';
import { api } from '../lib/api';

const DEFAULT_STATE = {
  mode: 'focus',
  workMinutes: 25,
  breakMinutes: 5,
  remaining: 1500,
  running: false,
  endsAt: null,
  completed: 0,
  focusStartedAt: null,
  hasStarted: false,
};

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem('studyflow-pomodoro'));
    if (!saved || typeof saved !== 'object') return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...saved, running: false, endsAt: null };
  } catch {
    return DEFAULT_STATE;
  }
}

export default function Pomodoro() {
  const [state, setState] = useState(readState);
  const [now, setNow] = useState(Date.now());
  const logged = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem('studyflow-pomodoro', JSON.stringify(state));
    } catch {
      // Timer remains usable even when local storage is unavailable.
    }
  }, [state]);

  useEffect(() => {
    if (!state.running) return undefined;
    const timerId = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timerId);
  }, [state.running]);

  useEffect(() => {
    if (!state.running || !state.endsAt) return;

    const remaining = Math.max(0, Math.ceil((state.endsAt - now) / 1000));
    if (remaining === 0) {
      if (state.mode === 'focus' && !logged.current) {
        logged.current = true;
        const endedAt = new Date();
        const startedAt = state.focusStartedAt || endedAt.getTime() - state.workMinutes * 60000;
        api('/study-sessions', {
          method: 'POST',
          body: {
            title: 'Pomodoro focus session',
            start_at: new Date(startedAt).toISOString(),
            end_at: endedAt.toISOString(),
            duration_minutes: state.workMinutes,
            status: 'completed',
          },
        }).catch((error) => console.error('Could not save completed focus session:', error));
      }

      setState((current) => ({
        ...current,
        mode: current.mode === 'focus' ? 'break' : 'focus',
        remaining: current.mode === 'focus' ? current.breakMinutes * 60 : current.workMinutes * 60,
        running: false,
        endsAt: null,
        completed: current.mode === 'focus' ? current.completed + 1 : current.completed,
        focusStartedAt: null,
        hasStarted: false,
      }));
      return;
    }

    if (remaining !== state.remaining) {
      setState((current) => ({ ...current, remaining }));
    }
  }, [now, state.running, state.endsAt, state.mode, state.remaining, state.focusStartedAt, state.workMinutes]);

  const start = () => {
    logged.current = false;
    setState((current) => ({
      ...current,
      running: true,
      hasStarted: true,
      endsAt: Date.now() + current.remaining * 1000,
      focusStartedAt: current.mode === 'focus'
        ? (current.focusStartedAt || Date.now())
        : null,
    }));
  };

  const pause = () => {
    setState((current) => ({
      ...current,
      running: false,
      remaining: Math.max(0, Math.ceil((current.endsAt - Date.now()) / 1000)),
      endsAt: null,
    }));
  };

  const reset = () => {
    logged.current = false;
    setState((current) => ({
      ...current,
      running: false,
      remaining: current.mode === 'focus' ? current.workMinutes * 60 : current.breakMinutes * 60,
      endsAt: null,
      focusStartedAt: null,
      hasStarted: false,
    }));
  };

  const updateDuration = (field, rawValue) => {
    const max = field === 'workMinutes' ? 120 : 60;
    const value = Math.max(1, Math.min(max, Number(rawValue) || 1));
    setState((current) => ({
      ...current,
      [field]: value,
      ...((field === 'workMinutes' && current.mode === 'focus') || (field === 'breakMinutes' && current.mode === 'break')
        ? { remaining: value * 60 }
        : {}),
    }));
  };

  const minutes = Math.floor(state.remaining / 60);
  const seconds = state.remaining % 60;
  const totalSeconds = (state.mode === 'focus' ? state.workMinutes : state.breakMinutes) * 60;
  const progress = Math.max(0, Math.min(100, 100 - (state.remaining / totalSeconds) * 100));

  return (
    <section className="surface soft-shadow mb-6 overflow-hidden p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
            <Timer size={19} />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-slate-900 dark:text-white">Focus timer</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Pomodoro · {state.completed} focus sessions completed</p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
          state.mode === 'focus'
            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200'
            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
        }`}>
          {state.mode === 'focus' ? 'Focus mode' : 'Break mode'}
        </span>
      </div>

      <div className="grid items-center gap-6 pt-5 sm:grid-cols-[160px_minmax(0,1fr)] lg:grid-cols-[180px_minmax(0,1fr)]">
        <div className="flex justify-center">
          <div
            className="grid h-36 w-36 place-items-center rounded-full sm:h-40 sm:w-40"
            style={{ background: `conic-gradient(#818cf8 ${progress}%, var(--timer-track, #e2e8f0) ${progress}% 100%)` }}
            role="timer"
            aria-live="off"
            aria-label={`${minutes} minutes ${seconds} seconds remaining`}
          >
            <div className="grid h-[122px] w-[122px] place-items-center rounded-full bg-white dark:bg-[#101827] sm:h-[136px] sm:w-[136px]">
              <div className="text-center">
                <div className="font-display text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </div>
                <div className="mt-1 whitespace-nowrap text-[9px] font-bold uppercase leading-none tracking-[.12em] text-slate-400">
                  {state.running
                    ? (state.mode === 'focus' ? 'FOCUSING' : 'ON BREAK')
                    : state.hasStarted ? 'PAUSED' : 'READY'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            {state.mode === 'focus' ? <Focus size={18} className="text-indigo-500" /> : <Coffee size={18} className="text-emerald-500" />}
            <h3 className="font-display text-lg font-extrabold">
              {state.mode === 'focus' ? 'Time to focus' : 'Take a breather'}
            </h3>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {state.mode === 'focus'
              ? 'Work on one task. Your completed focus sessions are added to your study history.'
              : 'Step away for a moment. Your next focus interval is ready when you are.'}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={state.running ? pause : start} className="btn-primary min-w-28">
              {state.running ? <Pause size={16} /> : <Play size={16} />}
              {state.running ? 'Pause' : 'Start focus'}
            </button>
            <button type="button" onClick={reset} className="btn-ghost" aria-label="Reset timer">
              <RotateCcw size={16} /> Reset
            </button>
          </div>

          <div className="mt-5 grid max-w-sm grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Focus length (min)
              <input
                aria-label="Focus minutes"
                disabled={state.running}
                type="number"
                min="1"
                max="120"
                className="field mt-1.5"
                value={state.workMinutes}
                onChange={(event) => updateDuration('workMinutes', event.target.value)}
              />
            </label>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Break length (min)
              <input
                aria-label="Break minutes"
                disabled={state.running}
                type="number"
                min="1"
                max="60"
                className="field mt-1.5"
                value={state.breakMinutes}
                onChange={(event) => updateDuration('breakMinutes', event.target.value)}
              />
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
