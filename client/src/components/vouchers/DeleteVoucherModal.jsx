import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import Modal from '../common/Modal';
import FormField, { inputClass } from '../common/FormField';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { voucherService } from '../../services/voucherService';
import { getErrorMessage } from '../../services/api';
import { formatRs } from '../../utils/format';
import { monthLabel } from '../../utils/dates';

export default function DeleteVoucherModal({ voucher, onClose, onDeleted }) {
  const { t } = useLanguage();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (reason.trim().length < 3) {
      setError('Please write a short reason, for example "Generated for the wrong student"');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await voucherService.remove(voucher._id, reason.trim());
      toast.success(res.message);
      onDeleted();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Delete this voucher?"
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-11 flex-1 rounded-md border border-line bg-white px-4 text-base font-medium hover:bg-page sm:flex-none"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            form="delete-voucher-form"
            disabled={saving}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-danger-600 px-4 text-base font-semibold text-white hover:bg-red-800 disabled:opacity-60 sm:flex-none"
          >
            {saving && <Loader2 className="h-5 w-5 animate-spin" />}
            Delete voucher
          </button>
        </>
      }
    >
      <form id="delete-voucher-form" onSubmit={submit} noValidate className="space-y-4">
        <div className="rounded-md bg-page p-3">
          <p className="text-lg font-semibold text-navy-900">{voucher.studentName}</p>
          <p className="text-sm text-muted">
            {voucher.className} – Section {voucher.section} · Roll {voucher.rollNo}
          </p>
          <p className="mt-1 text-sm text-muted">
            {voucher.voucherNo} · {monthLabel(voucher.month)} · {formatRs(voucher.total)}
          </p>
        </div>

        <p className="flex items-start gap-2 rounded-md bg-warning-50 p-3 text-sm text-warning-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          This cannot be undone. Only a voucher with no payment can be deleted. The deletion and your reason are saved in a
          permanent record.
        </p>

        {error && (
          <div role="alert" className="rounded-md bg-danger-50 p-3 text-sm text-danger-600">
            {error}
          </div>
        )}

        <FormField id="del-reason" label="Why is it being deleted?" required>
          <input
            id="del-reason"
            maxLength={200}
            autoFocus
            placeholder="e.g. Generated for the wrong student"
            className={inputClass}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </FormField>
      </form>
    </Modal>
  );
}