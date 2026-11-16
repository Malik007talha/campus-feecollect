import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import FormField, { inputClass } from '../common/FormField';
import { useLanguage } from '../../context/LanguageContext';
import { getErrorMessage } from '../../services/api';

const same = (a, b) =>
  String(a ?? '').trim().replace(/\s+/g, ' ').toLowerCase() ===
  String(b ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

export default function ImportRowEditModal({ row, classOptions, onSave, onClose }) {
  const { t } = useLanguage();
  const [data, setData] = useState({ ...row.data });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setData((d) => ({ ...d, [field]: e.target.value }));

  const selectedClass = classOptions.find((c) => same(c.name, data.className) && same(c.section, data.section));

  const handleClassChange = (e) => {
    const chosen = classOptions.find((c) => c._id === e.target.value);
    setData((d) => ({ ...d, className: chosen ? chosen.name : '', section: chosen ? chosen.section : '' }));
  };

  const typeKey = String(data.discountType ?? '').trim().toLowerCase();
  const typeValue = ['none', 'sibling', 'scholarship'].includes(typeKey) ? typeKey : typeKey === '' ? 'none' : '';

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(row.rowNumber, data);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Fix row ${row.rowNumber}`}
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
            form="import-row-form"
            disabled={saving}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-60 sm:flex-none"
          >
            {saving && <Loader2 className="h-5 w-5 animate-spin" />}
            Save and check again
          </button>
        </>
      }
    >
      <form id="import-row-form" onSubmit={submit} className="space-y-4">
        {row.errors.length > 0 && (
          <div className="rounded-md bg-danger-50 p-3 text-sm text-danger-600">
            <p className="font-semibold">Problems with this row:</p>
            <ul className="mt-1 list-disc space-y-0.5 ps-5">
              {row.errors.map((e, i) => (
                <li key={i}>{e.message}</li>
              ))}
            </ul>
          </div>
        )}
        {error && (
          <div role="alert" className="rounded-md bg-danger-50 p-3 text-sm text-danger-600">
            {error}
          </div>
        )}

        <FormField id="ir-name" label="Student name" required>
          <input id="ir-name" className={inputClass} value={data.name} onChange={set('name')} />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="ir-roll" label="Roll number" required>
            <input id="ir-roll" className={inputClass} value={data.rollNo} onChange={set('rollNo')} />
          </FormField>
          <FormField
            id="ir-class"
            label="Class and section"
            required
            hint={!selectedClass ? `In your file: ${data.className || '—'}, Section ${data.section || '—'}` : undefined}
          >
            <select id="ir-class" className={inputClass} value={selectedClass?._id ?? ''} onChange={handleClassChange}>
              <option value="">Choose…</option>
              {classOptions.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} – Section {c.section}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField id="ir-parent" label="Parent name" required>
          <input id="ir-parent" className={inputClass} value={data.parentName} onChange={set('parentName')} />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="ir-phone" label="Parent mobile number" required>
            <input
              id="ir-phone"
              type="tel"
              inputMode="tel"
              placeholder="0300-1234567"
              className={inputClass}
              value={data.parentPhone}
              onChange={set('parentPhone')}
            />
          </FormField>
          <FormField id="ir-email" label="Parent email (optional)">
            <input id="ir-email" type="email" className={inputClass} value={data.parentEmail} onChange={set('parentEmail')} />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField id="ir-dtype" label="Discount type">
            <select
              id="ir-dtype"
              className={inputClass}
              value={typeValue}
              onChange={(e) => setData((d) => ({ ...d, discountType: e.target.value }))}
            >
              <option value="">Choose…</option>
              <option value="none">No discount</option>
              <option value="sibling">Sibling discount</option>
              <option value="scholarship">Scholarship</option>
            </select>
          </FormField>
          <FormField id="ir-dpercent" label="Discount %">
            <input
              id="ir-dpercent"
              inputMode="decimal"
              placeholder="e.g. 10"
              className={inputClass}
              value={data.discountPercent}
              onChange={set('discountPercent')}
            />
          </FormField>
          <FormField id="ir-family" label="Family code">
            <input id="ir-family" placeholder="e.g. RAZA-01" className={inputClass} value={data.familyId} onChange={set('familyId')} />
          </FormField>
        </div>
      </form>
    </Modal>
  );
}
