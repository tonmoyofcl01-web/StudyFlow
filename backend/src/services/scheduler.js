const PRIORITY = { urgent: 4, high: 3, medium: 2, low: 1 };
const MIN_SESSION_MINUTES = 15;

const toMinute = (value) => {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? Math.floor(time / 60000) : NaN;
};

const toIso = (minute) => new Date(minute * 60000).toISOString();

function normalizeRanges(ranges) {
  const sorted = (ranges || [])
    .map((range) => ({
      start: toMinute(range.start),
      end: toMinute(range.end),
    }))
    .filter((range) => Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start)
    .sort((a, b) => a.start - b.start);

  // Merge overlapping availability windows so the same free time is never
  // considered twice.
  return sorted.reduce((merged, range) => {
    const previous = merged[merged.length - 1];
    if (previous && range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end);
    } else {
      merged.push({ ...range });
    }
    return merged;
  }, []);
}

function normalizeExistingSessions(sessions) {
  const seen = new Set();

  return (sessions || [])
    .filter((session) => session.status !== 'cancelled')
    .map((session) => {
      const start = toMinute(session.start_at);
      const explicitEnd = session.end_at ? toMinute(session.end_at) : NaN;
      const duration = Math.max(0, Number(session.duration_minutes) || 0);
      const end = Number.isFinite(explicitEnd)
        ? explicitEnd
        : start + duration;

      return { start, end };
    })
    .filter((session) => Number.isFinite(session.start) && Number.isFinite(session.end) && session.end > session.start)
    .filter((session) => {
      const key = `${session.start}:${session.end}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.start - b.start);
}

function utcDayKey(minute) {
  return new Date(minute * 60000).toISOString().slice(0, 10);
}

function nextUtcDayStart(minute) {
  const date = new Date(minute * 60000);
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1) / 60000);
}

function addDailyUsage(dailyUsed, start, end) {
  let cursor = start;

  while (cursor < end) {
    const day = utcDayKey(cursor);
    const dayEnd = nextUtcDayStart(cursor);
    const segmentEnd = Math.min(end, dayEnd);
    dailyUsed.set(day, (dailyUsed.get(day) || 0) + (segmentEnd - cursor));
    cursor = segmentEnd;
  }
}

/**
 * Deterministic earliest-deadline/priority scheduler.
 *
 * All timestamps must be valid ISO date strings. Existing non-cancelled
 * sessions are treated as occupied time, including in-progress and completed
 * sessions. A short break is respected after occupied and generated sessions.
 */
export function generateTimetable({
  tasks = [],
  availability = [],
  existingSessions = [],
  preferences = {},
}) {
  const sessionLength = Math.max(15, Math.min(240, Number(preferences.sessionMinutes) || 50));
  const shortBreak = Math.max(0, Math.min(60, Number(preferences.shortBreakMinutes ?? 10)));
  const maxDaily = Math.max(30, Math.min(720, Number(preferences.maxDailyMinutes) || 240));

  const horizon = normalizeRanges(availability);
  const occupied = normalizeExistingSessions(existingSessions);
  const dailyUsed = new Map();

  for (const session of existingSessions || []) {
    if (session.status === 'cancelled') continue;

    const start = toMinute(session.start_at);
    const explicitEnd = session.end_at ? toMinute(session.end_at) : NaN;
    const duration = Math.max(0, Number(session.duration_minutes) || 0);
    const end = Number.isFinite(explicitEnd) ? explicitEnd : start + duration;

    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      addDailyUsage(dailyUsed, start, end);
    }
  }

  const output = [];
  const warnings = [];

  const queue = tasks
    .map((task) => {
      const rawDeadline = task.deadline ? toMinute(task.deadline) : Infinity;
      return {
        ...task,
        remaining: Math.max(0, Number(task.remaining_minutes ?? task.estimated_minutes ?? 0)),
        deadline: Number.isFinite(rawDeadline) ? rawDeadline : Infinity,
        score: PRIORITY[task.priority] || 1,
      };
    })
    .filter((task) => task.remaining > 0)
    .sort((a, b) =>
      a.deadline - b.deadline
      || b.score - a.score
      || String(a.id ?? '').localeCompare(String(b.id ?? '')),
    );

  for (const task of queue) {
    let remaining = task.remaining;
    const taskRanges = horizon.filter((range) => range.start < task.deadline);

    for (const range of taskRanges) {
      if (remaining <= 0) break;

      let cursor = range.start;

      while (cursor < range.end && remaining > 0) {
        const day = utcDayKey(cursor);
        const dayEnd = nextUtcDayStart(cursor);
        const usedToday = dailyUsed.get(day) || 0;

        // Continue at the next day boundary instead of abandoning an
        // availability window that spans midnight.
        if (usedToday >= maxDaily) {
          cursor = Math.min(range.end, dayEnd);
          continue;
        }

        // The end plus the break is considered occupied. This also handles
        // availability that begins shortly after an existing session ends.
        const next = occupied.find((item) =>
          item.start < range.end && item.end + shortBreak > cursor,
        );

        if (next && next.start <= cursor) {
          cursor = Math.min(range.end, Math.max(cursor, next.end) + shortBreak);
          continue;
        }

        const gapEnd = Math.min(
          range.end,
          dayEnd,
          next ? next.start : range.end,
        );

        if (gapEnd <= cursor) {
          cursor = Math.min(range.end, cursor + 1);
          continue;
        }

        const capacity = Math.min(
          gapEnd - cursor,
          maxDaily - usedToday,
          remaining,
          sessionLength,
        );

        if (capacity >= MIN_SESSION_MINUTES) {
          const end = cursor + capacity;
          const reason = `${task.priority || 'normal'} priority · ${
            task.deadline === Infinity ? 'flexible deadline' : 'deadline-aware allocation'
          } · ${task.subject_name || 'General study'}`;

          const session = {
            task_id: task.id || null,
            subject_id: task.subject_id || null,
            title: task.title || task.name || 'Study session',
            start_at: toIso(cursor),
            end_at: toIso(end),
            duration_minutes: capacity,
            is_locked: false,
            reason,
          };

          output.push(session);
          occupied.push({ start: cursor, end });
          occupied.sort((a, b) => a.start - b.start || a.end - b.end);

          dailyUsed.set(day, usedToday + capacity);
          remaining -= capacity;
          cursor = end + shortBreak;
        } else if (next) {
          // The gap is too short for a useful session. Move past the
          // conflicting session and its break rather than producing overlap.
          cursor = Math.min(range.end, Math.max(cursor + 1, next.end + shortBreak));
        } else {
          cursor = gapEnd;
        }
      }
    }

    if (remaining > 0) {
      warnings.push({
        task_id: task.id || null,
        title: task.title || task.name || 'Untitled task',
        unallocated_minutes: remaining,
        message: 'Not enough available study time before this task deadline.',
      });
    }
  }

  return {
    sessions: output,
    warnings,
    summary: {
      scheduled_minutes: output.reduce((sum, session) => sum + session.duration_minutes, 0),
      unscheduled_tasks: warnings.length,
      session_count: output.length,
    },
  };
}
