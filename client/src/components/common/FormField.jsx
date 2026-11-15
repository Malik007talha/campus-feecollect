// Shared input style for every form in the app.
// eslint-disable-next-line react-refresh/only-export-components
export const inputClass =
  'mt-1 block w-full rounded-md border border-line bg-white px-3 py-3 text-base text-ink placeholder:text-muted/70 focus:border-primary-600 focus:outline-none';

export default function FormField({ id, label, required, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && <span className="text-danger-600"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-sm text-muted">{hint}</p>}
      {error && <p className="mt-1 text-sm text-danger-600">{error}</p>}
    </div>
  );
}