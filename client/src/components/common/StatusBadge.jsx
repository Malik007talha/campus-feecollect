import { STATUS_LABELS } from '../../constants/students';

const styles = {
  active: 'bg-success-50 text-success-600',
  inactive: 'bg-warning-50 text-warning-600',
  left: 'bg-page text-muted',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-medium ${styles[status] || styles.left}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}