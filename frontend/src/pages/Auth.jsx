import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Auth({ mode = 'login' }) {
  const isRegister = mode === 'register';
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const change = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      if (isRegister) {
        await register(form);
      } else {
        await login({ email: form.email, password: form.password });
      }
      navigate('/app', { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Unable to authenticate. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-white dark:bg-[#0c1220] lg:grid-cols-2">
      {/* Brand panel */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[#171d3d] p-10 text-white lg:flex xl:p-14">
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-40 h-[550px] w-[550px] rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-10 right-[-40px] h-[390px] w-[390px] rounded-full border border-white/10" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500">
            <BookOpen size={21} />
          </div>
          <span className="font-display text-xl font-extrabold">studyflow.</span>
        </div>

        <div className="relative z-10 max-w-lg">
          <div className="mb-5 text-xs font-bold uppercase tracking-[.2em] text-indigo-300">
            Make every study hour count
          </div>
          <h1 className="mb-6 font-display text-4xl font-extrabold leading-tight xl:text-5xl">
            Your academic life, <span className="text-indigo-300">organized.</span>
          </h1>
          <p className="mb-8 text-lg leading-8 text-indigo-100/75">
            A calmer way to manage assignments, prepare for exams, and build a study routine that actually works.
          </p>
          {[
            'One clear view of every deadline',
            'A timetable shaped around your availability',
            'Progress you can see and celebrate',
          ].map((item) => (
            <div key={item} className="mb-4 flex items-center gap-3 text-sm text-indigo-100">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-300" />
              {item}
            </div>
          ))}
        </div>

        <div className="relative z-10 text-xs text-indigo-200/60">
          © 2026 StudyFlow · Built for students
        </div>
      </section>

      {/* Authentication panel */}
      <section className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[440px]">
          <div className="mb-10 flex items-center gap-2 font-display text-xl font-extrabold text-slate-900 dark:text-white lg:hidden">
            <BookOpen className="text-indigo-600 dark:text-indigo-400" />
            studyflow.
          </div>

          <div className="mb-3 text-xs font-bold uppercase tracking-[.16em] text-indigo-600 dark:text-indigo-400">
            {isRegister ? 'Get started' : 'Welcome back'}
          </div>
          <h2 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">
            {isRegister ? 'Create your account' : 'Sign in to StudyFlow'}
          </h2>
          <p className="mb-8 mt-2 text-sm text-slate-500 dark:text-slate-400">
            {isRegister ? 'Build a more organized academic life.' : 'Pick up where you left off.'}
          </p>

          <form onSubmit={submit} className="space-y-5">
            {isRegister && (
              <div>
                <label className="label" htmlFor="auth-name">Full name</label>
                <input
                  id="auth-name"
                  className="field"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={change}
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  placeholder="Your name"
                />
              </div>
            )}

            <div>
              <label className="label" htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                className="field"
                type="email"
                name="email"
                value={form.email}
                onChange={change}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="label" htmlFor="auth-password">Password</label>
              <div className="relative">
                <input
                  id="auth-password"
                  className="field pr-12"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={change}
                  required
                  minLength={8}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                {error}
              </div>
            )}

            {!isRegister && (
              <div className="-mt-2 text-right">
                <Link className="text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-300" to="/forgot-password">
                  Forgot password?
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
              <ArrowRight size={17} />
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-slate-500 dark:text-slate-400">
            {isRegister ? 'Already have an account?' : 'New to StudyFlow?'}{' '}
            <Link
              className="font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-300"
              to={isRegister ? '/login' : '/register'}
            >
              {isRegister ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
