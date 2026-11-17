import Modal from '../common/Modal';
import VoucherStatusBadge from './VoucherStatusBadge';
import VoucherPdfButtons from './VoucherPdfButtons';
import { useLanguage } from '../../context/LanguageContext';
import { formatRs, formatDate } from '../../utils/format';
import { monthLabel } from '../../utils/dates';
import { formatPkPhone } from '../../utils/phone';

function Line({ label, children, strong }) {
  return (
    <div className={`flex justify-between gap-4 py-1.5 ${strong ? 'font-semibold' : ''}`}>
      <dt className={strong ? '' : 'text-muted'}>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default function VoucherDetailsModal({ voucher, onClose }) {
  const { t } = useLanguage();
  const subtotal = voucher.items.reduce((sum, i) => sum + i.amount, 0);
  const balance = voucher.total - voucher.paid;

  return (
    <Modal
      title={`Voucher ${voucher.voucherNo}`}
      onClose={onClose}
      footer={
        <div className="flex w-full flex-wrap items-center gap-2 sm:justify-end">
          <VoucherPdfButtons voucherId={voucher._id} fileName={`fee-voucher-${voucher.voucherNo}`} />
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
    </Modal>
  );
}