import { Link } from 'react-router-dom';

export default function StatCard({ label, value, hint, tone = 'text-ink', to }) {
  const body = (
    <>
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </>
  );
  const box = 'block rounded-lg border border-line bg-white p-4';
  return to ? (
    <Link to={to} className={`${box} hover:bg-page`}>
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  );
}