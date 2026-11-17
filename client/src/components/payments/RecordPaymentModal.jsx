import { useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import Modal from '../common/Modal';
import FormField, { inputClass } from '../common/FormField';
import ReceiptButtons from './ReceiptButtons';
import { useLanguage } from '../../context/LanguageContext';
import { paymentService } from '../../services/paymentService';
import { getErrorMessage } from '../../services/api';
import { formatRs, formatDate } from '../../utils/format';
import { monthLabel, todayDateString } from '../../utils/dates';
import { METHOD_LABELS } from '../../constants/payments';

const amountInput =
  'mt-1 block w-full rounded-md border border-line bg-white py-3 ps-11 pe-3 text-base text-ink placeholder:text-muted/70 focus:border-primary-600 focus:outline-none';

const outlineBtn =
  'min-h-11 flex-1 rounded-md border border-line bg-white px-4 text-base font-medium hover:bg-page sm:flex-none';
const primaryBtn =
  'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-60 sm:flex-none';

function Line({ label, children, strong }) {
  return (
    <div className={`flex justify-between gap-4 py-2 ${strong ? 'text-lg font-semibold' : ''}`}>
      <dt className={strong ? '' : 'text-muted'}>{label}</dt>
      <dd className="text-end">{children}</dd>
    </div>
  );
}

export default function RecordPaymentModal({ voucher, onClose, onRecorded }) {
  const { t } = useLanguage();
  const balance = voucher.total - voucher.paid;

  const [step, setStep] = useState('form'); // form | confirm | done
  const [amount, setAmount] = useState(String(balance));
  const [method, setMethod] = useState('cash');
  const [date, setDate] = useState(todayDateString());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const amountNumber = Number(amount.replace(/,/g, '').trim());

  const validate = () => {
    const problems = {};
    const raw = amount.replace(/,/g, '').trim();
    if (!raw) problems.amount = 'Enter the amount received';
    else if (!/^\d+$/.test(raw)) problems.amount = 'Enter whole rupees, for example 1500';
    else if (amountNumber < 1) problems.amount = 'The amount must be at least Rs 1';
    else if (amountNumber > balance) problems.amount = `The amount is more than the balance (${formatRs(balance)})`;

    if (!date) problems.date = 'Choose the payment date';
    else if (date > todayDateString()) problems.date = 'The payment date cannot be in the future';

    setErrors(problems);
    return Object.keys(problems).length === 0;
  };

  const review = (e) => {
    e.preventDefault();
    setServerError('');
    if (validate()) setStep('confirm');
  };

  const confirm = async () => {
    setSaving(true);
    setServerError('');
    try {
      const res = await paymentService.record({
        voucherId: voucher._id,
        amount: amountNumber,
        method,
        date,
        note: note.trim(),
      });
      setResult(res.data);
      setStep('done');
      onRecorded?.(res.data);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const who = (
    <div className="rounded-md bg-page p-3">
      <p className="text-lg font-semibold text-navy-900">{voucher.studentName}</p>
      <p className="text-sm text-muted">
        {voucher.className} – Section {voucher.section} · Roll {voucher.rollNo}
      </p>
      <p className="mt-1 text-sm text-muted">
        {voucher.voucherNo} · {monthLabel(voucher.month)} · Due {formatDate(voucher.dueDate)}
      </p>
    </div>
  );

  /* ------------------------------------- Done ------------------------------------- */
  if (step === 'done') {
    const remaining = result.voucher.total - result.voucher.paid;
    return (
      <Modal
        title="Payment recorded"
        onClose={onClose}
        footer={
          <div className="flex w-full flex-wrap items-center gap-2 sm:justify-end">
            <ReceiptButtons paymentId={result.payment._id} receiptNo={result.payment.receiptNo} />
            <button type="button" onClick={onClose} className={outlineBtn}>
              {t('close')}
            </button>
          </div>
        }
      >
        <div className="rounded-lg border border-success-600/30 bg-success-50 p-4 text-success-600">
          <p className="flex items-center gap-2 text-lg font-semibold">
            <CheckCircle2 className="h-6 w-6" /> {formatRs(result.payment.amount)} received
          </p>
          <p className="mt-1 text-sm text-ink">Receipt no. {result.payment.receiptNo}</p>
        </div>
        <dl className="mt-3 divide-y divide-line">
          <Line label="Student">{voucher.studentName}</Line>
          <Line label="Voucher">{voucher.voucherNo}</Line>
          <Line label="Total payable">{formatRs(result.voucher.total)}</Line>
          <Line label="Total paid so far">{formatRs(result.voucher.paid)}</Line>
          <Line label="Remaining balance" strong>
            {remaining === 0 ? 'Rs 0 (fully paid)' : formatRs(remaining)}
          </Line>
        </dl>
        <p className="mt-3 text-sm text-muted">Print the receipt for the parent using the buttons below.</p>
      </Modal>
    );
  }

  /* ----------------------------------- Confirm ----------------------------------- */
  if (step === 'confirm') {
    return (
      <Modal
        title="Check before saving"
        onClose={saving ? () => {} : onClose}
        footer={
          <>
            <button type="button" onClick={() => setStep('form')} disabled={saving} className={outlineBtn}>
              Go back
            </button>
            <button type="button" onClick={confirm} disabled={saving} className={primaryBtn}>
              {saving && <Loader2 className="h-5 w-5 animate-spin" />}
              Confirm payment
            </button>
          </>
        }
      >
        {serverError && (
          <div role="alert" className="mb-3 rounded-md bg-danger-50 p-3 text-sm text-danger-600">
            {serverError}
          </div>
        )}
        {who}
        <dl className="mt-3 divide-y divide-line">
          <Line label="Amount received" strong>
            {formatRs(amountNumber)}
          </Line>
          <Line label="Payment method">{METHOD_LABELS[method]}</Line>
          <Line label="Payment date">{formatDate(`${date}T00:00:00+05:00`)}</Line>
          {note.trim() && <Line label="Note">{note.trim()}</Line>}
          <Line label="Balance before this payment">{formatRs(balance)}</Line>
          <Line label="Balance after this payment" strong>
            {formatRs(balance - amountNumber)}
          </Line>
        </dl>
        <p className="mt-3 text-sm text-muted">A saved payment cannot be edited or deleted.</p>
      </Modal>
    );
  }

  /* ------------------------------------- Form ------------------------------------- */
  return (
    <Modal
      title={t('recordPayment')}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={outlineBtn}>
            {t('cancel')}
          </button>
          <button type="submit" form="payment-form" className={primaryBtn}>
            Review payment
          </button>
        </>
      }
    >
      <form id="payment-form" onSubmit={review} noValidate className="space-y-4">
        {who}

        <div className="rounded-md border border-line p-3">
          <p className="text-sm text-muted">Balance to pay</p>
          <p className="text-2xl font-bold text-navy-900">{formatRs(balance)}</p>
          {voucher.paid > 0 && (
            <p className="text-sm text-muted">
              Already paid {formatRs(voucher.paid)} of {formatRs(voucher.total)}
            </p>
          )}
          {voucher.fine > 0 && <p className="text-sm text-warning-600">Includes a late fine of {formatRs(voucher.fine)}</p>}
        </div>

        <FormField id="pay-amount" label="Amount received" required error={errors.amount}>
          <div className="relative">
            <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted">Rs</span>
            <input
              id="pay-amount"
              inputMode="numeric"
              autoFocus
              className={amountInput}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          {amount.trim() !== String(balance) && (
            <button
              type="button"
              onClick={() => setAmount(String(balance))}
              className="mt-1 min-h-10 text-sm font-medium text-primary-700 hover:underline"
            >
              Pay the full balance ({formatRs(balance)})
            </button>
          )}
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="pay-method" label="Payment method" required>
            <select id="pay-method" className={inputClass} value={method} onChange={(e) => setMethod(e.target.value)}>
              {Object.entries(METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="pay-date" label="Payment date" required error={errors.date}>
            <input
              id="pay-date"
              type="date"
              max={todayDateString()}
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </FormField>
        </div>

        <FormField id="pay-note" label="Note (optional)" hint="For example a cheque number or a bank reference.">
          <input
            id="pay-note"
            maxLength={200}
            placeholder="e.g. Cheque no. 004512"
            className={inputClass}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </FormField>
      </form>
    </Modal>
  );
}