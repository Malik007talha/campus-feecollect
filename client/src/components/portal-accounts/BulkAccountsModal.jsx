import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import FormField, { inputClass } from '../common/FormField';
import { useLanguage } from '../../context/LanguageContext';
import { portalAccountService } from '../../services/portalAccountService';
import { getErrorMessage } from '../../services/api';

export default function BulkAccountsModal({ classOptions, onClose, onCreated }) {
  const { t } = useLanguage();
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const names = useMemo(() => [...new Set(classOptions.map((c) => c.name))], [classOptions]);
  const sections = useMemo(
    () => [...new Set(classOptions.filter((c) => c.name === className).map((c) => c.section))].sort(),
    [classOptions, className]
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!className) {
      setError('Please choose a class');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await portalAccountService.bulk({ className, ...(section ? { section } : {}) });
      const notes = [];
      if (res.data.alreadyHad > 0) notes.push(`${res.data.alreadyHad} students already had a login and were not changed.`);
      if (res.data.failed.length > 0) notes.push(`Could not create a login for: ${res.data.failed.join(', ')}. Try them one by one.`);
      onCreated(res.data.credentials, res.message, notes);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Create logins for a class"
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
            form="bulk-form"
            disabled={saving}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-60 sm:flex-none"
          >
            {saving && <Loader2 className="h-5 w-5 animate-spin" />}
            {saving ? 'Creating…' : 'Create logins'}
          </button>
        </>
      }
    >
      <form id="bulk-form" onSubmit={submit} noValidate className="space-y-4">
        {error && (
          <div role="alert" className="rounded-md bg-danger-50 p-3 text-sm text-danger-600">
            {error}
          </div>
        )}
        <p className="text-sm text-muted">
          Makes a username and a random password for every active student in the class who does not have a login yet.
          Up to 60 students at a time, so choose a section for big classes. The passwords are shown once, and you can
          download them as a list.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="b-class" label="Class" required>
            <select id="b-class" className={inputClass} value={className} onChange={(e) => { setClassName(e.target.value); setSection(''); }}>
              <option value="">Choose…</option>
              {names.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="b-section" label="Section">
            <select id="b-section" className={inputClass} value={section} onChange={(e) => setSection(e.target.value)} disabled={!className}>
              <option value="">All sections</option>
              {sections.map((s) => (
                <option key={s} value={s}>
                  Section {s}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </form>
    </Modal>
  );
}