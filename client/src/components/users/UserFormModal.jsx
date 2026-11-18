import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import FormField, { inputClass } from '../common/FormField';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { userService } from '../../services/userService';
import { getErrorMessage } from '../../services/api';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordProblem(p) {
  if (p.length < 10) return 'Use at least 10 characters';
  if (!/[A-Za-z]/.test(p)) return 'Include at least one letter';
  if (!/\d/.test(p)) return 'Include at least one number';
  return '';
}

export default function UserFormModal({ mode, target, isSelf, onClose, onSaved }) {
  const { t } = useLanguage();
  const toast = useToast();
  const isEdit = mode === 'edit';
  const [form, setForm] = useState(
    isEdit
      ? { name: target.name, username: target.username, email: target.email, role: target.role, isActive: target.isActive, password: '' }
      : { name: '', username: '', email: '', role: 'accountant', isActive: true, password: '' }
  );
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const p = {};
    if (form.name.trim().length < 2) p.name = 'Please enter the full name';
    if (!isEdit && !/^[a-z0-9._]{3,30}$/.test(form.username.trim().toLowerCase())) {
      p.username = 'Use 3 to 30 letters, numbers, dots or underscores, with no spaces';
    }
    if (!EMAIL_RX.test(form.email.trim())) p.email = 'Enter a valid email address';
    if (!isEdit || form.password) {
      const problem = passwordProblem(form.password);
      if (problem) p.password = problem;
    }
    setErrors(p);
    return Object.keys(p).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSaving(true);
    try {
      const res = isEdit
        ? await userService.update(target._id, {
            name: form.name.trim(),
            email: form.email.trim(),
            ...(isSelf ? {} : { role: form.role, isActive: form.isActive }),
            ...(form.password && !isSelf ? { password: form.password } : {}),
          })
        : await userService.create({
            name: form.name.trim(),
            username: form.username.trim().toLowerCase(),
            email: form.email.trim(),
            password: form.password,
            role: form.role,
          });
      toast.success(res.message);
      onSaved();
    } catch (err) {
      setServerError(
        err.response?.status === 409 ? 'This username or email is already used by another user.' : getErrorMessage(err)
      );
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit user' : 'Add user'}
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
            form="user-form"
            disabled={saving}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-60 sm:flex-none"
          >
            {saving && <Loader2 className="h-5 w-5 animate-spin" />}
            {t('save')}
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} noValidate className="space-y-4">
        {serverError && (
          <div role="alert" className="rounded-md bg-danger-50 p-3 text-sm text-danger-600">
            {serverError}
          </div>
        )}

        <FormField id="u-name" label="Full name" required error={errors.name}>
          <input id="u-name" autoFocus placeholder="e.g. Ayesha Khan" className={inputClass} value={form.name} onChange={set('name')} />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="u-username"
            label="Username"
            required={!isEdit}
            hint={isEdit ? 'The username cannot be changed.' : 'Used to log in. Letters and numbers only.'}
            error={errors.username}
          >
            <input
              id="u-username"
              placeholder="e.g. ayesha.khan"
              readOnly={isEdit}
              className={`${inputClass} read-only:bg-page read-only:text-muted`}
              value={form.username}
              onChange={set('username')}
            />
          </FormField>
          <FormField id="u-email" label="Email" required error={errors.email}>
            <input id="u-email" type="email" placeholder="name@example.com" className={inputClass} value={form.email} onChange={set('email')} />
          </FormField>
        </div>

        <FormField
          id="u-role"
          label="Role"
          required
          hint={
            isSelf
              ? 'You cannot change your own role.'
              : 'Admin manages everything. Accountant generates vouchers, records payments and sends reminders.'
          }
        >
          <select id="u-role" className={inputClass} value={form.role} onChange={set('role')} disabled={isSelf}>
            <option value="accountant">Accountant</option>
            <option value="admin">Admin</option>
          </select>
        </FormField>

        <FormField
          id="u-password"
          label={isEdit ? 'New password (optional)' : 'Password'}
          required={!isEdit}
          hint={
            isSelf
              ? 'To change your own password, use Change password in the top bar.'
              : isEdit
                ? 'Leave empty to keep the current password. Setting one logs the user out everywhere.'
                : 'At least 10 characters, with letters and numbers. Tell the user to change it after the first login.'
          }
          error={errors.password}
        >
          <input
            id="u-password"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            disabled={isSelf}
            className={`${inputClass} disabled:bg-page`}
            value={form.password}
            onChange={set('password')}
          />
        </FormField>
        {!isSelf && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="h-5 w-5" />
            Show password
          </label>
        )}

        {isEdit && !isSelf && (
          <label className="flex min-h-11 cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="mt-1 h-5 w-5"
            />
            <span>
              Account is active
              <span className="block text-sm text-muted">Untick to stop this person from logging in. Their records are kept.</span>
            </span>
          </label>
        )}
      </form>
    </Modal>
  );
}