import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import FormField from '../common/FormField';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { feeService } from '../../services/feeService';
import { getErrorMessage } from '../../services/api';
import { calculateAmounts } from '../../utils/feeCalc';
import { formatRs } from '../../utils/format';
import { classText } from '../../constants/students';

const amountInput =
  'mt-1 block w-full rounded-md border border-line bg-white py-3 ps-11 pe-3 text-base text-ink placeholder:text-muted/70 focus:border-primary-600 focus:outline-none';

export default function FeeStructureModal({ cls, heads, allClasses, onClose, onSaved }) {
  const { t } = useLanguage();
  const toast = useToast();
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const [targets, setTargets] = useState([]);
  const [amounts, setAmounts] = useState(() => {
    const start = {};
    heads.forEach((h) => {
      const found = cls.monthlyFees.find((f) => f.head === h);
      start[h] = found ? String(found.amount) : '';
    });
    return start;
  });

  // Turn what was typed into fee lines, and collect plain-English problems.
  const { lines, errors } = useMemo(() => {
    const result = [];
    const problems = {};
    heads.forEach((h) => {
      const raw = (amounts[h] ?? '').replace(/,/g, '').trim();
      if (raw === '') return;
      if (!/^\d+$/.test(raw)) {
        problems[h] = 'Enter whole rupees, for example 2500';
        return;
      }
      const n = Number(raw);
      if (n > 10000000) {
        problems[h] = 'This amount is too large';
        return;
      }
      if (n > 0) result.push({ head: h, amount: n });
    });
    return { lines: result, errors: problems };
  }, [amounts, heads]);

  const hasErrors = Object.keys(errors).length > 0;
  const base = calculateAmounts(lines);
  const otherClasses = allClasses.filter((c) => c._id !== cls._id);
  const sameName = otherClasses.filter((c) => c.name === cls.name);

  const toggle = (id) =>
    setTargets((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const selectSameName = () => setTargets([...new Set([...targets, ...sameName.map((c) => c._id)])]);

  const submit = async (e) => {
    e.preventDefault();
    if (hasErrors) return;
    setSaving(true);
    setServerError('');
    try {
      const res = await feeService.saveStructure({ classIds: [cls._id, ...targets], fees: lines });
      toast.success(res.message);
      onSaved();
    } catch (err) {
      setServerError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Monthly fees: ${classText(cls)}`}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-md border border-line bg-white px-4 text-base font-medium hover:bg-page sm:flex-none"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            form="fee-form"
            disabled={saving || hasErrors}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-60 sm:flex-none"
          >
            {saving && <Loader2 className="h-5 w-5 animate-spin" />}
            {t('save')}
          </button>
        </>
      }
    >
      <form id="fee-form" onSubmit={submit} noValidate className="space-y-5">
        {serverError && (
          <div role="alert" className="rounded-md bg-danger-50 p-3 text-sm text-danger-600">
            {serverError}
          </div>
        )}

        <p className="text-sm text-muted">
          Type the monthly amount for each fee. Leave a box empty if this class does not pay that fee. Vouchers that
          were already generated keep their old amounts.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {heads.map((h, i) => (
            <FormField key={h} id={`fee-${i}`} label={h} error={errors[h]}>
              <div className="relative">
                <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted">Rs</span>
                <input
                  id={`fee-${i}`}
                  inputMode="numeric"
                  placeholder="0"
                  autoFocus={i === 0}
                  className={amountInput}
                  value={amounts[h] ?? ''}
                  onChange={(e) => setAmounts((a) => ({ ...a, [h]: e.target.value }))}
                />
              </div>
            </FormField>
          ))}
        </div>

        {/* Calculation preview */}
        <section aria-label="Fee calculation" className="rounded-md border border-line bg-page p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-navy-800">Fee calculation</h3>

          {lines.length === 0 ? (
            <p className="mt-2 text-muted">No fees are charged for this class.</p>
          ) : (
            <dl className="mt-2 divide-y divide-line">
              {lines.map((l) => (
                <div key={l.head} className="flex justify-between py-1.5">
                  <dt>{l.head}</dt>
                  <dd>{formatRs(l.amount)}</dd>
                </div>
              ))}
              <div className="flex justify-between py-2 font-semibold">
                <dt>Total per month</dt>
                <dd>{formatRs(base.subtotal)}</dd>
              </div>
            </dl>
          )}

          <div className="mt-3 border-t border-line pt-3">
            {cls.discounts.length === 0 ? (
              <p className="text-sm text-muted">No student in this class has a discount.</p>
            ) : (
              <>
                <p className="text-sm font-medium">What students with a discount will pay</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {cls.discounts.slice(0, 10).map((d) => {
                    const calc = calculateAmounts(lines, d.percent);
                    return (
                      <li key={d._id} className="flex flex-wrap justify-between gap-x-3">
                        <span>
                          {d.name} <span className="text-muted">({d.percent}% off)</span>
                        </span>
                        <span className="font-medium">
                          {formatRs(calc.payable)}{' '}
                          <span className="font-normal text-muted">(− {formatRs(calc.discount)})</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {cls.discounts.length > 10 && (
                  <p className="mt-1 text-sm text-muted">and {cls.discounts.length - 10} more students</p>
                )}
              </>
            )}
          </div>
        </section>

        {/* Apply to other sections */}
        {otherClasses.length > 0 && (
          <section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-navy-800">Also use these fees for</h3>
              {sameName.length > 0 && (
                <button
                  type="button"
                  onClick={selectSameName}
                  className="min-h-10 text-sm font-medium text-primary-700 hover:underline"
                >
                  Select all sections of {cls.name}
                </button>
              )}
            </div>
            <ul className="mt-2 max-h-48 divide-y divide-line overflow-y-auto rounded-md border border-line">
              {otherClasses.map((c) => (
                <li key={c._id}>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 px-3 py-2 hover:bg-page">
                    <input
                      type="checkbox"
                      checked={targets.includes(c._id)}
                      onChange={() => toggle(c._id)}
                      className="mt-1 h-5 w-5 shrink-0"
                    />
                    <span>
                      {classText(c)}
                      {c.monthlyFees.length > 0 && (
                        <span className="block text-sm text-warning-600">
                          Already has {formatRs(c.total)} per month. This will be replaced.
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        )}
      </form>
    </Modal>
  );
}