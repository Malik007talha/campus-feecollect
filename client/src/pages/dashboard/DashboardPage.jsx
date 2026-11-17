import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, FileText, AlertCircle, BarChart3, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { dashboardService } from '../../services/dashboardService';
import { getErrorMessage } from '../../services/api';
import { formatRs, formatDate } from '../../utils/format';
import { currentMonthKey, monthOptions } from '../../utils/dates';
import { METHOD_LABELS } from '../../constants/payments';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/dashboard/StatCard';
import MonthlyReceivedChart from '../../components/dashboard/MonthlyReceivedChart';
import ClassCollectionChart from '../../components/dashboard/ClassCollectionChart';

const MONTH_CHOICES = [...monthOptions(12, 3)].reverse(); // newest first

function Section({ title, children }) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-800">{title}</h2>
      {children}
    </section>
  );
}

function Panel({ title, action, children }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-navy-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [month, setMonth] = useState(currentMonthKey());
  const [state, setState] = useState({ loading: true, error: '', data: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const data = await dashboardService.get(month);
      setState({ loading: false, error: '', data });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: getErrorMessage(err) }));
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const { loading, error, data: d } = state;

  const monthPicker = (
    <label className="block text-sm font-medium">
      <span className="sr-only">Month</span>
      <select
        value={month}
        onChange={(e) => setMonth(e.target.value)}
        aria-label="Choose month"
        className="min-h-11 rounded-md border border-line bg-white px-3 text-base focus:border-primary-600 focus:outline-none"
      >
        {MONTH_CHOICES.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
    </label>
  );

  const quick = [
    ['/payments', Wallet, t('recordPayment'), true],
    ['/vouchers/generate', FileText, t('generateVouchers'), false],
    ['/defaulters', AlertCircle, t('unpaidFees'), false],
    ['/reports', BarChart3, t('reports'), false],
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user.name}`}
        subtitle="Here is how fee collection is going. Pick a month to see its vouchers and payments."
        actions={monthPicker}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {quick.map(([to, Icon, label, primary]) => (
          <Link
            key={to}
            to={to}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-center text-base font-semibold ${
              primary
                ? 'bg-primary-700 text-white hover:bg-primary-600'
                : 'border border-line bg-white text-primary-700 hover:bg-page'
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" /> {label}
          </Link>
        ))}
      </div>

      {loading && !d && (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-line bg-white py-12 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading your dashboard…
        </div>
      )}

      {!loading && error && (
        <div role="alert" className="mt-6 flex flex-col items-start gap-3 rounded-md bg-danger-50 p-4 text-danger-600">
          <p>{error}</p>
          <button onClick={load} className="min-h-10 rounded-md border border-danger-600 px-4 text-sm font-medium">
            Try again
          </button>
        </div>
      )}

      {d && !error && (
        <div className={loading ? 'opacity-60 transition-opacity' : ''}>
          <Section title={`Fees for ${d.period.label}`}>
            {d.billing.vouchers === 0 ? (
              <div className="rounded-lg border border-dashed border-line bg-white p-6 text-center">
                <p className="font-medium">No vouchers have been generated for {d.period.label}.</p>
                <Link
                  to="/vouchers/generate"
                  className="mt-3 inline-flex min-h-11 items-center rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600"
                >
                  {t('generateVouchers')}
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatCard label="Fees billed" value={formatRs(d.billing.billed)} hint={`${d.billing.vouchers} vouchers`} />
                  <StatCard
                    label="Collected"
                    value={formatRs(d.billing.collected)}
                    hint={`${d.billing.rate}% of the fees billed`}
                    tone="text-success-600"
                  />
                  <StatCard
                    label="Pending"
                    value={formatRs(d.billing.pending)}
                    hint="Still to be paid on these vouchers"
                    tone="text-warning-600"
                  />
                  <StatCard
                    label="Money received"
                    value={formatRs(d.received.amount)}
                    hint={`${d.received.count} ${d.received.count === 1 ? 'payment' : 'payments'} recorded in this month`}
                  />
                </div>
                <div
                  className="mt-3 h-3 overflow-hidden rounded-full bg-page"
                  role="progressbar"
                  aria-label="Share of fees collected"
                  aria-valuenow={d.billing.rate}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="h-3 rounded-full bg-success-600" style={{ width: `${Math.min(d.billing.rate, 100)}%` }} />
                </div>
              </>
            )}
          </Section>

          {d.billing.vouchers > 0 && (
            <Section title={`Vouchers for ${d.period.label}`}>
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Paid" value={d.billing.paid} tone="text-success-600" to={`/vouchers?month=${month}`} />
                <StatCard label="Partly paid" value={d.billing.partial} tone="text-warning-600" to={`/vouchers?month=${month}`} />
                <StatCard label="Unpaid" value={d.billing.unpaid} tone="text-danger-600" to={`/vouchers?month=${month}`} />
              </div>
            </Section>
          )}

          <Section title="Whole school">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Active students" value={d.school.students} to="/students" />
              <StatCard label="Class sections" value={d.school.classes} to="/classes" />
              <StatCard
                label="Total outstanding"
                value={formatRs(d.outstanding.amount)}
                hint={`${d.outstanding.vouchers} unpaid vouchers, all months`}
                tone="text-warning-600"
                to="/payments"
              />
              <StatCard
                label="Students with unpaid fees"
                value={d.defaulters.students}
                hint={`${formatRs(d.defaulters.amount)} overdue`}
                tone="text-danger-600"
                to="/defaulters"
              />
            </div>
          </Section>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Panel title="Money received, last 6 months">
              <MonthlyReceivedChart data={d.monthlyReceived} selectedMonth={d.period.month} />
            </Panel>
            <Panel title={`Collected and pending by class, ${d.period.label}`}>
              <ClassCollectionChart data={d.byClass} />
            </Panel>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Panel
              title="Recent payments"
              action={
                <Link to="/payments" className="min-h-10 text-sm font-medium text-primary-700 hover:underline">
                  All payments
                </Link>
              }
            >
              {d.recentPayments.length === 0 ? (
                <p className="py-6 text-center text-muted">No payments have been recorded yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {d.recentPayments.map((p) => (
                    <li key={p._id} className="flex items-start justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.studentName}</p>
                        <p className="text-sm text-muted">
                          {p.className} – {p.section} · {METHOD_LABELS[p.method] ?? p.method} · {formatDate(p.date)}
                        </p>
                      </div>
                      <p className="shrink-0 font-semibold">{formatRs(p.amount)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Coming due"
              action={
                <Link to="/vouchers" className="min-h-10 text-sm font-medium text-primary-700 hover:underline">
                  Fee vouchers
                </Link>
              }
            >
              {d.upcoming.length === 0 ? (
                <p className="py-6 text-center text-muted">No unpaid vouchers have a due date coming up.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {d.upcoming.map((u) => (
                    <li key={u.date} className="flex items-start justify-between gap-3 py-2">
                      <div>
                        <p className="font-medium">{formatDate(`${u.date}T00:00:00+05:00`)}</p>
                        <p className="text-sm text-muted">
                          {u.vouchers} unpaid {u.vouchers === 1 ? 'voucher' : 'vouchers'}
                        </p>
                      </div>
                      <p className="shrink-0 font-semibold">{formatRs(u.amount)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}