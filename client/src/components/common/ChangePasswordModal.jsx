import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from './Modal';
import FormField, { inputClass } from './FormField';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import api, { TOKEN_KEY, getErrorMessage } from '../../services/api';

export default function ChangePasswordModal({ onClose }) {
  const { t } = useLanguage();
  const toast = useToast();
  const [form, setForm] = useState({ current: '', next: '', again: '' });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const p = {};
    if (!form.current) p.current = 'Enter your current password';
    if (form.next.length < 10) p.next = 'Use at least 10 characters';
    else if (!/[A-Za-z]/.test(form.next)) p.next = 'Include at least one letter';
    else if (!/\d/.test(form.next)) p.next = 'Include at least one number';
    else if (form.next === form.current) p.next = 'The new password must be different from the current one';
    if (form.again !== form.next) p.again = 'The two new passwords do not match';
    setErrors(p);
    return Object.keys(p).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword: form.current,
        newPassword: form.next,
      });
      localStorage.setItem(TOKEN_KEY, res.data.data.token); // keeps this browser logged in
      toast.success(res.data.message);
      onClose();
    } catch (err) {
      setServerError(getErrorMessage(err));
      setSaving(false);
    }
  };

  const type = show ? 'text' : 'password';

  return (
    <Modal
      title="Change password"
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-11 flex-1 rounded-md border border-line bg-white px-4 text-base font-medium hover:bg-page sm:flex-none"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            form="password-form"
            disabled={saving}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-60 sm:flex-none"
          >
            {saving && <Loader2 className="h-5 w-5 animate-spin" />}
            Change password
          </button>
        </>
      }
    >
      <form id="password-form" onSubmit={submit} noValidate className="space-y-4">
        {serverError && (
          <div role="alert" className="rounded-md bg-danger-50 p-3 text-sm text-danger-600">
            {serverError}
          </div>
        )}
        <FormField id="pw-current" label="Current password" required error={errors.current}>
          <input id="pw-current" type={type} autoComplete="current-password" autoFocus className={inputClass} value={form.current} onChange={set('current')} />
        </FormField>
        <FormField
          id="pw-new"
          label="New password"
          required
          hint="At least 10 characters, with letters and numbers."
          error={errors.next}
        >
          <input id="pw-new" type={type} autoComplete="new-password" className={inputClass} value={form.next} onChange={set('next')} />
        </FormField>
        <FormField id="pw-again" label="Type the new password again" required error={errors.again}>
          <input id="pw-again" type={type} autoComplete="new-password" className={inputClass} value={form.again} onChange={set('again')} />
        </FormField>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="h-5 w-5" />
          Show passwords
        </label>
      </form>
    </Modal>
  );
}