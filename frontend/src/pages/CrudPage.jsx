import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  BookOpen,
  Target,
  X,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import { api } from '../lib/api';
import Pomodoro from '../components/Pomodoro';

const configs = {
  subjects: {
    title: 'Subjects',
    singular: 'subject',
    description: 'Keep your courses and study preferences in one place.',
    fields: [
      ['name', 'Subject name', 'text', true],
      ['code', 'Subject code', 'text'],
      ['description', 'Description', 'textarea'],
      ['weekly_hours', 'Weekly study hours', 'number'],
      ['color', 'Color', 'color'],
    ],
    columns: ['name', 'code', 'weekly_hours'],
  },
  assignments: {
    title: 'Assignments',
    singular: 'assignment',
    description: 'Track coursework, deadlines and priorities.',
    fields: [
      ['title', 'Assignment title', 'text', true],
      ['description', 'Description', 'textarea'],
      ['subject_id', 'Subject', 'subject'],
      ['due_at', 'Deadline', 'datetime-local'],
      ['estimated_minutes', 'Estimated minutes', 'number'],
      ['priority', 'Priority', 'select', ['low', 'medium', 'high', 'urgent']],
      ['status', 'Status', 'select', ['pending', 'in_progress', 'completed']],
    ],
    columns: ['title', 'subject_id', 'due_at', 'priority', 'status'],
  },
  examinations: {
    title: 'Examinations',
    singular: 'exam',
    description: 'Prepare confidently for every exam.',
    fields: [
      ['title', 'Examination title', 'text', true],
      ['subject_id', 'Subject', 'subject'],
      ['exam_at', 'Exam date & time', 'datetime-local', true],
      ['chapter_info', 'Syllabus / chapters', 'textarea'],
      ['notes', 'Preparation notes', 'textarea'],
      ['priority', 'Priority', 'select', ['low', 'medium', 'high', 'urgent']],
      ['preparation_progress', 'Preparation progress (%)', 'number'],
    ],
    columns: ['title', 'subject_id', 'exam_at', 'priority', 'preparation_progress'],
  },
  'study-sessions': {
    title: 'Study sessions',
    singular: 'session',
    description: 'Plan, track and review your focused study time.',
    fields: [
      ['title', 'Session title', 'text', true],
      ['subject_id', 'Subject', 'subject'],
      ['start_at', 'Start time', 'datetime-local', true],
      ['end_at', 'End time', 'datetime-local', true],
      ['duration_minutes', 'Duration (minutes)', 'number', true],
      ['status', 'Status', 'select', ['scheduled', 'in_progress', 'completed', 'cancelled']],
      ['is_locked', 'Lock this session', 'checkbox'],
    ],
    columns: ['title', 'subject_id', 'start_at', 'duration_minutes', 'status'],
  },
  goals: {
    title: 'Goals & habits',
    singular: 'goal',
    description: 'Turn consistent effort into measurable progress.',
    fields: [
      ['title', 'Goal title', 'text', true],
      ['description', 'Description', 'textarea'],
      ['goal_type', 'Goal period', 'select', ['daily', 'weekly', 'monthly', 'custom']],
      ['target_minutes', 'Target minutes', 'number'],
      ['start_date', 'Start date', 'date'],
      ['end_date', 'End date', 'date'],
    ],
    columns: ['title', 'goal_type', 'target_minutes', 'is_active'],
  },
};

const numericFields = new Set([
  'subject_id',
  'weekly_hours',
  'estimated_minutes',
  'duration_minutes',
  'target_minutes',
  'preparation_progress',
]);

const dateFields = new Set(['due_at', 'exam_at', 'start_at', 'end_at']);

function toLocalDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatValue(value, key) {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'is_active' || key === 'is_locked') return value === true || value === 1 ? 'Yes' : 'No';
  return String(value).replace('T', ' ').replace('Z', '').replaceAll('_', ' ');
}

