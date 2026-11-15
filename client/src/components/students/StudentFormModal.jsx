import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import FormField, { inputClass } from '../common/FormField';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { studentService } from '../../services/studentService';
import { getErrorMessage } from '../../services/api';
import { normalizePkMobile, formatPkPhone } from '../../utils/phone';
import { STATUS_LABELS, DISCOUNT_LABELS } from '../../constants/students';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const schema = z
  .object({
    name: z.string().trim().min(2, 'Please enter the student name').max(80, 'Name is too long'),
    rollNo: z.string().trim().min(1, 'Please enter the roll number').max(20, 'Roll number is too long'),
    classId: z.string().min(1, 'Please choose a class and section'),
    status: z.enum(['active', 'inactive', 'left']),
    parentName: z.string().trim().min(2, 'Please enter the parent name').max(80, 'Name is too long'),
    parentPhone: z
      .string()
      .trim()
      .min(1, 'Please enter the parent phone number')
      .refine((v) => normalizePkMobile(v) !== null, 'Enter a valid mobile number, for example 0300-1234567'),
    parentEmail: z
      .string()
      .trim()
      .refine((v) => v === '' || EMAIL_RX.test(v), 'Enter a valid email address'),
    discountType: z.enum(['none', 'sibling', 'scholarship']),
    discountPercent: z.string().trim(),
    familyId: z.string().trim().max(30, 'Family code is too long'),
  })
  .superRefine((d, ctx) => {
    if (d.discountType !== 'none') {
      const n = Number(d.discountPercent);
      if (d.discountPercent === '' || Number.isNaN(n) || n <= 0 || n > 100) {
        ctx.addIssue({ code: 'custom', path: ['discountPercent'], message: 'Enter a discount between 1 and 100' });
      }
    }
  });

function SectionTitle({ children }) {
  return <h3 className="border-b border-line pb-1 text-sm font-semibold uppercase tracking-wide text-navy-800">{children}</h3>;
}

export default function StudentFormModal({ mode, student, classOptions, onClose, onSaved }) {
  const { t } = useLanguage();
  const toast = useToast();
  const [serverError, setServerError] = useState('');
  const isEdit = mode === 'edit';
  const noClasses = classOptions.length === 0;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? {
          name: student.name,
          rollNo: student.rollNo,
          classId: student.class?._id ?? '',
          status: student.status,
          parentName: student.parentName,
          parentPhone: formatPkPhone(student.parentPhone),
          parentEmail: student.parentEmail || '',
          discountType: student.discountType || 'none',
          discountPercent: student.discountPercent > 0 ? String(student.discountPercent) : '',
          familyId: student.familyId || '',
        }
      : {
          name: '', rollNo: '', classId: '', status: 'active',
          parentName: '', parentPhone: '', parentEmail: '',
          discountType: 'none', discountPercent: '', familyId: '',
        },
  });

  const discountType = watch('discountType');

  const onSubmit = async (v) => {
    setServerError('');
    const payload = {
      name: v.name,
      rollNo: v.rollNo,
      classId: v.classId,
      status: v.status,
      parentName: v.parentName,
      parentPhone: v.parentPhone,
      parentEmail: v.parentEmail,
      discountType: v.discountType,
      discountPercent: v.discountType === 'none' ? 0 : Number(v.discountPercent),
      familyId: v.familyId,
    };
    try {
      const res = isEdit ? await studentService.update(student._id, payload) : await studentService.create(payload);
      toast.success(res.message);
      onSaved();
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit Student' : t('addStudent')}
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
            form="student-form"
            disabled={isSubmitting || noClasses}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-60 sm:flex-none"
          >
            {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
            {t('save')}
          </button>
        </>
      }
    >
      {noClasses ? (
        <div className="rounded-md bg-warning-50 p-4 text-warning-600">
          <p className="font-medium">There are no classes yet.</p>
          <p className="mt-1 text-sm">A student must belong to a class and section. Please add a class first.</p>
          <Link to="/classes" onClick={onClose} className="mt-3 inline-block text-sm font-semibold underline">
            Go to Classes
          </Link>
        </div>
      ) : (
        <form id="student-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {serverError && (
            <div role="alert" className="rounded-md bg-danger-50 p-3 text-sm text-danger-600">
              {serverError}
            </div>
          )}

          <SectionTitle>Student details</SectionTitle>

          <FormField id="name" label="Student name" required error={errors.name?.message}>
            <input id="name" placeholder="e.g. Ali Raza" autoFocus className={inputClass} {...register('name')} />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="rollNo" label="Roll number" required error={errors.rollNo?.message}>
              <input id="rollNo" placeholder="e.g. 12" className={inputClass} {...register('rollNo')} />
            </FormField>
            <FormField id="classId" label="Class and section" required error={errors.classId?.message}>
              <select id="classId" className={inputClass} {...register('classId')}>
                <option value="">Choose…</option>
                {classOptions.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} – Section {c.section}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {isEdit && (
            <FormField id="status" label="Status" required hint="Choose “Left school” for students who have left. Their fee records are kept.">
              <select id="status" className={inputClass} {...register('status')}>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          <SectionTitle>Parent details</SectionTitle>

          <FormField id="parentName" label="Parent name" required error={errors.parentName?.message}>
            <input id="parentName" placeholder="e.g. Muhammad Raza" className={inputClass} {...register('parentName')} />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="parentPhone" label="Parent mobile number" required error={errors.parentPhone?.message}>
              <input
                id="parentPhone"
                type="tel"
                inputMode="tel"
                placeholder="0300-1234567"
                className={inputClass}
                {...register('parentPhone')}
              />
            </FormField>
            <FormField
              id="parentEmail"
              label="Parent email (optional)"
              hint="Used for email reminders."
              error={errors.parentEmail?.message}
            >
              <input
                id="parentEmail"
                type="email"
                placeholder="parent@example.com"
                className={inputClass}
                {...register('parentEmail')}
              />
            </FormField>
          </div>

          <SectionTitle>Discount</SectionTitle>

          <FormField id="discountType" label="Discount type">
            <select id="discountType" className={inputClass} {...register('discountType')}>
              {Object.entries(DISCOUNT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>

          {discountType !== 'none' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="discountPercent"
                label="Discount percentage"
                required
                hint="Taken off the total monthly fee."
                error={errors.discountPercent?.message}
              >
                <input
                  id="discountPercent"
                  type="number"
                  inputMode="decimal"
                  min="1"
                  max="100"
                  step="any"
                  placeholder="e.g. 10"
                  className={inputClass}
                  {...register('discountPercent')}
                />
              </FormField>
              <FormField
                id="familyId"
                label="Family code (optional)"
                hint="Give brothers and sisters the same code, e.g. RAZA-01."
                error={errors.familyId?.message}
              >
                <input id="familyId" placeholder="e.g. RAZA-01" className={inputClass} {...register('familyId')} />
              </FormField>
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}