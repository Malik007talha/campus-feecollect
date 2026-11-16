import { VOUCHER_STATUS_LABELS } from '../../constants/vouchers';

const styles = {
  unpaid: 'bg-danger-50 text-danger-600',
  partial: 'bg-warning-50 text-warning-600',
  paid: 'bg-success-50 text-success-600',
};

export default function VoucherStatusBadge({ status }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-medium ${styles[status] || styles.unpaid}`}>
      {VOUCHER_STATUS_LABELS[status] || status}
    </span>
  );
}