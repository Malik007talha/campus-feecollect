import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Wallet, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { paymentService } from '../../services/paymentService';
import { getErrorMessage } from '../../services/api';
import useDebounce from '../../hooks/useDebounce';
import { formatRs, formatDate } from '../../utils/format';
import { monthLabel, isOverdue } from '../../utils/dates';
import EmptyState from '../common/EmptyState';
import VoucherStatusBadge from '../vouchers/VoucherStatusBadge';

function OverdueBadge({ voucher }) {
  if (!isOverdue(voucher.dueDate)) return null;
  return <span className="ms-2 rounded-full bg-danger-50 px-2 py-0.5 text-xs font-medium text-danger-600">Overdue</span>;
}

export default function OutstandingVouchersPanel({ onPay, reloadKey }) {
  const { t } = useLanguage();
  const [q, setQ] = useState('');
  const [state, setState] = useState({ loading: true, error: '', items: [], total: 0 });
  const debounced = useDebounce(q);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const data = await paymentService.search(debounced);
      setState({ loading: false, error: '', items: data.items, total: data.total });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: getErrorMessage(err) }));
    }
  }, [debounced]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const { loading, error, items, total } = state;

  const payButton = (v) => (
    <button
      onClick={() => onPay(v)}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-primary-700 px-3 text-sm font-semibold text-white hover:bg-primary-600"
    >
      <Wallet className="h-4 w-4" /> {t('recordPayment')}
    </button>
  );

  return (
    <div>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by student name, roll number, voucher number, parent name or phone"
          aria-label={t('search')}
          autoFocus
          className="block min-h-11 w-full rounded-md border border-line bg-white py-2.5 ps-10 pe-3 text-base focus:border-primary-600 focus:outline-none"
        />
      </div>

      {!loading && !error && items.length > 0 && (
        <p className="mb-2 text-sm text-muted">
          {q.trim() ? `${total} unpaid ${total === 1 ? 'voucher' : 'vouchers'} found.` : 'Oldest unpaid vouchers first.'}
          {total > items.length && ` Showing ${items.length} of ${total}. Type a name to narrow it down.`}
        </p>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-white py-12 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" /> Looking for unpaid vouchers…
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
          icon={Wallet}
          title={q.trim() ? 'No unpaid vouchers match your search' : 'No unpaid vouchers'}
          message={
            q.trim()
              ? 'Check the spelling, or try the roll number or voucher number. A student whose voucher is fully paid does not appear here.'
              : 'Every voucher is paid, or no vouchers have been generated yet.'
          }
          action={
            !q.trim() && (
              <Link
                to="/vouchers"
                className="inline-flex min-h-11 items-center rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600"
              >
                Go to Fee Vouchers
              </Link>
            )
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
                  <th className="px-4 py-3 text-start font-semibold">Student</th>
                  <th className="px-4 py-3 text-start font-semibold">Class</th>
                  <th className="px-4 py-3 text-start font-semibold">Voucher</th>
                  <th className="px-4 py-3 text-start font-semibold">Due date</th>
                  <th className="px-4 py-3 text-start font-semibold">Late fine</th>
                  <th className="px-4 py-3 text-start font-semibold">Balance</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((v) => (
                  <tr key={v._id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{v.studentName}</p>
                      <p className="text-sm text-muted">Roll {v.rollNo}</p>
                    </td>
                    <td className="px-4 py-3">
                      {v.className} – {v.section}
                    </td>
                    <td className="px-4 py-3">
                      <p>{v.voucherNo}</p>
                      <p className="text-sm text-muted">{monthLabel(v.month)}</p>
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(v.dueDate)}
                      <OverdueBadge voucher={v} />
                    </td>
                    <td className="px-4 py-3">{v.fine > 0 ? formatRs(v.fine) : '—'}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{formatRs(v.total - v.paid)}</p>
                      {v.paid > 0 && <p className="text-sm text-muted">{formatRs(v.paid)} paid</p>}
                    </td>
                    <td className="px-4 py-2">{payButton(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones: cards */}
          <ul className="space-y-3 md:hidden">
            {items.map((v) => (
              <li key={v._id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-navy-900">{v.studentName}</p>
                    <p className="text-muted">
                      {v.className} – {v.section} · Roll {v.rollNo}
                    </p>
                  </div>
                  <VoucherStatusBadge status={v.status} />
                </div>
                <p className="mt-1 text-sm text-muted">
                  {v.voucherNo} · {monthLabel(v.month)}
                </p>
                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted">Due date</dt>
                    <dd>
                      {formatDate(v.dueDate)}
                      <OverdueBadge voucher={v} />
                    </dd>
                  </div>
                  {v.fine > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-muted">Late fine</dt>
                      <dd>{formatRs(v.fine)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold">
                    <dt>Balance</dt>
                    <dd>{formatRs(v.total - v.paid)}</dd>
                  </div>
                </dl>
                <div className="mt-3 border-t border-line pt-2">{payButton(v)}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}