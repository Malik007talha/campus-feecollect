import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Percent } from 'lucide-react';
import { feeService } from '../../services/feeService';
import { getErrorMessage } from '../../services/api';
import { formatRs } from '../../utils/format';
import { DISCOUNT_LABELS } from '../../constants/students';
import EmptyState from '../common/EmptyState';

export default function DiscountsPanel() {
  const [state, setState] = useState({ loading: true, error: '', data: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const data = await feeService.discounts();
      setState({ loading: false, error: '', data });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: getErrorMessage(err) }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { loading, error, data } = state;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-white py-12 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading discounts…
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-md bg-danger-50 p-4 text-danger-600">
        <p>{error}</p>
        <button onClick={load} className="min-h-10 rounded-md border border-danger-600 px-4 text-sm font-medium">
          Try again
        </button>
      </div>
    );
  }

  if (data.rows.length === 0) {
    return (
      <EmptyState
        icon={Percent}
        title="No student discounts yet"
        message="A student gets a discount when you choose sibling or scholarship and a percentage on the student's form."
        action={
          <Link
            to="/students"
            className="inline-flex min-h-11 items-center rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600"
          >
            Go to Students
          </Link>
        }
      />
    );
  }

  const feesMissing = (r) => !r.hasFees;

  return (
    <div>
      <p className="mb-3 text-muted">
        <strong className="text-ink">{data.totals.students}</strong>{' '}
        {data.totals.students === 1 ? 'active student gets' : 'active students get'} a discount, about{' '}
        <strong className="text-ink">{formatRs(data.totals.monthlyDiscount)}</strong> off per month. To change a
        discount, open <Link to="/students" className="font-medium text-primary-700 underline">Students</Link> and press Edit.
      </p>

      <div className="hidden overflow-x-auto rounded-lg border border-line bg-white md:block">
        <table className="w-full text-base">
          <thead className="border-b border-line bg-page text-sm text-muted">
            <tr>
              <th className="px-4 py-3 text-start font-semibold">Student</th>
              <th className="px-4 py-3 text-start font-semibold">Class</th>
              <th className="px-4 py-3 text-start font-semibold">Discount</th>
              <th className="px-4 py-3 text-start font-semibold">Monthly fee</th>
              <th className="px-4 py-3 text-start font-semibold">Discount amount</th>
              <th className="px-4 py-3 text-start font-semibold">Pays per month</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.rows.map((r) => (
              <tr key={r._id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-sm text-muted">Roll {r.rollNo}</p>
                </td>
                <td className="px-4 py-3">{r.className}</td>
                <td className="px-4 py-3">
                  {r.discountPercent}%
                  <span className="block text-sm text-muted">{DISCOUNT_LABELS[r.discountType]}</span>
                </td>
                <td className="px-4 py-3">{feesMissing(r) ? <span className="text-muted">Fees not set</span> : formatRs(r.subtotal)}</td>
                <td className="px-4 py-3">{feesMissing(r) ? '—' : formatRs(r.discount)}</td>
                <td className="px-4 py-3 font-semibold">{feesMissing(r) ? '—' : formatRs(r.payable)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {data.rows.map((r) => (
          <li key={r._id} className="rounded-lg border border-line bg-white p-4">
            <p className="text-lg font-semibold text-navy-900">{r.name}</p>
            <p className="text-muted">
              {r.className} · Roll {r.rollNo}
            </p>
            <p className="mt-1 text-sm">
              {r.discountPercent}% {DISCOUNT_LABELS[r.discountType].toLowerCase()}
            </p>
            {feesMissing(r) ? (
              <p className="mt-2 text-sm text-muted">Fees are not set for this class yet.</p>
            ) : (
              <dl className="mt-2 space-y-1 border-t border-line pt-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Monthly fee</dt>
                  <dd>{formatRs(r.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Discount</dt>
                  <dd>− {formatRs(r.discount)}</dd>
                </div>
                <div className="flex justify-between font-semibold">
                  <dt>Pays per month</dt>
                  <dd>{formatRs(r.payable)}</dd>
                </div>
              </dl>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}