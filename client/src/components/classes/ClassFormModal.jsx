import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { classService } from '../../services/classService';
import { getErrorMessage } from '../../services/api';
import { STANDARD_CLASS_NAMES } from '../../constants/school';

// "a, b  c" -> ["A", "B", "C"]
const parseSections = (text) => [
  ...new Set(text.split(/[,،\s]+/).map((s) => s.trim().toUpperCase()).filter(Boolean)),
];

const nameField = z.string().trim().min(1, 'Please enter the class name').max(40, 'Class name is too long');

const createSchema = z.object({
  name: nameField,
  sections: z
    .string()
    .refine((v) => parseSections(v).length > 0, 'Please enter at least one section, for example A or A, B, C')
    .refine((v) => parseSections(v).every((s) => s.length <= 10), 'Each section name must be 10 characters or fewer'),
});

const editSchema = z.object({
  name: nameField,
  section: z.string().trim().min(1, 'Please enter the section').max(10, 'Section name is too long'),
});

const inputClass =
  'mt-1 block w-full rounded-md border border-line bg-white px-3 py-3 text-base text-ink placeholder:text-muted/70 focus:border-primary-600 focus:outline-none read-only:bg-page read-only:text-muted';

export default function ClassFormModal({ mode, cls, existingNames, onClose, onSaved }) {
  const { t } = useLanguage();
  const toast = useToast();
  const [serverError, setServerError] = useState('');

  const isEdit = mode === 'edit';
  const isAddSection = mode === 'addSection';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: isEdit
      ? { name: cls.name, section: cls.section }
      : { name: isAddSection ? cls.name : '', sections: '' },
  });

  const suggestions = useMemo(
    () => [...new Set([...existingNames, ...STANDARD_CLASS_NAMES])],
    [existingNames]
  );

  const title = isEdit ? 'Edit Class' : isAddSection ? `Add Section to ${cls.name}` : t('addClass');

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const res = isEdit
        ? await classService.update(cls._id, { name: values.name, section: values.section })
        : await classService.create({ name: values.name, sections: parseSections(values.sections) });
      toast.success(res.message);
      onSaved();
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  return (
    <Modal
      title={title}
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
            form="class-form"
            disabled={isSubmitting}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-60 sm:flex-none"
          >
            {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
            {t('save')}
          </button>
        </>
      }
    >
      <form id="class-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError && (
          <div role="alert" className="rounded-md bg-danger-50 p-3 text-sm text-danger-600">
            {serverError}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            {t('className')} <span className="text-danger-600">*</span>
          </label>
          <input
            id="name"
            list="class-name-options"
            placeholder="e.g. Class 5"
            readOnly={isAddSection}
            autoFocus={!isAddSection}
            className={inputClass}
            {...register('name')}
          />
          <datalist id="class-name-options">
            {suggestions.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          {errors.name && <p className="mt-1 text-sm text-danger-600">{errors.name.message}</p>}
        </div>

        {isEdit ? (
          <div>
            <label htmlFor="section" className="block text-sm font-medium">
              {t('section')} <span className="text-danger-600">*</span>
            </label>
            <input id="section" placeholder="e.g. A" className={inputClass} {...register('section')} />
            {errors.section && <p className="mt-1 text-sm text-danger-600">{errors.section.message}</p>}
          </div>
        ) : (
          <div>
            <label htmlFor="sections" className="block text-sm font-medium">
              Sections <span className="text-danger-600">*</span>
            </label>
            <input
              id="sections"
              placeholder="e.g. A, B, C"
              autoFocus={isAddSection}
              className={inputClass}
              {...register('sections')}
            />
            <p className="mt-1 text-sm text-muted">
              Type one section, or several separated by commas. Each section is created as its own row.
            </p>
            {errors.sections && <p className="mt-1 text-sm text-danger-600">{errors.sections.message}</p>}
          </div>
        )}
      </form>
    </Modal>
  );
}