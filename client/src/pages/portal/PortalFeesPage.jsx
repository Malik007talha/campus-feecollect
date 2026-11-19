import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, FileText, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { portalService } from '../../services/portalService';
import { getErrorMessage } from '../../services/api';
import { formatRs, formatDate } from '../../utils/format';
import { monthLabel, isOverdue } from '../../utils/dates';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import VoucherStatusBadge from '../../components/vouchers/VoucherStatusBadge';
import PortalFileButtons from '../../components/portal/PortalFileButtons';
import PortalVoucherModal from '../../components/portal/PortalVoucherModal';

const FILTERS = [
  ['all', 'All'],
  ['unpaid', 'Unpaid'],
  ['paid', 'Paid'],
];

function Stat({ label, value, tone = 'text-ink' }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

export default function PortalFeesPage() {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: '', items: [], summary: null });
  const [filter, setFilter] = useState('all');
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const data = await portalService.vouchers();
      setState({ loading: false, error: '', items: data.items, summary: data.summary });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: getErrorMessage(err) }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { loading, error, items, summary } = state;
  const shown = useMemo(() => {
    if (filter === 'paid') return items.filter((v) => v.status === 'paid');
    if (filter === 'unpaid') return items.filter((v) => v.status !== 'paid');
    return items;
  }, [items, filter]);

  return (
    <div>
      <PageHeader title={`Hello, ${user.name}`} subtitle="Your fee vouchers. You can see whether each one is paid or unpaid, and download it." />

      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-white py-12 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading your fees…
        </div>
      )}

      {!loading && error && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-md bg-danger-50 p-4 text-danger-600">
          <p>{error}</p>
          <button onClick={load} className="min-h-10 rounded-md border border-danger-600 px-4 text-sm font-medium">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No fee vouchers yet"
          message="When the school generates your fee voucher, it will appear here."
        />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          {summary.pending > 0 ? (
            <div
              className={`mb-4 flex items-start gap-3 rounded-lg border p-4 ${
                summary.overdueCount > 0
                  ? 'border-danger-600/30 bg-danger-50 text-danger-600'
                  : 'border-warning-600/30 bg-warning-50 text-warning-600'
              }`}
            >
              <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" />
              <div>
                <p className="text-lg font-semibold">You have {formatRs(summary.pending)} to pay</p>
                <p className="text-sm">
                  {summary.overdueCount > 0
                    ? `${summary.overdueCount} ${summary.overdueCount === 1 ? 'voucher is' : 'vouchers are'} past the due date. A late fine may apply.`
                    : 'Please pay before the due date to avoid a late fine.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-success-600/30 bg-success-50 p-4 text-success-600">
              <CheckCircle2 className="h-6 w-6" />
              <p className="text-lg font-semibold">All your fees are paid. Thank you!</p>
            </div>
          )}

          <div className="mb-4 grid grid-cols-3 gap-3">
            <Stat label="To pay" value={formatRs(summary.pending)} tone={summary.pending > 0 ? 'text-danger-600' : 'text-success-600'} />
            <Stat label="Unpaid vouchers" value={summary.unpaidCount} />
            <Stat label="Paid vouchers" value={summary.paidCount} tone="text-success-600" />
          </div>

          <div role="tablist" className="mb-4 flex gap-1 border-b border-line">
            {FILTERS.map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={filter === id}
                onClick={() => setFilter(id)}
                className={`min-h-11 border-b-2 px-4 text-base font-medium ${
                  filter === id ? 'border-primary-700 text-primary-700' : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-muted">Nothing to show here.</p>
          ) : (
            <ul className="space-y-3">
              {shown.map((v) => {
                const balance = v.total - v.paid;
                const late = balance > 0 && isOverdue(v.dueDate);
                return (
                  <li key={v._id} className="rounded-lg border border-line bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-navy-900">{monthLabel(v.month)}</p>
                        <p className="text-sm text-muted">{v.voucherNo}</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {late && (
                          <span className="rounded-full bg-danger-50 px-2.5 py-0.5 text-sm font-medium text-danger-600">Overdue</span>
                        )}
                        <VoucherStatusBadge status={v.status} />
                      </div>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                      <div>
                        <dt className="text-muted">Due date</dt>
                        <dd className="font-medium">{formatDate(v.dueDate)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Total</dt>
                        <dd className="font-medium">{formatRs(v.total)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Paid</dt>
                        <dd className="font-medium">{formatRs(v.paid)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Balance</dt>
                        <dd className={`font-bold ${balance > 0 ? 'text-danger-600' : 'text-success-600'}`}>{formatRs(balance)}</dd>
                      </div>
                    </dl>
                    {v.fine > 0 && <p className="mt-1 text-sm text-warning-600">Includes a late fine of {formatRs(v.fine)}</p>}

                    <div className="mt-3 flex flex-wrap gap-1 border-t border-line pt-2">
                      <button
                        onClick={() => setViewing(v._id)}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-primary-700 hover:bg-page"
                      >
                        <Eye className="h-4 w-4" /> Details
                      </button>
                      <PortalFileButtons path={`/portal/vouchers/${v._id}/pdf`} fileName={`fee-voucher-${v.voucherNo}`} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {viewing && <PortalVoucherModal voucherId={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}