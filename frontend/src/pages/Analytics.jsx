import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  BarChart3,
  Clock3,
  CheckCircle2,
  ClipboardCheck,
  RefreshCw,
} from 'lucide-react';
import { api } from '../lib/api';
import { useTheme } from '../context/ThemeContext';

const COLORS = ['#818cf8', '#38bdf8', '#fbbf24', '#34d399', '#fb7185', '#c084fc'];

function MetricCard({ label, value, detail, Icon }) {
  return (
    <div className="surface soft-shadow flex min-h-[142px] items-start justify-between gap-4 p-5 sm:p-6">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</div>
        <div className="mt-3 font-display text-3xl font-extrabold text-slate-900 dark:text-white">{value}</div>
        <div className="mt-1 text-xs leading-5 text-slate-400">{detail}</div>
      </div>
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
        <Icon size={19} />
      </div>
    </div>
  );
}

function ChartEmptyState({ title, description }) {
  return (
    <div className="analytics-empty-state flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-8 text-center dark:border-slate-700 dark:bg-slate-900/60">
      <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-white text-indigo-500 shadow-sm dark:bg-slate-800 dark:text-indigo-300">
        <BarChart3 size={21} />
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api('/analytics');
      setData(result.data || {});
    } catch (requestError) {
      setError(requestError.message || 'Unable to load analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const chartData = useMemo(() => (
    (data?.byDay || []).map((item) => ({
      ...item,
      label: item.day
        ? new Date(item.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : '',
    }))
  ), [data]);

  if (loading && !data) {
    return (
      <div className="surface grid min-h-64 place-items-center text-sm text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <RefreshCw size={16} className="animate-spin" /> Loading your progress…
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="surface flex min-h-64 flex-col items-center justify-center p-6 text-center">
        <h1 className="font-display text-xl font-extrabold text-slate-900 dark:text-white">Analytics unavailable</h1>
        <p role="alert" className="mt-2 text-sm text-rose-600 dark:text-rose-300">{error}</p>
        <button type="button" onClick={loadAnalytics} className="btn-primary mt-5">
          <RefreshCw size={15} /> Try again
        </button>
      </div>
    );
  }

  const totalMinutes = Number(data?.total?.total_minutes || 0);
  const completedSessions = Number(data?.total?.sessions || 0);
  const assignmentTotal = Number(data?.assignments?.total || 0);
  const assignmentCompleted = Number(data?.assignments?.completed || 0);
  const assignmentRate = assignmentTotal
    ? Math.round((assignmentCompleted / assignmentTotal) * 100)
    : 0;
  const totalHours = (totalMinutes / 60).toFixed(1);
  const subjectData = (data?.bySubject || []).filter((item) => Number(item.minutes) > 0);

  const axisColor = dark ? '#a8b5c9' : '#64748b';
  const gridColor = dark ? '#334155' : '#e2e8f0';

  return (
    <div className="fade-in space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 text-xs font-bold uppercase tracking-[.14em] text-indigo-500">
            Your learning overview
          </div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
            Your progress, in perspective.
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Insights calculated from your completed study sessions and assignments.
          </p>
        </div>

        <button type="button" onClick={loadAnalytics} disabled={loading} className="btn-ghost text-xs">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <MetricCard
          label="Total focus hours"
          value={`${totalHours}h`}
          detail={`${totalMinutes} minutes recorded`}
          Icon={Clock3}
        />
        <MetricCard
          label="Completed sessions"
          value={completedSessions}
          detail="Focus sessions completed"
          Icon={CheckCircle2}
        />
        <MetricCard
          label="Assignment completion"
          value={`${assignmentRate}%`}
          detail={`${assignmentCompleted} of ${assignmentTotal} completed`}
          Icon={ClipboardCheck}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface soft-shadow min-w-0 p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="font-display text-lg font-extrabold text-slate-900 dark:text-white">
              Daily study time
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Last 30 days · minutes
            </p>
          </div>

          <div className="h-[280px] min-w-0">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: axisColor }}
                    axisLine={{ stroke: gridColor }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: axisColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: dark ? '#172337' : '#ffffff',
                      border: `1px solid ${gridColor}`,
                      borderRadius: 12,
                      color: dark ? '#e2e8f0' : '#172033',
                      boxShadow: '0 10px 30px rgba(0,0,0,.12)',
                    }}
                    labelStyle={{ color: dark ? '#e2e8f0' : '#172033', fontWeight: 700 }}
                    cursor={{ fill: dark ? 'rgba(148,163,184,.08)' : 'rgba(99,102,241,.06)' }}
                  />
                  <Bar
                    dataKey="minutes"
                    name="Study minutes"
                    fill="#818cf8"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmptyState
                title="Your study trend will appear here"
                description="Complete a study session to start building your daily focus history."
              />
            )}
          </div>
        </section>

        <section className="surface soft-shadow min-w-0 p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="font-display text-lg font-extrabold text-slate-900 dark:text-white">
              Study distribution
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Completed minutes by subject
            </p>
          </div>

          <div className="h-[280px] min-w-0">
            {subjectData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subjectData}
                    dataKey="minutes"
                    nameKey="name"
                    innerRadius={64}
                    outerRadius={100}
                    paddingAngle={3}
                  >
                    {subjectData.map((item, index) => (
                      <Cell
                        key={item.name}
                        fill={COLORS[index % COLORS.length]}
                        stroke={dark ? '#141d2e' : '#ffffff'}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: dark ? '#172337' : '#ffffff',
                      border: `1px solid ${gridColor}`,
                      borderRadius: 12,
                      color: dark ? '#e2e8f0' : '#172033',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmptyState
                title="No subject data yet"
                description="Add subjects and complete study sessions to see how your time is distributed."
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
