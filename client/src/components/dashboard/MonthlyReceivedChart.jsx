import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { formatRs } from '../../utils/format';
import { monthLabel } from '../../utils/dates';

// "2026-11" -> "Nov 26"
const shortMonth = (key) => {
  const [name, year] = monthLabel(key).split(' ');
  return `${name.slice(0, 3)} ${year.slice(2)}`;
};
const compact = (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v));

export default function MonthlyReceivedChart({ data, selectedMonth }) {
  const rows = data.map((d) => ({ ...d, name: shortMonth(d.month) }));

  if (rows.every((r) => r.amount === 0)) {
    return <p className="py-10 text-center text-muted">No payments were recorded in these months yet.</p>;
  }

  return (
    <div className="h-64" role="img" aria-label="Bar chart of money received in each of the last 6 months">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dde2e9" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={compact} width={44} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => [formatRs(v), 'Received']} cursor={{ fill: '#eef2f7' }} />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
            {rows.map((r) => (
              <Cell key={r.month} fill={r.month === selectedMonth ? '#1d4ed8' : '#93b4f5'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}