import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatRs } from '../../utils/format';

const compact = (v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v));

export default function ClassCollectionChart({ data }) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-muted">No vouchers for this month yet.</p>;
  }

  const rows = data.map((c) => ({
    name: `${c.className} – ${c.section}`,
    Collected: c.collected,
    Pending: c.billed - c.collected,
  }));
  const height = Math.max(220, rows.length * 36 + 70);

  return (
    <div style={{ height }} role="img" aria-label="Bar chart of collected and pending fees for each class">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#dde2e9" />
          <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v, name) => [formatRs(v), name]} cursor={{ fill: '#eef2f7' }} />
          <Legend />
          <Bar dataKey="Collected" stackId="fees" fill="#15803d" />
          <Bar dataKey="Pending" stackId="fees" fill="#b45309" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}