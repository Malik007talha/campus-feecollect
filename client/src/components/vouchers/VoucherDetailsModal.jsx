import { useCallback, useEffect, useState } from 'react';
import Modal from '../common/Modal';
import VoucherStatusBadge from './VoucherStatusBadge';
import VoucherPdfButtons from './VoucherPdfButtons';
import RecordPaymentModal from '../payments/RecordPaymentModal';
import ReceiptButtons from '../payments/ReceiptButtons';
import { useLanguage } from '../../context/LanguageContext';
import { voucherService } from '../../services/voucherService';
import { paymentService } from '../../services/paymentService';
import { formatRs, formatDate } from '../../utils/format';
import { monthLabel } from '../../utils/dates';
import { formatPkPhone } from '../../utils/phone';
import { METHOD_LABELS } from '../../constants/payments';

function Line({ label, children, strong }) {
  return (
    <div className={`flex justify-between gap-4 py-1.5 ${strong ? 'font-semibold' : ''}`}>
      <dt className={strong ? '' : 'text-muted'}>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default function VoucherDetailsModal({ voucher: initial, onClose, onChanged }) {
  const { t } = useLanguage();
  const [voucher, setVoucher] = useState(initial);
  const [payments, setPayments] = useState([]);
  const [paying, setPaying] = useState(false);

  // Loads the latest voucher (with today's late fine) and its payments.
  const reload = useCallback(async () => {
    try {
      const [fresh, history] = await Promise.all([
        voucherService.get(initial._id),
        paymentService.forVoucher(initial._id),
      ]);
      setVoucher(fresh);
      setPayments(history);
    } catch {
      /* keep showing what we already have */
    }
  }, [initial._id]);

  useEffect(() => {
    reload();
  }, [reload]);

  const subtotal = voucher.items.reduce((sum, i) => sum + i.amount, 0);
  const balance = voucher.total - voucher.paid;

  if (paying) {
    return (
      <RecordPaymentModal
        voucher={voucher}
        onClose={() => setPaying(false)}
        onRecorded={() => {
          reload();
          onChanged?.();
        }}
      />
    );
  }

  return (
    <Modal
      title={`Voucher ${voucher.voucherNo}`}
      onClose={onClose}
      footer={
        <div className="flex w-full flex-wrap items-center gap-2 sm:justify-end">
          <VoucherPdfButtons voucherId={voucher._id} fileName={`fee-voucher-${voucher.voucherNo}`} />
          {balance > 0 && (
            <button
              type="button"
              onClick={() => setPaying(true)}
              className="min-h-11 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600"
            >
              {t('recordPayment')}
            </button>
          )}
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-navy-900">{voucher.studentName}</h3>
          <p className="text-muted">
            {voucher.className} – Section {voucher.section} · Roll {voucher.rollNo}
          </p>
        </div>
        <VoucherStatusBadge status={voucher.status} />
      </div>

      <dl className="mt-3 divide-y divide-line border-y border-line text-sm">
        <Line label="Billing month">{monthLabel(voucher.month)}</Line>
        <Line label="Due date">{formatDate(voucher.dueDate)}</Line>
        <Line label="Parent">
          {voucher.parentName || '—'}
          {voucher.parentPhone && <span className="text-muted"> · {formatPkPhone(voucher.parentPhone)}</span>}
        </Line>
      </dl>

      <h4 className="mt-4 text-sm font-semibold uppercase tracking-wide text-navy-800">Fee breakdown</h4>
      <dl className="mt-1 divide-y divide-line">
        {voucher.items.map((item) => (
          <Line key={item.head} label={item.head}>
            {formatRs(item.amount)}
          </Line>
        ))}
        <Line label="Total fees">{formatRs(subtotal)}</Line>
        {voucher.discount > 0 && <Line label="Discount">− {formatRs(voucher.discount)}</Line>}
        {voucher.fine > 0 && <Line label="Late fine">+ {formatRs(voucher.fine)}</Line>}
        <Line label="Total payable" strong>
          {formatRs(voucher.total)}
        </Line>
        <Line label="Amount paid">{formatRs(voucher.paid)}</Line>
        <Line label="Balance to pay" strong>
          {formatRs(balance)}
        </Line>
      </dl>

      {payments.length > 0 && (
        <>
          <h4 className="mt-4 text-sm font-semibold uppercase tracking-wide text-navy-800">Payments received</h4>
          <ul className="mt-1 divide-y divide-line">
            {payments.map((p) => (
              <li key={p._id} className="py-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="font-semibold">{formatRs(p.amount)}</span>
                  <span className="text-muted">
                    {formatDate(p.date)} · {METHOD_LABELS[p.method] ?? p.method}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted">
                    {p.receiptNo} · received by {p.receivedByName}
                  </span>
                  <div className="flex">
                    <ReceiptButtons paymentId={p._id} receiptNo={p.receiptNo} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}