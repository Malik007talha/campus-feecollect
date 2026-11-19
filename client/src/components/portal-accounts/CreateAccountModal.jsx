import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import FormField, { inputClass } from '../common/FormField';
import { useLanguage } from '../../context/LanguageContext';
import { portalAccountService } from '../../services/portalAccountService';
import { getErrorMessage } from '../../services/api';
import { classText } from '../../constants/students';

export default function CreateAccountModal({ student, onClose, onCreated }) {
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const p = {};
    const u = username.trim().toLowerCase();
    if (u && !/^[a-z0-9._]{3,30}$/.test(u)) p.username = 'Use 3 to 30 letters, numbers, dots or underscores, with no spaces';
    if (password) {
      if (password.length < 10) p.password = 'Use at least 10 characters';
      else if (!/[A-Za-z]/.test(password)) p.password = 'Include at least one letter';
      else if (!/\d/.test(password)) p.password = 'Include at least one number';
    }
    setErrors(p);
    if (Object.keys(p).length) return;

    setSaving(true);
    setServerError('');
    try {
      const res = await portalAccountService.create({
        studentId: student._id,
        ...(u ? { username: u } : {}),
        ...(password ? { password } : {}),
      });
      onCreated(res.data.credentials, res.message);
    } catch (err) {
      setServerError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Create student login"
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
            form="account-form"
            disabled={saving}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-60 sm:flex-none"
          >
            {saving && <Loader2 className="h-5 w-5 animate-spin" />}
            Create login
          </button>
        </>
      }
    >
      <form id="account-form" onSubmit={submit} noValidate className="space-y-4">
        {serverError && (
          <div role="alert" className="rounded-md bg-danger-50 p-3 text-sm text-danger-600">
            {serverError}
          </div>
        )}
        <div className="rounded-md bg-page p-3">
          <p className="text-lg font-semibold text-navy-900">{student.name}</p>
          <p className="text-sm text-muted">
            {classText(student.class)} · Roll {student.rollNo}
          </p>
        </div>
        <FormField id="a-username" label="Username (optional)" hint="Leave empty to make one automatically, for example ali.raza.001." error={errors.username}>
          <input id="a-username" className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} />
        </FormField>
        <FormField id="a-password" label="Password (optional)" hint="Leave empty to make a secure password automatically." error={errors.password}>
          <input id="a-password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
        </FormField>
      </form>
    </Modal>
  );
}