import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import Modal from '../common/Modal';
import { useLanguage } from '../../context/LanguageContext';
import { reminderService } from '../../services/reminderService';
import { getErrorMessage } from '../../services/api';

const outlineBtn =
  'min-h-11 flex-1 rounded-md border border-line bg-white px-4 text-base font-medium hover:bg-page sm:flex-none';
const primaryBtn =
  'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-60 sm:flex-none';

export default function SendReminderModal({ target, onClose, onDone }) {
  const { t } = useLanguage();
  const [emailReady, setEmailReady] = useState(null); // null = checking
  const [step, setStep] = useState('form'); // form | done
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    reminderService
      .status()
      .then((s) => setEmailReady(s.email))
      .catch(() => setEmailReady(false));
  }, []);

  const send = async () => {
    setSending(true);
    setError('');
    try {
      const res = await reminderService.send({
        force: Boolean(target.voucherIds) && target.count === 1, // one student chosen on purpose
        ...(target.voucherIds ? { voucherIds: target.voucherIds } : { filters: target.filters }),
      });
      setResult(res);
      setStep('done');
      onDone?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  if (step === 'done') {
    const { summary, results } = result.data;
    const problems = results.filter((r) => r.status !== 'sent');
    return (
      <Modal
        title="Reminders finished"
        onClose={onClose}
        footer={
          <button type="button" onClick={onClose} className={primaryBtn}>
            {t('close')}
          </button>
        }
      >
        <div
          className={`rounded-lg border p-4 ${
            summary.sent > 0 ? 'border-success-600/30 bg-success-50 text-success-600' : 'border-warning-600/30 bg-warning-50 text-warning-600'
          }`}
        >
          <p className="flex items-center gap-2 text-lg font-semibold">
            {summary.sent > 0 && <CheckCircle2 className="h-6 w-6" />}
            {result.message}
          </p>
        </div>

        {problems.length > 0 && (
          <>
            <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-navy-800">Not sent</h3>
            <ul className="mt-1 divide-y divide-line text-sm">
              {problems.slice(0, 30).map((r, i) => (
                <li key={i} className="py-2">
                  <p className="font-medium">{r.studentName}</p>
                  <p className={r.status === 'failed' ? 'text-danger-600' : 'text-muted'}>
                    {r.status === 'failed' ? 'Failed' : 'Skipped'}: {r.detail}
                  </p>
                </li>
              ))}
            </ul>
            {problems.length > 30 && <p className="mt-1 text-sm text-muted">and {problems.length - 30} more.</p>}
          </>
        )}
      </Modal>
    );
  }

  return (
    <Modal
      title="Send fee reminder by email"
      onClose={sending ? () => {} : onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={sending} className={outlineBtn}>
            {t('cancel')}
          </button>
          <button type="button" onClick={send} disabled={sending || emailReady !== true} className={primaryBtn}>
            {sending && <Loader2 className="h-5 w-5 animate-spin" />}
            {sending ? 'Sending…' : 'Send email'}
          </button>
        </>
      }
    >
      {error && (
        <div role="alert" className="mb-3 rounded-md bg-danger-50 p-3 text-sm text-danger-600">
          {error}
        </div>
      )}

      {emailReady === false && (
        <div className="mb-3 flex items-start gap-2 rounded-md bg-warning-50 p-3 text-sm text-warning-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Email is not set up on the server yet, so reminders cannot be sent. Please ask the administrator to add the email (SMTP) settings.</p>
        </div>
      )}

      <div className="rounded-md bg-page p-3">
        <p className="text-sm text-muted">Reminder for</p>
        <p className="text-lg font-semibold text-navy-900">{target.label}</p>
        <p className="text-sm text-muted">
          The parent receives an email with the student&apos;s name, voucher number, due date and the pending amount.
        </p>
      </div>

      <p className="mt-3 text-sm text-muted">
        A parent with no email address is skipped, so add the parent email on the student first. A parent who was already emailed in the last 24 hours is skipped when you send to several students.
      </p>
    </Modal>
  );
}