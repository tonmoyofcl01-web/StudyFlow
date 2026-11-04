import { useState } from 'react';
import {
  Check,
  Eye,
  EyeOff,
  Moon,
  Sun,
  ShieldCheck,
  UserRound,
  LockKeyhole,
  MailCheck,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { useTheme } from '../context/ThemeContext';

function PasswordField({
  id,
  label,
  name,
  value,
  onChange,
  autoComplete,
  placeholder,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className="field pr-12"
          type={visible ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

const initialPasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export default function Settings() {
  const { user, setUser } = useAuth();
  const { theme, toggle } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

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

  const updatePasswordField = (event) => {
    const { name: fieldName, value } = event.target;
    setPasswordForm((current) => ({ ...current, [fieldName]: value }));
    setPasswordMessage('');
    setPasswordError('');
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordMessage('');
    setPasswordError('');

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Your new password must contain at least 8 characters.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('The new password and confirmation do not match.');
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError('Choose a new password that is different from your current password.');
      return;
    }

    setChangingPassword(true);

    try {
      const result = await api('/auth/change-password', {
        method: 'PATCH',
        body: {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
      });

      setPasswordForm(initialPasswordForm);
      setPasswordMessage(result.message || 'Your password has been changed successfully.');
    } catch (requestError) {
      setPasswordError(requestError.message || 'Unable to change your password.');
    } finally {
      setChangingPassword(false);
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
          Manage your profile, password, appearance and account security.
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

        {/* Change password */}
        <form onSubmit={changePassword} className="surface soft-shadow space-y-5 p-5 lg:col-span-2 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
              <KeyRound size={19} />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-slate-900 dark:text-white">
                Change password
              </h2>
              <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                Confirm your current password, then choose a new password for your account.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <PasswordField
              id="current-password"
              label="Current password"
              name="currentPassword"
              value={passwordForm.currentPassword}
              onChange={updatePasswordField}
              autoComplete="current-password"
              placeholder="Enter your current password"
            />
            <PasswordField
              id="new-password"
              label="New password"
              name="newPassword"
              value={passwordForm.newPassword}
              onChange={updatePasswordField}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
            <div className="md:col-span-2 md:w-1/2">
              <PasswordField
                id="confirm-password"
                label="Confirm new password"
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={updatePasswordField}
                autoComplete="new-password"
                placeholder="Enter your new password again"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0" aria-live="polite">
              {passwordMessage && (
                <p role="status" className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-300">
                  <Check size={16} className="shrink-0" /> {passwordMessage}
                </p>
              )}
              {passwordError && (
                <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">
                  {passwordError}
                </p>
              )}
              {!passwordMessage && !passwordError && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Use at least 8 characters. Your current password is required.
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={changingPassword || !passwordForm.currentPassword || passwordForm.newPassword.length < 8 || !passwordForm.confirmPassword}
              className="btn-primary w-full shrink-0 sm:w-auto"
            >
              {changingPassword ? 'Updating password…' : 'Update password'}
            </button>
          </div>
        </form>

        <section className="surface soft-shadow p-5 lg:col-span-2 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
              <ShieldCheck size={19} />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-extrabold text-slate-900 dark:text-white">
                Account security
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Passwords are hashed with bcrypt. Sign-in uses an HTTP-only session cookie, and password-reset tokens are stored as SHA-256 hashes, expire after 30 minutes, and work once.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/60">
                  <LockKeyhole size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-300" />
                  <span className="text-xs leading-5 text-slate-600 dark:text-slate-300">Production enforces HTTPS, secure cookies, HSTS and a strong JWT secret.</span>
                </div>
                <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/60">
                  <MailCheck size={16} className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-300" />
                  <span className="text-xs leading-5 text-slate-600 dark:text-slate-300">Production password-reset links are delivered through your configured SMTP provider.</span>
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Local development can use a development-only reset token. Never deploy with development settings or expose that token workflow publicly.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
