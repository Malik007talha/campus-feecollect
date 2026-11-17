import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Receipt, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { paymentService } from '../../services/paymentService';
import { getErrorMessage } from '../../services/api';
import useDebounce from '../../hooks/useDebounce';
import { formatRs, formatDate } from '../../utils/format';
import { currentMonthKey, todayDateString } from '../../utils/dates';
import { METHOD_LABELS } from '../../constants/payments';
import EmptyState from '../common/EmptyState';
import ReceiptButtons from './ReceiptButtons';

const PAGE_SIZE = 20;
const fieldClass =
  'min-h-11 w-full rounded-md border border-line bg-white px-3 text-base focus:border-primary-600 focus:outline-none';

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-ink">{value}</p>
    </div>
  );
}

export default function PaymentRecordsPanel({ reloadKey }) {
  const { t } = useLanguage();
  const [from, setFrom] = useState(`${currentMonthKey()}-01`);
  const [to, setTo] = useState(todayDateString());
  const [method, setMethod] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: '', items: [], summary: null, pagination: null });
  const debounced = useDebounce(search);

  const params = useMemo(() => {
    const p = {};
    if (from) p.from = from;
    if (to) p.to = to;
    if (method) p.method = method;
    if (debounced) p.search = debounced;
    return p;
  }, [from, to, method, debounced]);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const res = await paymentService.list({ page, limit: PAGE_SIZE, ...params });
      setState({ loading: false, error: '', items: res.data.items, summary: res.data.summary, pagination: res.pagination });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: getErrorMessage(err) }));
    }
  }, [page, params]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const onFilter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const { loading, error, items, summary, pagination } = state;
  const filtersActive = Boolean(debounced || method);

  return (
    <div>
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={search}
            onChange={onFilter(setSearch)}
            placeholder="Search by receipt number, voucher number, student or roll number"
            aria-label={t('search')}
            className="block min-h-11 w-full rounded-md border border-line bg-white py-2.5 ps-10 pe-3 text-base focus:border-primary-600 focus:outline-none"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm font-medium">
            From
            <input type="date" max={todayDateString()} value={from} onChange={onFilter(setFrom)} className={`${fieldClass} mt-1`} />
          </label>
          <label className="block text-sm font-medium">
            To
            <input type="date" max={todayDateString()} value={to} onChange={onFilter(setTo)} className={`${fieldClass} mt-1`} />
          </label>
          <label className="block text-sm font-medium">
            Method
            <select value={method} onChange={onFilter(setMethod)} className={`${fieldClass} mt-1`}>
              <option value="">All methods</option>
              {Object.entries(METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {(from || to) && (
          <button
            type="button"
            onClick={() => {
              setFrom('');
              setTo('');
              setPage(1);
            }}
            className="min-h-10 text-sm font-medium text-primary-700 hover:underline"
          >
            Show payments from all dates
          </button>
        )}
      </div>

      {summary && !error && (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Payments" value={summary.count} />
          <Stat label="Total collected" value={formatRs(summary.total)} />
          {Object.entries(summary.byMethod)
            .slice(0, 2)
            .map(([m, amount]) => (
              <Stat key={m} label={METHOD_LABELS[m] ?? m} value={formatRs(amount)} />
            ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-white py-12 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading payments…
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
          icon={Receipt}
          title={filtersActive ? 'No payments match your search' : 'No payments in this period'}
          message={
            filtersActive
              ? 'Try a different word, or clear the filters.'
              : 'Payments appear here after you record them. Try a wider date range if you expected to see some.'
          }
        />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          {/* Desktop and tablet: table */}
          <div className="hidden overflow-x-auto rounded-lg border border-line bg-white md:block">
            <table className="w-full text-base">
              <thead className="border-b border-line bg-page text-sm text-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">Receipt no.</th>
                  <th className="px-4 py-3 text-start font-semibold">Date</th>
                  <th className="px-4 py-3 text-start font-semibold">Student</th>
                  <th className="px-4 py-3 text-start font-semibold">Voucher</th>
                  <th className="px-4 py-3 text-start font-semibold">Method</th>
                  <th className="px-4 py-3 text-start font-semibold">Amount</th>
                  <th className="px-4 py-3 text-start font-semibold">Received by</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((p) => (
                  <tr key={p._id}>
                    <td className="px-4 py-3 font-medium">{p.receiptNo}</td>
                    <td className="px-4 py-3">{formatDate(p.date)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.studentName}</p>
                      <p className="text-sm text-muted">
                        {p.className} – {p.section} · Roll {p.rollNo}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{p.voucherNo}</p>
                      <p className="text-sm text-muted">{p.balanceAfter === 0 ? 'Fully paid' : `${formatRs(p.balanceAfter)} left`}</p>
                    </td>
                    <td className="px-4 py-3">{METHOD_LABELS[p.method] ?? p.method}</td>
                    <td className="px-4 py-3 font-semibold">{formatRs(p.amount)}</td>
                    <td className="px-4 py-3">{p.receivedByName}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        <ReceiptButtons paymentId={p._id} receiptNo={p.receiptNo} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones: cards */}
          <ul className="space-y-3 md:hidden">
            {items.map((p) => (
              <li key={p._id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-navy-900">{p.studentName}</p>
                    <p className="text-muted">
                      {p.className} – {p.section} · Roll {p.rollNo}
                    </p>
                  </div>
                  <p className="font-bold">{formatRs(p.amount)}</p>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {p.receiptNo} · {formatDate(p.date)} · {METHOD_LABELS[p.method] ?? p.method}
                </p>
                <p className="text-sm text-muted">
                  {p.voucherNo} · {p.balanceAfter === 0 ? 'Fully paid' : `${formatRs(p.balanceAfter)} left`} · by {p.receivedByName}
                </p>
                <div className="mt-3 flex flex-wrap gap-1 border-t border-line pt-2">
                  <ReceiptButtons paymentId={p._id} receiptNo={p.receiptNo} />
                </div>
              </li>
            ))}
          </ul>

          {pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
                className="min-h-11 rounded-md border border-line bg-white px-4 text-sm font-medium hover:bg-page disabled:opacity-50"
              >
                Previous
              </button>
              <p className="text-sm text-muted">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pagination.totalPages}
                className="min-h-11 rounded-md border border-line bg-white px-4 text-sm font-medium hover:bg-page disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}