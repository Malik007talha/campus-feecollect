import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle2, Info, FileText } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { voucherService } from '../../services/voucherService';
import { classService } from '../../services/classService';
import { getErrorMessage } from '../../services/api';
import { formatRs, formatDate } from '../../utils/format';
import { currentMonthKey, monthOptions, defaultDueDate } from '../../utils/dates';
import PageHeader from '../../components/common/PageHeader';
import FormField, { inputClass } from '../../components/common/FormField';
import VoucherPdfButtons from '../../components/vouchers/VoucherPdfButtons';

const MONTH_CHOICES = monthOptions(6, 2);

function Line({ label, children, strong }) {
  return (
    <div className={`flex justify-between gap-4 py-2 ${strong ? 'text-lg font-semibold' : ''}`}>
      <dt className={strong ? '' : 'text-muted'}>{label}</dt>
      <dd className="text-end">{children}</dd>
    </div>
  );
}

export default function GenerateVouchersPage() {
  const toast = useToast();
  const startMonth = currentMonthKey();

  const [step, setStep] = useState('form'); // form | confirm | done
  const [busy, setBusy] = useState(''); // '' | preview | generate
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({
    scope: 'school',
    className: '',
    section: '',
    month: startMonth,
    dueDate: defaultDueDate(startMonth),
  });
  const [dueTouched, setDueTouched] = useState(false);
  const [classOptions, setClassOptions] = useState([]);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    classService.options().then(setClassOptions).catch(() => {});
  }, []);

  const classNames = useMemo(() => [...new Set(classOptions.map((c) => c.name))], [classOptions]);
  const sections = useMemo(
    () => [...new Set(classOptions.filter((c) => c.name === form.className).map((c) => c.section))].sort(),
    [classOptions, form.className]
  );

  const payload = () => ({
    scope: form.scope,
    ...(form.scope === 'class' ? { className: form.className, ...(form.section ? { section: form.section } : {}) } : {}),
    month: form.month,
    dueDate: form.dueDate,
  });

  const setMonth = (month) =>
    setForm((f) => ({ ...f, month, dueDate: dueTouched ? f.dueDate : defaultDueDate(month) }));

  const validate = () => {
    const problems = {};
    if (form.scope === 'class' && !form.className) problems.className = 'Please choose a class';
    if (!form.dueDate) problems.dueDate = 'Please choose a due date';
    else if (form.dueDate < `${form.month}-01`) problems.dueDate = 'The due date cannot be before the start of the billing month';
    setFieldErrors(problems);
    return Object.keys(problems).length === 0;
  };

  const handleReview = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setBusy('preview');
    try {
      setPreview(await voucherService.preview(payload()));
      setStep('confirm');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const handleGenerate = async () => {
    if (busy) return; // ignore a second click while the first is running
    setBusy('generate');
    try {
      const res = await voucherService.generate(payload());
      setResult(res.data);
      setStep('done');
      if (res.data.created > 0) toast.success(res.message);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const startOver = () => {
    setStep('form');
    setPreview(null);
    setResult(null);
    setError('');
  };

  const backLink = (
    <Link to="/vouchers" className="mb-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline">
      <ArrowLeft className="h-4 w-4" /> Back to Fee Vouchers
    </Link>
  );

  /* ---------------------------------- Step 1: choose ---------------------------------- */
  if (step === 'form') {
    return (
      <div>
        {backLink}
        <PageHeader
          title="Generate Fee Vouchers"
          subtitle="Choose who the vouchers are for, the billing month and the last date to pay. You will see a summary before anything is created."
        />

        <form onSubmit={handleReview} noValidate className="max-w-2xl space-y-6 rounded-lg border border-line bg-white p-5">
          {error && (
            <div role="alert" className="rounded-md bg-danger-50 p-3 text-danger-600">
              {error}
            </div>
          )}

          <fieldset>
            <legend className="text-sm font-medium">Who are the vouchers for?</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {[
                ['school', 'Entire school', 'Every active student'],
                ['class', 'One class', 'Pick a class, and a section if you like'],
              ].map(([value, title, hint]) => (
                <label
                  key={value}
                  className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-3 ${
                    form.scope === value ? 'border-primary-600 bg-primary-50' : 'border-line hover:bg-page'
                  }`}
                >
                  <input
                    type="radio"
                    name="scope"
                    value={value}
                    checked={form.scope === value}
                    onChange={() => setForm((f) => ({ ...f, scope: value }))}
                    className="mt-1 h-5 w-5"
                  />
                  <span>
                    <span className="block font-medium">{title}</span>
                    <span className="block text-sm text-muted">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {form.scope === 'class' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="g-class" label="Class" required error={fieldErrors.className}>
                <select
                  id="g-class"
                  className={inputClass}
                  value={form.className}
                  onChange={(e) => setForm((f) => ({ ...f, className: e.target.value, section: '' }))}
                >
                  <option value="">Choose…</option>
                  {classNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField id="g-section" label="Section">
                <select
                  id="g-section"
                  className={inputClass}
                  value={form.section}
                  onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
                  disabled={!form.className}
                >
                  <option value="">All sections</option>
                  {sections.map((s) => (
                    <option key={s} value={s}>
                      Section {s}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="g-month" label="Billing month" required>
              <select id="g-month" className={inputClass} value={form.month} onChange={(e) => setMonth(e.target.value)}>
                {MONTH_CHOICES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              id="g-due"
              label="Last date to pay (due date)"
              required
              hint="Late fines start after this date."
              error={fieldErrors.dueDate}
            >
              <input
                id="g-due"
                type="date"
                className={inputClass}
                value={form.dueDate}
                onChange={(e) => {
                  setDueTouched(true);
                  setForm((f) => ({ ...f, dueDate: e.target.value }));
                }}
              />
            </FormField>
          </div>

          <button
            type="submit"
            disabled={busy === 'preview'}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-60 sm:w-auto"
          >
            {busy === 'preview' && <Loader2 className="h-5 w-5 animate-spin" />}
            Review before generating
          </button>
        </form>
      </div>
    );
  }

  /* -------------------------------- Step 2: confirm -------------------------------- */
  if (step === 'confirm') {
    const p = preview;
    const nothingNew = p.willCreate === 0;
    return (
      <div>
        {backLink}
        <PageHeader title="Check before generating" subtitle="Nothing has been created yet. Read the summary, then confirm." />

        <div className="max-w-2xl space-y-4">
          <section className="rounded-lg border border-line bg-white p-5">
            <dl className="divide-y divide-line">
              <Line label="Vouchers for">{p.scopeLabel}</Line>
              <Line label="Billing month">{p.monthLabel}</Line>
              <Line label="Due date">{formatDate(`${p.dueDate}T00:00:00+05:00`)}</Line>
              <Line label="Active students">{p.totalActive}</Line>
              {p.alreadyExist > 0 && <Line label="Already have a voucher for this month">{p.alreadyExist}</Line>}
              {p.withoutFees > 0 && <Line label="Cannot get a voucher (class has no fees)">{p.withoutFees}</Line>}
              <Line label="Vouchers to create" strong>
                {p.willCreate}
              </Line>
              {!nothingNew && (
                <>
                  <Line label="Fees before discounts">{formatRs(p.grossTotal)}</Line>
                  {p.discountTotal > 0 && <Line label="Discounts">− {formatRs(p.discountTotal)}</Line>}
                  <Line label="Total fee amount" strong>
                    {formatRs(p.payableTotal)}
                  </Line>
                </>
              )}
            </dl>
          </section>

          {p.byClass.length > 1 && (
            <section className="rounded-lg border border-line bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-navy-800">By class</h2>
              <ul className="mt-2 divide-y divide-line">
                {p.byClass.map((c) => (
                  <li key={c.label} className="flex justify-between gap-3 py-2 text-sm">
                    <span>
                      {c.label} <span className="text-muted">({c.students} {c.students === 1 ? 'student' : 'students'})</span>
                    </span>
                    <span className="font-medium">{formatRs(c.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {p.withoutFees > 0 && (
            <div className="flex items-start gap-2 rounded-md bg-warning-50 p-4 text-warning-600">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">
                  {p.withoutFees} {p.withoutFees === 1 ? 'student has' : 'students have'} no fees set, so no voucher will be made.
                </p>
                <p className="mt-1 text-sm">Classes without fees: {p.classesWithoutFees.join(', ')}.</p>
                <Link to="/fee-structure" className="mt-1 inline-block text-sm font-semibold underline">
                  Set the fees (Admin)
                </Link>
              </div>
            </div>
          )}

          {nothingNew && (
            <div className="flex items-start gap-2 rounded-md bg-primary-50 p-4 text-primary-700">
              <Info className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                {p.alreadyExist > 0
                  ? `All ${p.alreadyExist} vouchers for ${p.monthLabel} already exist, so there is nothing new to create.`
                  : 'There is nothing to create for this selection.'}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => setStep('form')}
              disabled={busy === 'generate'}
              className="min-h-11 rounded-md border border-line bg-white px-4 text-base font-medium hover:bg-page"
            >
              Go back and change
            </button>
            <button
              onClick={handleGenerate}
              disabled={nothingNew || busy === 'generate'}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
            >
              {busy === 'generate' ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
              {busy === 'generate' ? 'Generating…' : `Generate ${p.willCreate} ${p.willCreate === 1 ? 'voucher' : 'vouchers'}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------- Step 3: done ---------------------------------- */
  const r = result;
  return (
    <div>
      {backLink}
      <PageHeader title="Generation finished" />

      <div className="max-w-2xl space-y-4">
        {r.created > 0 ? (
          <div className="rounded-lg border border-success-600/30 bg-success-50 p-5 text-success-600">
            <p className="flex items-center gap-2 text-lg font-semibold">
              <CheckCircle2 className="h-6 w-6" />
              {r.created} {r.created === 1 ? 'voucher was' : 'vouchers were'} created for {r.monthLabel}
            </p>
            <p className="mt-1 text-ink">Total fee amount: {formatRs(r.totalAmount)}</p>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-lg border border-primary-600/30 bg-primary-50 p-5 text-primary-700">
            <Info className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="font-medium">
              No new vouchers were created.{' '}
              {r.alreadyExisted > 0 ? `All ${r.alreadyExisted} vouchers for ${r.monthLabel} already exist.` : ''}
            </p>
          </div>
        )}

        {r.created > 0 && r.alreadyExisted > 0 && (
          <p className="rounded-md bg-page p-3 text-sm text-muted">
            {r.alreadyExisted} {r.alreadyExisted === 1 ? 'student already had' : 'students already had'} a voucher for this
            month, so no second voucher was made for them.
          </p>
        )}

        {r.withoutFees > 0 && (
          <div className="flex items-start gap-2 rounded-md bg-warning-50 p-4 text-warning-600">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              {r.withoutFees} {r.withoutFees === 1 ? 'student was' : 'students were'} skipped because their class has no fees
              set: {r.classesWithoutFees.join(', ')}.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to={`/vouchers?month=${r.month}`}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600"
          >
            View vouchers
          </Link>
          {r.created > 0 && <VoucherPdfButtons bulk params={{ month: r.month }} />}
          <button
            onClick={startOver}
            className="min-h-11 rounded-md border border-line bg-white px-4 text-base font-medium hover:bg-page"
          >
            Generate for another class or month
          </button>
        </div>
      </div>
    </div>
  );
}