function prettyLabel(key) {
  return key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function CrudPage({ type }) {
  const config = configs[type];
  const [rows, setRows] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api(`/${type}`);
      setRows(Array.isArray(result.data) ? result.data : []);
    } catch (requestError) {
      setError(requestError.message || `Unable to load ${config.title.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  }, [type, config.title]);

  useEffect(() => {
    load();
    api('/subjects')
      .then((result) => setSubjects(Array.isArray(result.data) ? result.data : []))
      .catch(() => setSubjects([]));
  }, [load]);

  const openModal = (row = null) => {
    setEditingRow(row);
    const initial = {};

    config.fields.forEach(([key, , kind]) => {
      const value = row?.[key];
      if (kind === 'datetime-local') initial[key] = toLocalDateTime(value);
      else if (kind === 'checkbox') initial[key] = Boolean(value);
      else initial[key] = value ?? '';
    });

    setForm(initial);
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingRow(null);
  };

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = { ...form };

      Object.keys(payload).forEach((key) => {
        if (payload[key] === '') delete payload[key];
      });

      numericFields.forEach((key) => {
        if (payload[key] !== undefined) payload[key] = Number(payload[key]);
      });

      dateFields.forEach((key) => {
        if (payload[key]) {
          const parsed = new Date(payload[key]);
          if (Number.isNaN(parsed.getTime())) {
            throw new Error(`Please provide a valid ${prettyLabel(key).toLowerCase()}.`);
          }
          payload[key] = parsed.toISOString();
        }
      });

      await api(`/${type}${editingRow ? `/${editingRow.id}` : ''}`, {
        method: editingRow ? 'PATCH' : 'POST',
        body: payload,
      });
      setModalOpen(false);
      setEditingRow(null);
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Unable to save this item.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    const label = row.title || row.name || config.singular;
    if (!window.confirm(`Delete “${label}”? This cannot be undone.`)) return;

    try {
      await api(`/${type}/${row.id}`, { method: 'DELETE' });
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Unable to delete this item.');
    }
  };

  const logGoalProgress = async (row) => {
    const rawMinutes = window.prompt('How many study minutes did you complete for this goal today?', '30');
    if (rawMinutes === null) return;

    const minutes = Number(rawMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0 || !Number.isInteger(minutes)) {
      setError('Enter a positive whole number of minutes.');
      return;
    }

    try {
      await api(`/goals/${row.id}/progress`, {
        method: 'POST',
        body: { completed_minutes: minutes },
      });
      setError('');
      window.alert('Progress recorded successfully.');
    } catch (requestError) {
      setError(requestError.message || 'Unable to record progress.');
    }
  };

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(term));
  }, [rows, search]);

  if (!config) {
    return <div className="surface p-6 text-sm text-rose-600">Unknown page type: {type}</div>;
  }

  return (
    <div className="fade-in space-y-6">
      {type === 'study-sessions' && <Pomodoro />}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-[.14em] text-indigo-500">
            Your workspace
          </div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
            {config.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {config.description}
          </p>
        </div>

        <button
          type="button"
          onClick={() => openModal()}
          className="btn-primary"
        >
          <Plus size={17} /> Add {config.singular}
        </button>
      </div>

      {error && !modalOpen && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      )}

      <section className="surface soft-shadow overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="field search-field"
              type="search"
              aria-label={`Search ${config.title.toLowerCase()}`}
              placeholder={`Search ${config.title.toLowerCase()}…`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="text-xs text-slate-400">
            {loading ? 'Loading…' : `${filteredRows.length} of ${rows.length} ${config.title.toLowerCase()}`}
          </div>
        </div>

        {loading ? (
          <div className="grid min-h-64 place-items-center text-sm text-slate-400">
            <div className="flex items-center gap-2"><RefreshCw size={16} className="animate-spin" /> Loading your {config.title.toLowerCase()}…</div>
          </div>
        ) : filteredRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
                <tr>
                  {config.columns.map((key) => (
                    <th className="px-5 py-3 font-bold" key={key}>{prettyLabel(key)}</th>
                  ))}
                  <th className="px-5 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/40">
                    {config.columns.map((key) => {
                      let value = row[key];
                      if (key === 'subject_id') {
                        value = subjects.find((subject) => Number(subject.id) === Number(value))?.name || '—';
                      } else if (key.endsWith('_at') && value) {
                        value = new Date(value).toLocaleString();
                      } else {
                        value = formatValue(value, key);
                      }

                      return (
                        <td key={key} className="max-w-[280px] px-5 py-4 text-slate-600 dark:text-slate-300">
                          <span className="block truncate" title={String(value)}>{value}</span>
                        </td>
                      );
                    })}

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        {type === 'goals' && (
                          <button
                            type="button"
                            title="Log today's progress"
                            aria-label="Log today's goal progress"
                            onClick={() => logGoalProgress(row)}
                            className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30"
                          >
                            <Target size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Edit"
                          aria-label={`Edit ${row.title || row.name || config.singular}`}
                          onClick={() => openModal(row)}
                          className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/30"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          aria-label={`Delete ${row.title || row.name || config.singular}`}
                          onClick={() => remove(row)}
                          className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-[300px] place-items-center px-5 py-12 text-center">
            <div>
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                {search ? <Search size={23} /> : <Inbox size={23} />}
              </div>
              <h2 className="font-display text-base font-extrabold text-slate-900 dark:text-white">
                {search ? 'No matching items' : `No ${config.title.toLowerCase()} yet`}
              </h2>
              <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                {search ? 'Try another search term or clear your search.' : `Add your first ${config.singular} to get organized.`}
              </p>
              {search ? (
                <button type="button" onClick={() => setSearch('')} className="mt-4 text-sm font-bold text-indigo-600 dark:text-indigo-300">
                  Clear search
                </button>
              ) : (
                <button type="button" onClick={() => openModal()} className="mt-4 text-sm font-bold text-indigo-600 dark:text-indigo-300">
                  Create your first {config.singular} <span aria-hidden="true">→</span>
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/65 p-3 backdrop-blur-sm sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <form
            onSubmit={save}
            className="surface my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5 shadow-2xl sm:p-7"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[.14em] text-indigo-500">
                  {editingRow ? 'Update details' : 'Add to your workspace'}
                </div>
                <h2 className="mt-1 font-display text-xl font-extrabold text-slate-900 dark:text-white">
                  {editingRow ? 'Edit' : 'New'} {config.singular}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {config.fields.map(([key, label, kind, options]) => (
                <div key={key} className={kind === 'textarea' ? 'sm:col-span-2' : ''}>
                  <label className="label" htmlFor={`crud-${key}`}>{label}</label>

                  {kind === 'textarea' ? (
                    <textarea
                      id={`crud-${key}`}
                      className="field min-h-28 resize-y"
                      value={form[key] ?? ''}
                      onChange={(event) => updateField(key, event.target.value)}
                    />
                  ) : kind === 'select' ? (
                    <select
                      id={`crud-${key}`}
                      className="field"
                      value={form[key] ?? options[0]}
                      onChange={(event) => updateField(key, event.target.value)}
                    >
                      {options.map((option) => (
                        <option value={option} key={option}>{prettyLabel(option)}</option>
                      ))}
                    </select>
                  ) : kind === 'subject' ? (
                    <select
                      id={`crud-${key}`}
                      className="field"
                      value={form[key] ?? ''}
                      onChange={(event) => updateField(key, event.target.value)}
                    >
                      <option value="">No subject linked</option>
                      {subjects.map((subject) => (
                        <option value={subject.id} key={subject.id}>
                          {subject.name}{subject.code ? ` (${subject.code})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : kind === 'checkbox' ? (
                    <label className="flex min-h-[42px] items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
                      <input
                        id={`crud-${key}`}
                        type="checkbox"
                        checked={Boolean(form[key])}
                        onChange={(event) => updateField(key, event.target.checked)}
                        className="h-4 w-4 accent-indigo-600"
                      />
                      <span>Keep this session protected from automatic changes</span>
                    </label>
                  ) : (
                    <input
                      id={`crud-${key}`}
                      className="field"
                      type={kind}
                      required={Boolean(options)}
                      min={kind === 'number' ? 0 : undefined}
                      max={key === 'preparation_progress' ? 100 : undefined}
                      step={key === 'weekly_hours' ? '0.5' : kind === 'number' ? '1' : undefined}
                      value={form[key] ?? ''}
                      onChange={(event) => updateField(key, event.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                {error}
              </p>
            )}

            <div className="mt-7 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeModal} disabled={saving} className="btn-ghost">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary min-w-32">
                {saving ? 'Saving…' : editingRow ? 'Save changes' : `Add ${config.singular}`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
