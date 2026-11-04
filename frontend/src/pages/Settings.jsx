import { useState } from 'react';
import { Check, Moon, Sun, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { useTheme } from '../context/ThemeContext';

export default function Settings() {
  const { user, setUser } = useAuth();
  const { theme, toggle } = useTheme();
  const [name, setName] = useState(user?.name || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const result = await api('/auth/profile', {
        method: 'PATCH',
        body: { name: name.trim() },
      });
      setUser({ ...user, ...result.user });
      setMessage('Profile updated successfully.');
    } catch (requestError) {
      setError(requestError.message || 'Unable to update your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade-in space-y-6">
      <div className="max-w-2xl">
        <div className="mb-1 text-xs font-bold uppercase tracking-[.14em] text-indigo-500">
          Personalize your space
        </div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your profile, appearance and account information.
        </p>
      </div>

      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <form onSubmit={save} className="surface soft-shadow flex h-full flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
              <UserRound size={19} />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-slate-900 dark:text-white">Profile</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Your account details</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="profile-name">Full name</label>
              <input
                id="profile-name"
                className="field"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={80}
                autoComplete="name"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="profile-email">Email address</label>
              <input
                id="profile-email"
                className="field"
                value={user?.email || ''}
                disabled
                readOnly
              />
              <p className="mt-1.5 text-xs leading-5 text-slate-400">
                Your email address is used to sign in and cannot be changed here.
              </p>
            </div>
          </div>

          <div className="mt-auto space-y-3">
            {message && (
              <p role="status" className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-300">
                <Check size={16} /> {message}
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={saving || name.trim().length < 2 || name.trim() === (user?.name || '')}
              className="btn-primary w-full sm:w-auto"
            >
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>

        <section className="surface soft-shadow flex h-full flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
              {theme === 'dark' ? <Moon size={19} /> : <Sun size={19} />}
            </div>
            <div>
              <h2 className="font-display font-extrabold text-slate-900 dark:text-white">Appearance</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose a comfortable workspace theme.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60 sm:flex-row sm:items-center">
            <div>
              <div className="theme-status-text text-sm font-bold text-slate-800 dark:text-slate-100">
                {theme === 'dark' ? 'Dark mode is on' : 'Light mode is on'}
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                The whole workspace follows this setting.
              </p>
            </div>
            <button type="button" onClick={toggle} className="btn-ghost w-full shrink-0 sm:w-auto">
              Switch to {theme === 'dark' ? 'light' : 'dark'}
            </button>
          </div>

          <div className="mt-auto rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
            <p className="text-sm font-semibold text-indigo-950 dark:text-indigo-100">
              A workspace that feels comfortable
            </p>
            <p className="mt-1 text-xs leading-5 text-indigo-800/80 dark:text-indigo-200/75">
              Your selected appearance is saved on this device and is applied across StudyFlow.
            </p>
          </div>
        </section>

        <section className="surface soft-shadow p-5 sm:col-span-2 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
              <ShieldCheck size={19} />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-extrabold text-slate-900 dark:text-white">
                Account security
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Your password is stored as a bcrypt hash. Authentication uses a signed HTTP-only cookie.
              </p>
              <p className="mt-3 rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                For production use, configure HTTPS and connect the password-reset flow to a real email provider.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
