import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, Trash2, Inbox, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

export default function Notifications() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api('/notifications');
      setRows(Array.isArray(result.data) ? result.data : []);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = useMemo(
    () => rows.filter((notification) => !notification.is_read).length,
    [rows],
  );

  const act = async (path, method = 'PATCH') => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api(path, { method });
      await load();
    } catch (requestError) {
      setError(requestError.message || 'The notification action failed.');
    } finally {
      setBusy(false);
    }
  };

  const clearAll = () => {
    if (!rows.length || busy) return;
    const accepted = window.confirm('Clear all notifications? This cannot be undone.');
    if (accepted) act('/notifications', 'DELETE');
  };

  return (
    <div className="fade-in space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 text-xs font-bold uppercase tracking-[.14em] text-indigo-500">
            Personal inbox
          </div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Stay on top of your academic reminders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!loading && rows.length > 0 && (
            <>
              <span className="mr-1 hidden text-xs text-slate-500 dark:text-slate-400 sm:inline">
                {rows.length} total · {unreadCount} unread
              </span>
              <button
                type="button"
                disabled={busy || unreadCount === 0}
                onClick={() => act('/notifications/read-all')}
                className="btn-ghost text-xs"
              >
                <CheckCheck size={15} /> Mark all read
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={clearAll}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30"
              >
                <Trash2 size={15} /> Clear all
              </button>
            </>
          )}

          <button
            type="button"
            onClick={load}
            disabled={loading || busy}
            className="btn-ghost h-10 w-10 !p-0"
            aria-label="Refresh notifications"
            title="Refresh notifications"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
          <span>{error}</span>
          <button type="button" onClick={load} className="font-semibold underline underline-offset-4">
            Try again
          </button>
        </div>
      )}

      <section className="surface soft-shadow overflow-hidden">
        {loading ? (
          <div className="grid min-h-[260px] place-items-center text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <RefreshCw size={16} className="animate-spin" /> Loading notifications…
            </div>
          </div>
        ) : rows.length ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((notification) => (
              <article
                key={notification.id}
                className={`flex flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-start sm:p-5 ${
                  notification.is_read ? '' : 'bg-indigo-50/50 dark:bg-indigo-950/20'
                }`}
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                  <Bell size={17} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      {notification.title}
                    </h2>
                    {!notification.is_read && (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200">
                        New
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {notification.message}
                  </p>
                  <div className="mt-2 text-xs text-slate-400">
                    {new Date(notification.created_at).toLocaleString()}
                  </div>
                </div>

                {!notification.is_read && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act(`/notifications/${notification.id}/read`)}
                    className="self-start rounded-lg px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 dark:text-indigo-300 dark:hover:bg-indigo-950/50 sm:self-center"
                  >
                    Mark read
                  </button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="grid min-h-[280px] place-items-center px-5 py-12 text-center">
            <div className="max-w-sm">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                <Inbox size={25} />
              </div>
              <h2 className="font-display text-base font-extrabold text-slate-900 dark:text-white">
                You're all caught up
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                There are no reminders in your inbox right now. New notifications will appear here when an academic reminder is generated.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
