import { useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { feeService } from '../../services/feeService';
import { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { inputClass } from '../common/FormField';
import ConfirmDialog from '../common/ConfirmDialog';

export default function FeeTypesPanel({ heads, onChanged }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [toRemove, setToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  const add = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Please enter the fee name, for example Library fee');
      return;
    }
    setAdding(true);
    setError('');
    try {
      const res = await feeService.addHead(trimmed);
      toast.success(res.message);
      setName('');
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  const remove = async () => {
    setRemoving(true);
    try {
      const res = await feeService.removeHead(toRemove);
      toast.success(res.message);
      setToRemove(null);
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
      setToRemove(null);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-muted">
        These are the kinds of fee a class can charge each month. Add your own, for example Library fee or Computer fee.
      </p>

      <form onSubmit={add} noValidate className="rounded-lg border border-line bg-white p-4">
        <label htmlFor="head-name" className="block text-sm font-medium">
          New fee type
        </label>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <input
            id="head-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Library fee"
            maxLength={40}
            className={`${inputClass} sm:flex-1`}
            style={{ marginTop: 0 }}
          />
          <button
            type="submit"
            disabled={adding}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-60"
          >
            {adding ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
            Add fee type
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-danger-600">{error}</p>}
      </form>

      {heads.length === 0 ? (
        <p className="rounded-md bg-warning-50 p-3 text-warning-600">
          There are no fee types yet. Add at least one, for example Tuition.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-white">
          {heads.map((h) => (
            <li key={h} className="flex items-center justify-between gap-3 px-4 py-2">
              <span className="font-medium">{h}</span>
              <button
                onClick={() => setToRemove(h)}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-danger-600 hover:bg-page"
              >
                <Trash2 className="h-4 w-4" /> Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {toRemove && (
        <ConfirmDialog
          title="Remove this fee type?"
          message={`"${toRemove}" will be removed from the list. A fee type that a class still uses cannot be removed.`}
          confirmLabel="Remove"
          loading={removing}
          onConfirm={remove}
          onCancel={() => setToRemove(null)}
        />
      )}
    </div>
  );
}