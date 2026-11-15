import { Loader2 } from 'lucide-react';
import Modal from './Modal';
import { useLanguage } from '../../context/LanguageContext';

export default function ConfirmDialog({ title, message, confirmLabel, loading, danger = true, onConfirm, onCancel }) {
  const { t } = useLanguage();
  return (
    <Modal
      title={title}
      onClose={loading ? () => {} : onCancel}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-h-11 flex-1 rounded-md border border-line bg-white px-4 text-base font-medium hover:bg-page sm:flex-none"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md px-4 text-base font-semibold text-white disabled:opacity-60 sm:flex-none ${
              danger ? 'bg-danger-600 hover:bg-red-800' : 'bg-primary-700 hover:bg-primary-600'
            }`}
          >
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-base text-ink">{message}</p>
    </Modal>
  );
}