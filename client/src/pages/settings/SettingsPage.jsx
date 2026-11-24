import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { settingsService } from '../../services/settingsService';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import FormField, { inputClass } from '../../components/common/FormField';
import FinePolicyForm from '../../components/settings/FinePolicyForm';
import AutoReminderForm from '../../components/settings/AutoReminderForm';

const schema = z.object({
  schoolName: z.string().trim().min(2, 'Please enter the school name').max(80, 'School name is too long'),
  address: z.string().trim().max(120, 'Please keep the address under 120 characters'),
  phone: z.string().trim().max(30, 'Phone number is too long'),
  bankName: z.string().trim().max(60, 'Bank name is too long'),
  accountTitle: z.string().trim().max(80, 'Account title is too long'),
  accountNumber: z.string().trim().max(40, 'Account number is too long'),
  paymentInstructions: z.string().trim().max(200, 'Please keep this under 200 characters'),
});

const EMPTY = {
  schoolName: '', address: '', phone: '', bankName: '', accountTitle: '', accountNumber: '', paymentInstructions: '',
};

function SectionTitle({ children }) {
  return (
    <h2 className="border-b border-line pb-1 text-sm font-semibold uppercase tracking-wide text-navy-800">{children}</h2>
  );
}

export default function SettingsPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(schema), defaultValues: EMPTY });

  const pick = (data) => Object.fromEntries(Object.keys(EMPTY).map((k) => [k, data[k] ?? '']));

  const load = () => {
    setLoading(true);
    setLoadError('');
    settingsService
      .get()
      .then((data) => reset(pick(data)))
      .catch((err) => setLoadError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const res = await settingsService.update(values);
      reset(pick(res.data));
      toast.success(res.message);
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-white py-12 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading settings…
      </div>
    );
  }

  if (loadError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-md bg-danger-50 p-4 text-danger-600">
        <p>{loadError}</p>
        <button onClick={load} className="min-h-10 rounded-md border border-danger-600 px-4 text-sm font-medium">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t('settings')}
        subtitle="These details are printed on every fee voucher. Changes apply to vouchers you download after saving."
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-2xl space-y-5 rounded-lg border border-line bg-white p-5">
        {serverError && (
          <div role="alert" className="rounded-md bg-danger-50 p-3 text-sm text-danger-600">
            {serverError}
          </div>
        )}

        <SectionTitle>School details</SectionTitle>
        <FormField id="schoolName" label="School name" required error={errors.schoolName?.message}>
          <input id="schoolName" placeholder="e.g. School Name" className={inputClass} {...register('schoolName')} />
        </FormField>
        <FormField id="address" label="Address (optional)" error={errors.address?.message}>
          <input id="address" placeholder="e.g. Street 5, F-8, Islamabad" className={inputClass} {...register('address')} />
        </FormField>
        <FormField id="phone" label="School phone (optional)" error={errors.phone?.message}>
          <input id="phone" type="tel" placeholder="e.g. 051-1234567" className={inputClass} {...register('phone')} />
        </FormField>

        <SectionTitle>Bank details (optional)</SectionTitle>
        <p className="-mt-2 text-sm text-muted">Printed on the voucher only when filled in.</p>
        <FormField id="bankName" label="Bank name" error={errors.bankName?.message}>
          <input id="bankName" placeholder="e.g. Meezan Bank" className={inputClass} {...register('bankName')} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="accountTitle" label="Account title" error={errors.accountTitle?.message}>
            <input id="accountTitle" className={inputClass} {...register('accountTitle')} />
          </FormField>
          <FormField id="accountNumber" label="Account number" error={errors.accountNumber?.message}>
            <input id="accountNumber" className={inputClass} {...register('accountNumber')} />
          </FormField>
        </div>

        <SectionTitle>Payment instructions</SectionTitle>
        <FormField
          id="paymentInstructions"
          label="Message for parents (optional)"
          hint="Up to 200 characters. If left empty, a standard message is printed."
          error={errors.paymentInstructions?.message}
        >
          <textarea
            id="paymentInstructions"
            rows={3}
            maxLength={200}
            placeholder="e.g. Pay at any branch before the due date. Bring the bank copy to the school office."
            className={inputClass}
            {...register('paymentInstructions')}
          />
        </FormField>

        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-60 sm:w-auto"
        >
          {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
          {t('save')}
        </button>
      </form>

<div className="mt-6">
  <FinePolicyForm />
</div>
<div className="mt-6">
        <AutoReminderForm />
      </div>
</div>
);
}