import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, KeyRound, Mail } from 'lucide-react';
import { api } from '../lib/api';

export default function PasswordReset({ reset = false }) {
  const [params] = useSearchParams();
  const tokenFromUrl = params.get('token') || '';
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [developmentResetUrl, setDevelopmentResetUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    setDevelopmentResetUrl('');

    try {
      if (reset) {
        await api('/auth/reset-password', {
          method: 'POST',
          body: { token: token.trim(), password },
        });
        setMessage('Your password has been changed. You can now sign in.');
        setPassword('');
      } else {
        const result = await api('/auth/forgot-password', {
          method: 'POST',
          body: { email: email.trim() },
        });
        setMessage(result.developmentToken
          ? 'Local development reset link created. This link is not emailed.'
          : result.message || 'If an account exists, reset instructions will be sent.');
        if (result.developmentToken) {
          const url = new URL('/reset-password', window.location.origin);
          url.searchParams.set('token', result.developmentToken);
          setDevelopmentResetUrl(url.toString());
        }
      }
    } catch (requestError) {
      setError(requestError.message || 'The request could not be completed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f8fc] p-5 dark:bg-[#0c1220]">
      <section className="surface w-full max-w-md p-6 shadow-xl shadow-slate-900/5 sm:p-8">
        <div className="mb-8 flex items-center gap-2 font-display text-xl font-extrabold text-slate-900 dark:text-white">
          <BookOpen className="text-indigo-600" /> studyflow.
        </div>

        <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
          {reset ? <KeyRound size={20} /> : <Mail size={20} />}
        </div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
          {reset ? 'Set a new password' : 'Reset your password'}
        </h1>
        <p className="mb-6 mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {reset
            ? 'Choose a new password with at least 8 characters.'
            : 'Enter your account email. If it matches an account, we will send a one-time reset link.'}
        </p>

        <form onSubmit={submit} className="space-y-4">
          {reset ? (
            <>
              {!tokenFromUrl && (
                <div>
                  <label className="label" htmlFor="reset-token">Reset token</label>
                  <input
                    id="reset-token"
                    className="field"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    autoComplete="one-time-code"
                    required
                  />
                </div>
              )}
              {tokenFromUrl && (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                  Secure reset link detected. It can be used once and expires after 30 minutes.
                </p>
              )}
              <div>
                <label className="label" htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  type="password"
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  className="field"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  required
                />
              </div>
            </>
          ) : (
            <div>
              <label className="label" htmlFor="reset-email">Email address</label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                className="field"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={busy || (reset && (!token.trim() || password.length < 8))}
            className="btn-primary flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Please wait…' : reset ? 'Update password' : 'Send reset link'}
            <ArrowRight size={16} />
          </button>
        </form>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </p>
        )}

        {message && (
          <div role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
            <CheckCircle2 size={15} className="mr-1 inline" /> {message}
            {developmentResetUrl && (
              <Link
                className="mt-3 block break-all font-bold underline underline-offset-2"
                to={developmentResetUrl.replace(window.location.origin, '')}
              >
                Open local development reset link
              </Link>
            )}
            {reset && (
              <Link className="mt-3 block font-bold underline underline-offset-2" to="/login">
                Continue to sign in
              </Link>
            )}
          </div>
        )}

        <Link className="mt-6 block text-center text-sm font-bold text-indigo-600 hover:text-indigo-500" to="/login">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
