import { useEffect, useState } from 'react';
import { Loader2, Info } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { settingsService } from '../../services/settingsService';
import { getErrorMessage } from '../../services/api';
import { formatRs } from '../../utils/format';
import FormField, { inputClass } from '../common/FormField';
import ConfirmDialog from '../common/ConfirmDialog';

const TYPES = [
  ['none', 'No late fine', 'Parents are never charged a fine.'],
  ['fixed', 'One fixed amount', 'A single fine is added once the voucher is late.'],
  ['per_day', 'A fixed amount for every day late', 'The fine grows each day until the voucher is paid.'],
  ['percent', 'A percentage of the voucher amount', 'Worked out on the fees after discount, once the voucher is late.'],
];

const toForm = (d) => ({
  fineType: d.fineType,
  fineAmount: d.fineAmount > 0 ? String(d.fineAmount) : '',
  finePercent: d.finePercent > 0 ? String(d.finePercent) : '',
  fineGraceDays: String(d.fineGraceDays ?? 0),
  fineCap: d.fineCap > 0 ? String(d.fineCap) : '',
});

const num = (s) => (String(s).trim() === '' ? 0 : Number(String(s).replace(/,/g, '')));

function validate(f) {
  const e = {};
  if (f.fineType === 'fixed' || f.fineType === 'per_day') {
    const n = num(f.fineAmount);
    if (!Number.isInteger(n) || n < 1) e.fineAmount = 'Enter the fine amount in whole rupees, for example 200';
  }
  if (f.fineType === 'percent') {
    const n = num(f.finePercent);
    if (Number.isNaN(n) || n <= 0 || n > 100) e.finePercent = 'Enter a percentage between 1 and 100';
  }
  if (f.fineType !== 'none') {
    const g = num(f.fineGraceDays);
    if (!Number.isInteger(g) || g < 0 || g > 60) e.fineGraceDays = 'Enter whole days from 0 to 60';
    const c = num(f.fineCap);
    if (!Number.isInteger(c) || c < 0) e.fineCap = 'Enter a whole number of rupees, or leave empty';
  }
  return e;
}

// What a Rs 3,000 voucher would be fined if paid 10 days after its due date.
function exampleFine(f) {
  if (f.fineType === 'none') return 0;
  const days = 10 - num(f.fineGraceDays);
  if (days <= 0) return 0;
  let fine = 0;
  if (f.fineType === 'fixed') fine = num(f.fineAmount);
  if (f.fineType === 'per_day') fine = num(f.fineAmount) * days;
  if (f.fineType === 'percent') fine = Math.round((3000 * num(f.finePercent)) / 100);
  const cap = num(f.fineCap);
  return cap > 0 ? Math.min(fine, cap) : fine;
}

export default function FinePolicyForm() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    settingsService
      .fines()
      .then((d) => setForm(toForm(d)))
      .catch((err) => setLoadError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setServerError('');
    try {
      const res = await settingsService.updateFines({
        fineType: form.fineType,
        fineAmount: num(form.fineAmount),
        finePercent: num(form.finePercent),
        fineGraceDays: num(form.fineGraceDays),
        fineCap: num(form.fineCap),
      });
      setForm(toForm(res.data));
      toast.success(res.message);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const problems = validate(form);
    setErrors(problems);
    if (Object.keys(problems).length) return;
    if (form.fineType === 'none') save();
    else setConfirming(true);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading late fine policy…
      </div>
    );
  }
  if (loadError) {
    return <p role="alert" className="rounded-md bg-danger-50 p-3 text-danger-600">{loadError}</p>;
  }

  const on = form.fineType !== 'none';
  const example = exampleFine(form);

  return (
    <form onSubmit={submit} noValidate className="max-w-2xl space-y-5 rounded-lg border border-line bg-white p-5">
      <div>
        <h2 className="border-b border-line pb-1 text-sm font-semibold uppercase tracking-wide text-navy-800">
          Late fine policy
        </h2>
        <p className="mt-2 text-sm text-muted">
          The system adds the fine by itself after the due date. Nobody types it. Until you choose a policy here, no fine is charged.
        </p>
      </div>

      {serverError && (
        <div role="alert" className="rounded-md bg-danger-50 p-3 text-sm text-danger-600">{serverError}</div>
      )}

      <fieldset className="space-y-2">
        <legend className="sr-only">Fine type</legend>
        {TYPES.map(([value, title, hint]) => (
          <label
            key={value}
            className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-3 ${
              form.fineType === value ? 'border-primary-600 bg-primary-50' : 'border-line hover:bg-page'
            }`}
          >
            <input
              type="radio"
              name="fineType"
              value={value}
              checked={form.fineType === value}
              onChange={() => {
                setForm((f) => ({ ...f, fineType: value }));
                setErrors({});
              }}
              className="mt-1 h-5 w-5"
            />
            <span>
              <span className="block font-medium">{title}</span>
              <span className="block text-sm text-muted">{hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {on && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {(form.fineType === 'fixed' || form.fineType === 'per_day') && (
              <FormField
                id="fineAmount"
                label={form.fineType === 'fixed' ? 'Fine amount (Rs)' : 'Fine per day (Rs)'}
                required
                error={errors.fineAmount}
              >
                <input id="fineAmount" inputMode="numeric" placeholder="e.g. 200" className={inputClass} value={form.fineAmount} onChange={set('fineAmount')} />
              </FormField>
            )}
            {form.fineType === 'percent' && (
              <FormField id="finePercent" label="Fine percentage (%)" required error={errors.finePercent}>
                <input id="finePercent" inputMode="decimal" placeholder="e.g. 5" className={inputClass} value={form.finePercent} onChange={set('finePercent')} />
              </FormField>
            )}
            <FormField
              id="fineGraceDays"
              label="Grace days"
              hint="Days after the due date before the fine starts. 0 means it starts the next day."
              error={errors.fineGraceDays}
            >
              <input id="fineGraceDays" inputMode="numeric" className={inputClass} value={form.fineGraceDays} onChange={set('fineGraceDays')} />
            </FormField>
          </div>

          <FormField
            id="fineCap"
            label="Maximum fine in Rs (optional)"
            hint="The fine will never go above this. Leave empty for no maximum."
            error={errors.fineCap}
          >
            <input id="fineCap" inputMode="numeric" placeholder="e.g. 1000" className={inputClass} value={form.fineCap} onChange={set('fineCap')} />
          </FormField>

          <div className="rounded-md bg-page p-3 text-sm">
            <p className="font-medium">Example</p>
            <p className="mt-1 text-muted">
              A voucher of Rs 3,000 paid 10 days after its due date gets a fine of{' '}
              <strong className="text-ink">{formatRs(example)}</strong>.
            </p>
          </div>

          <p className="flex items-start gap-2 text-sm text-warning-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            Saving applies this policy to every voucher that is already past its due date. A fine that has been added is never lowered automatically.
          </p>
        </>
      )}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-60 sm:w-auto"
      >
        {saving && <Loader2 className="h-5 w-5 animate-spin" />}
        Save late fine policy
      </button>

      {confirming && (
        <ConfirmDialog
          title="Apply this late fine policy?"
          message="Overdue vouchers will get their fine right away, and parents will see it on their vouchers. Do you want to continue?"
          confirmLabel="Yes, apply it"
          danger={false}
          loading={saving}
          onConfirm={save}
          onCancel={() => setConfirming(false)}
        />
      )}
    </form>
  );
}