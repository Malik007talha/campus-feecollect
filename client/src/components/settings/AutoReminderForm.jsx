import { useEffect, useState } from 'react';
import { Loader2, AlertTriangle, Send } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { settingsService } from '../../services/settingsService';
import { reminderService } from '../../services/reminderService';
import { getErrorMessage } from '../../services/api';

const CHOICES = [
  [0, 'On the due date'],
  [1, '1 day before'],
  [2, '2 days before'],
  [3, '3 days before'],
  [5, '5 days before'],
  [7, '7 days before'],
];

export default function AutoReminderForm() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [days, setDays] = useState([3]);
  const [emailReady, setEmailReady] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(''); // '' | save | run
  const [lastRun, setLastRun] = useState('');

  useEffect(() => {
    Promise.all([settingsService.autoReminders(), reminderService.status()])
      .then(([p, s]) => {
        setEnabled(p.enabled);
        setDays(p.days);
        setEmailReady(s.email);
      })
      .catch((err) => setLoadError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const toggleDay = (d) => {
    setError('');
    setDays((list) => {
      if (list.includes(d)) return list.filter((x) => x !== d);
      if (list.length >= 3) {
        setError('You can choose up to 3 reminder days.');
        return list;
      }
      return [...list, d];
    });
  };

  const save = async () => {
    if (enabled && days.length === 0) {
      setError('Choose at least one reminder day.');
      return false;
    }
    setBusy('save');
    setError('');
    try {
      const res = await settingsService.updateAutoReminders({ enabled, days });
      setEnabled(res.data.enabled);
      setDays(res.data.days);
      toast.success(res.message);
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    } finally {
      setBusy('');
    }
  };

  const runNow = async () => {
    if (!(await save())) return;
    setBusy('run');
    try {
      const res = await settingsService.runAutoReminders();
      setLastRun(res.message);
      toast.success('Reminder check finished');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading automatic reminders…
      </div>
    );
  }
  if (loadError) return <p role="alert" className="rounded-md bg-danger-50 p-3 text-danger-600">{loadError}</p>;

  const first = [...days].sort((a, b) => b - a)[0] ?? 3;

  return (
    <section className="max-w-2xl space-y-5 rounded-lg border border-line bg-white p-5">
      <div>
        <h2 className="border-b border-line pb-1 text-sm font-semibold uppercase tracking-wide text-navy-800">
          Automatic reminders before the due date
        </h2>
        <p className="mt-2 text-sm text-muted">
          The system emails the parent by itself before the due date, with the fee voucher attached. It only emails
          parents whose voucher is still unpaid, and only once for each reminder day.
        </p>
      </div>

      {!emailReady && (
        <div className="flex items-start gap-2 rounded-md bg-warning-50 p-3 text-sm text-warning-600">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Email is not set up on the server yet (SMTP settings), so no reminder can be sent.</p>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-md bg-danger-50 p-3 text-sm text-danger-600">
          {error}
        </div>
      )}

      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">Automatic reminders</legend>
        {[
          [false, 'Off', 'No automatic emails are sent.'],
          [true, 'On', 'Email parents before the due date.'],
        ].map(([value, title, hint]) => (
          <label
            key={title}
            className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-3 ${
              enabled === value ? 'border-primary-600 bg-primary-50' : 'border-line hover:bg-page'
            }`}
          >
            <input type="radio" name="autoEnabled" checked={enabled === value} onChange={() => setEnabled(value)} className="mt-1 h-5 w-5" />
            <span>
              <span className="block font-medium">{title}</span>
              <span className="block text-sm text-muted">{hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {enabled && (
        <>
          <fieldset>
            <legend className="text-sm font-medium">When should parents be reminded? (up to 3)</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {CHOICES.map(([d, label]) => (
                <label key={d} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-line px-3 hover:bg-page">
                  <input type="checkbox" checked={days.includes(d)} onChange={() => toggleDay(d)} className="h-5 w-5" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <p className="rounded-md bg-page p-3 text-sm text-muted">
            Example: if a voucher is due on the 20th and you choose{' '}
            <strong className="text-ink">{first === 0 ? 'On the due date' : `${first} ${first === 1 ? 'day' : 'days'} before`}</strong>, the
            parent is emailed on the {first === 0 ? '20th' : `${20 - first}th`} at about 9:00 am (Pakistan time). A parent with no email
            address on the student record is skipped.
          </p>
        </>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={save}
          disabled={Boolean(busy)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-60"
        >
          {busy === 'save' && <Loader2 className="h-5 w-5 animate-spin" />}
          Save automatic reminders
        </button>
        {enabled && (
          <button
            type="button"
            onClick={runNow}
            disabled={Boolean(busy) || !emailReady}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-primary-700 bg-white px-4 text-base font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-60"
          >
            {busy === 'run' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            Save and check now
          </button>
        )}
      </div>

      {lastRun && <p className="rounded-md bg-success-50 p-3 text-sm text-success-600">{lastRun}</p>}
    </section>
  );
}