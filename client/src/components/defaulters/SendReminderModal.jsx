import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, Info } from 'lucide-react';
import Modal from '../common/Modal';
import { useLanguage } from '../../context/LanguageContext';
import { reminderService } from '../../services/reminderService';
import { getErrorMessage } from '../../services/api';

const outlineBtn =
  'min-h-11 flex-1 rounded-md border border-line bg-white px-4 text-base font-medium hover:bg-page sm:flex-none';
const primaryBtn =
  'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-60 sm:flex-none';

const CHANNELS = [
  ['sms', 'SMS (text message)', 'sms'],
  ['email', 'Email', 'email'],
  ['both', 'Both SMS and email', null],
];

const STATUS_TEXT = { skipped: 'Skipped', failed: 'Failed' };

export default function SendReminderModal({ target, onClose, onDone }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState(null); // { email: bool, sms: bool }
  const [channel, setChannel] = useState('sms');
  const [step, setStep] = useState('form'); // form | done
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    reminderService.status().then(setMode).catch(() => {});
  }, []);

  const isLive = (key) => (key === null ? mode?.email && mode?.sms : mode?.[key]);
  const anyTest = mode && (channel === 'both' ? !(mode.email && mode.sms) : !mode[channel]);

  const send = async () => {
    setSending(true);
    setError('');
    try {
      const payload = {
        channel,
        force: Boolean(target.voucherIds) && target.count === 1, // one student chosen on purpose
        ...(target.voucherIds ? { voucherIds: target.voucherIds } : { filters: target.filters }),
      };
      const res = await reminderService.send(payload);
      setResult(res);
      setStep('done');
      onDone?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  /* ------------------------------------- Result ------------------------------------- */
  if (step === 'done') {
    const { summary, results } = result.data;
    const problems = results.filter((r) => r.status === 'skipped' || r.status === 'failed');
    const good = summary.sent + summary.logged;
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
            good > 0 ? 'border-success-600/30 bg-success-50 text-success-600' : 'border-warning-600/30 bg-warning-50 text-warning-600'
          }`}
        >
          <p className="flex items-center gap-2 text-lg font-semibold">
            {good > 0 && <CheckCircle2 className="h-6 w-6" />}
            {result.message}
          </p>
        </div>

        {summary.logged > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-md bg-page p-3 text-sm text-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            Test mode: no real message was sent. The text is saved in the server console and in Reminder history. To send real
            messages, add email or SMS details to the server settings.
          </p>
        )}

        {problems.length > 0 && (
          <>
            <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-navy-800">Not sent</h3>
            <ul className="mt-1 divide-y divide-line text-sm">
              {problems.slice(0, 30).map((r, i) => (
                <li key={i} className="py-2">
                  <p className="font-medium">
                    {r.studentName} <span className="font-normal text-muted">({r.channel === 'sms' ? 'SMS' : 'Email'})</span>
                  </p>
                  <p className={r.status === 'failed' ? 'text-danger-600' : 'text-muted'}>
                    {STATUS_TEXT[r.status]}: {r.detail}
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

  /* -------------------------------------- Form -------------------------------------- */
  return (
    <Modal
      title="Send fee reminder"
      onClose={sending ? () => {} : onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={sending} className={outlineBtn}>
            {t('cancel')}
          </button>
          <button type="button" onClick={send} disabled={sending} className={primaryBtn}>
            {sending && <Loader2 className="h-5 w-5 animate-spin" />}
            {sending ? 'Sending…' : 'Send reminder'}
          </button>
        </>
      }
    >
      {error && (
        <div role="alert" className="mb-3 rounded-md bg-danger-50 p-3 text-sm text-danger-600">
          {error}
        </div>
      )}

      <div className="rounded-md bg-page p-3">
        <p className="text-sm text-muted">Reminder for</p>
        <p className="text-lg font-semibold text-navy-900">{target.label}</p>
        <p className="text-sm text-muted">
          The parent receives the student&apos;s name, voucher number, due date and the pending amount.
        </p>
      </div>

      <fieldset className="mt-4 space-y-2">
        <legend className="text-sm font-medium">How should it be sent?</legend>
        {CHANNELS.map(([value, title, key]) => (
          <label
            key={value}
            className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-3 ${
              channel === value ? 'border-primary-600 bg-primary-50' : 'border-line hover:bg-page'
            }`}
          >
            <input
              type="radio"
              name="channel"
              value={value}
              checked={channel === value}
              onChange={() => setChannel(value)}
              className="mt-1 h-5 w-5"
            />
            <span>
              <span className="block font-medium">{title}</span>
              {mode && (
                <span className={`block text-sm ${isLive(key) ? 'text-success-600' : 'text-warning-600'}`}>
                  {isLive(key) ? 'Sent for real' : 'Test mode: saved in the server console, nothing is sent'}
                </span>
              )}
            </span>
          </label>
        ))}
      </fieldset>

      {anyTest && (
        <p className="mt-3 text-sm text-muted">
          Test mode is normal until email or SMS details are added to the server settings.
        </p>
      )}
      {target.count > 1 && (
        <p className="mt-3 text-sm text-muted">
          A parent who was already reminded in the last 24 hours on the same channel is skipped.
        </p>
      )}
    </Modal>
  );
}