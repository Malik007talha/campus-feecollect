import { useCallback, useEffect, useState } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { reminderService } from '../../services/reminderService';
import { getErrorMessage } from '../../services/api';
import { formatDateTime } from '../../utils/format';
import EmptyState from '../common/EmptyState';

const PAGE_SIZE = 20;

const STATUS = {
  sent: ['Sent', 'bg-success-50 text-success-600'],
  logged: ['Test mode (not sent)', 'bg-warning-50 text-warning-600'],
  failed: ['Failed', 'bg-danger-50 text-danger-600'],
};

function StatusBadge({ status }) {
  const [label, style] = STATUS[status] ?? [status, 'bg-page text-muted'];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-medium ${style}`}>{label}</span>;
}

const channelText = (c) => (c === 'sms' ? 'SMS' : 'Email');

export default function ReminderHistoryPanel({ reloadKey }) {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: '', items: [], pagination: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const params = { page, limit: PAGE_SIZE };
      if (status) params.status = status;
      const res = await reminderService.list(params);
      setState({ loading: false, error: '', items: res.data, pagination: res.pagination });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: getErrorMessage(err) }));
    }
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const { loading, error, items, pagination } = state;

  return (
    <div>
      <div className="mb-4 max-w-xs">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by result"
          className="min-h-11 w-full rounded-md border border-line bg-white px-3 text-base focus:border-primary-600 focus:outline-none"
        >
          <option value="">All results</option>
          <option value="sent">Sent</option>
          <option value="logged">Test mode (not sent)</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-white py-12 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading reminders…
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
          icon={MessageSquare}
          title={status ? 'No reminders with this result' : 'No reminders yet'}
          message="Reminders appear here after you send them from the Unpaid fees tab."
        />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-line bg-white md:block">
            <table className="w-full text-base">
              <thead className="border-b border-line bg-page text-sm text-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">Date and time</th>
                  <th className="px-4 py-3 text-start font-semibold">Student</th>
                  <th className="px-4 py-3 text-start font-semibold">Voucher</th>
                  <th className="px-4 py-3 text-start font-semibold">How</th>
                  <th className="px-4 py-3 text-start font-semibold">Sent to</th>
                  <th className="px-4 py-3 text-start font-semibold">Result</th>
                  <th className="px-4 py-3 text-start font-semibold">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((r) => (
                  <tr key={r._id}>
                    <td className="px-4 py-3">{formatDateTime(r.createdAt)}</td>
                    <td className="px-4 py-3 font-medium">{r.studentName}</td>
                    <td className="px-4 py-3">{r.voucherNo}</td>
                    <td className="px-4 py-3">{channelText(r.channel)}</td>
                    <td className="px-4 py-3">{r.to}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                      {r.error && <p className="mt-1 max-w-xs text-sm text-danger-600">{r.error}</p>}
                    </td>
                    <td className="px-4 py-3">{r.sentByName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {items.map((r) => (
              <li key={r._id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-lg font-semibold text-navy-900">{r.studentName}</p>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-sm text-muted">
                  {r.voucherNo} · {channelText(r.channel)} to {r.to}
                </p>
                <p className="text-sm text-muted">
                  {formatDateTime(r.createdAt)} · by {r.sentByName}
                </p>
                {r.error && <p className="mt-1 text-sm text-danger-600">{r.error}</p>}
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