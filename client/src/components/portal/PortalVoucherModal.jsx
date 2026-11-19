import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import VoucherStatusBadge from '../vouchers/VoucherStatusBadge';
import PortalFileButtons from './PortalFileButtons';
import { useLanguage } from '../../context/LanguageContext';
import { portalService } from '../../services/portalService';
import { getErrorMessage } from '../../services/api';
import { formatRs, formatDate } from '../../utils/format';
import { monthLabel } from '../../utils/dates';
import { METHOD_LABELS } from '../../constants/payments';

function Line({ label, children, strong }) {
  return (
    <div className={`flex justify-between gap-4 py-1.5 ${strong ? 'font-semibold' : ''}`}>
      <dt className={strong ? '' : 'text-muted'}>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default function PortalVoucherModal({ voucherId, onClose }) {
  const { t } = useLanguage();
  const [state, setState] = useState({ loading: true, error: '', data: null });

  useEffect(() => {
    portalService
      .voucher(voucherId)
      .then((data) => setState({ loading: false, error: '', data }))
      .catch((err) => setState({ loading: false, error: getErrorMessage(err), data: null }));
  }, [voucherId]);

  const { loading, error, data } = state;
  const v = data?.voucher;
  const subtotal = v ? v.items.reduce((sum, i) => sum + i.amount, 0) : 0;

  return (
    <Modal
      title={v ? `Voucher ${v.voucherNo}` : 'Fee voucher'}
      onClose={onClose}
      footer={
        <div className="flex w-full flex-wrap items-center gap-2 sm:justify-end">
          {v && <PortalFileButtons path={`/portal/vouchers/${v._id}/pdf`} fileName={`fee-voucher-${v.voucherNo}`} />}
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-md border border-line bg-white px-4 text-base font-medium hover:bg-page"
          >
            {t('close')}
          </button>
        </div>
      }
    >
      {loading && (
        <div className="flex items-center justify-center gap-2 py-10 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-md bg-danger-50 p-3 text-danger-600">
          {error}
        </div>
      )}

      {v && (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-navy-900">{monthLabel(v.month)}</h3>
              <p className="text-muted">Due date: {formatDate(v.dueDate)}</p>
            </div>
            <VoucherStatusBadge status={v.status} />
          </div>

          <h4 className="mt-4 text-sm font-semibold uppercase tracking-wide text-navy-800">Fee breakdown</h4>
          <dl className="mt-1 divide-y divide-line">
            {v.items.map((item) => (
              <Line key={item.head} label={item.head}>
                {formatRs(item.amount)}
              </Line>
            ))}
            <Line label="Total fees">{formatRs(subtotal)}</Line>
            {v.discount > 0 && <Line label="Discount">− {formatRs(v.discount)}</Line>}
            {v.fine > 0 && <Line label="Late fine">+ {formatRs(v.fine)}</Line>}
            <Line label="Total payable" strong>
              {formatRs(v.total)}
            </Line>
            <Line label="Amount paid">{formatRs(v.paid)}</Line>
            <Line label="Balance to pay" strong>
              {formatRs(v.total - v.paid)}
            </Line>
          </dl>

          {data.payments.length > 0 && (
            <>
              <h4 className="mt-4 text-sm font-semibold uppercase tracking-wide text-navy-800">Payments received</h4>
              <ul className="mt-1 divide-y divide-line">
                {data.payments.map((p) => (
                  <li key={p._id} className="py-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="font-semibold">{formatRs(p.amount)}</span>
                      <span className="text-muted">
                        {formatDate(p.date)} · {METHOD_LABELS[p.method] ?? p.method}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-muted">{p.receiptNo}</span>
                      <div className="flex">
                        <PortalFileButtons
                          path={`/portal/payments/${p._id}/receipt`}
                          fileName={`receipt-${p.receiptNo}`}
                          downloadLabel="Receipt"
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </Modal>
  );
}