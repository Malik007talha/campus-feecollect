import { Pencil } from 'lucide-react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { useLanguage } from '../../context/LanguageContext';
import { formatPkPhone } from '../../utils/phone';
import { formatDate } from '../../utils/format';
import { classText, discountText, DISCOUNT_LABELS } from '../../constants/students';

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:gap-4">
      <dt className="text-sm text-muted sm:w-40 sm:shrink-0">{label}</dt>
      <dd className="font-medium text-ink">{children || '—'}</dd>
    </div>
  );
}

export default function StudentDetailsModal({ student, canEdit, onEdit, onClose }) {
  const { t } = useLanguage();
  return (
    <Modal
      title="Student details"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-md border border-line bg-white px-4 text-base font-medium hover:bg-page sm:flex-none"
          >
            {t('close')}
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => onEdit(student)}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600 sm:flex-none"
            >
              <Pencil className="h-4 w-4" /> {t('edit')}
            </button>
          )}
        </>
      }
    >
      <h3 className="text-xl font-bold text-navy-900">{student.name}</h3>
      <dl className="mt-2 divide-y divide-line">
        <Row label="Roll number">{student.rollNo}</Row>
        <Row label="Class and section">{classText(student.class)}</Row>
        <Row label="Status">
          <StatusBadge status={student.status} />
        </Row>
        <Row label="Parent name">{student.parentName}</Row>
        <Row label="Parent mobile">{formatPkPhone(student.parentPhone)}</Row>
        <Row label="Parent email">{student.parentEmail}</Row>
        <Row label="Discount">
          {student.discountPercent > 0 ? discountText(student) : DISCOUNT_LABELS.none}
        </Row>
        <Row label="Family code">{student.familyId}</Row>
        <Row label="Added on">{formatDate(student.createdAt)}</Row>
      </dl>
    </Modal>
  );
}