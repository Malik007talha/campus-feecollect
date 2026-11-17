import { formatRs, formatDate, formatDateTime } from '../../utils/format';

function show(value, type) {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'money') return formatRs(value);
  if (type === 'date') return formatDate(value);
  if (type === 'percent') return `${value}%`;
  if (type === 'number') return Number(value).toLocaleString('en-PK');
  return String(value);
}

const isNumeric = (type) => type === 'money' || type === 'number' || type === 'percent';

export default function ReportView({ report }) {
  const { columns, rows, totals, summary, school, title, filters, generatedAt, truncated } = report;
  const hasTotals = totals && Object.keys(totals).length > 0 && rows.length > 0;

  return (
    <article className="rounded-lg border border-line bg-white p-4 sm:p-6">
      <header className="border-b border-line pb-3">
        <p className="text-sm font-semibold text-navy-800">{school.schoolName}</p>
        {(school.address || school.phone) && (
          <p className="text-sm text-muted">{[school.address, school.phone].filter(Boolean).join('  |  ')}</p>
        )}
        <h2 className="mt-2 text-xl font-bold text-navy-900">{title}</h2>
        {filters.length > 0 && <p className="text-sm text-muted">{filters.join('  ·  ')}</p>}
        <p className="text-sm text-muted">Prepared on {formatDateTime(generatedAt)}</p>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className="rounded-md border border-line p-3">
            <p className="text-sm text-muted">{s.label}</p>
            <p className="mt-0.5 text-lg font-bold text-ink">{show(s.value, s.type)}</p>
          </div>
        ))}
      </div>

      {truncated && (
        <p className="mt-4 rounded-md bg-warning-50 p-3 text-sm text-warning-600">
          Only the first 2,000 rows are shown, and the totals cover those rows. Use the filters to narrow the report.
        </p>
      )}

      {rows.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed border-line p-8 text-center text-muted">
          Nothing matches these filters. Try a different month, class or date range.
        </p>
      ) : (
        <>
          {/* Tablet, desktop and print: table */}
          <div className="report-table-wrap mt-4 hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-page text-muted">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className={`px-3 py-2 font-semibold ${isNumeric(c.type) ? 'text-end' : 'text-start'}`}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r, i) => (
                  <tr key={i}>
                    {columns.map((c) => (
                      <td key={c.key} className={`px-3 py-2 ${isNumeric(c.type) ? 'text-end' : 'text-start'}`}>
                        {show(r[c.key], c.type)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {hasTotals && (
                <tfoot className="border-t-2 border-line bg-page font-semibold">
                  <tr>
                    {columns.map((c, i) => (
                      <td key={c.key} className={`px-3 py-2 ${isNumeric(c.type) ? 'text-end' : 'text-start'}`}>
                        {i === 0 ? `Total (${rows.length})` : c.key in totals ? show(totals[c.key], c.type) : ''}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Phones: one card per row */}
          <ul className="report-cards mt-4 space-y-3 md:hidden">
            {rows.map((r, i) => (
              <li key={i} className="rounded-lg border border-line p-3">
                <p className="text-base font-semibold text-navy-900">{show(r[columns[0].key], columns[0].type)}</p>
                <dl className="mt-1 space-y-1 text-sm">
                  {columns.slice(1).map((c) => (
                    <div key={c.key} className="flex justify-between gap-3">
                      <dt className="text-muted">{c.label}</dt>
                      <dd className="text-end font-medium">{show(r[c.key], c.type)}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
            {hasTotals && (
              <li className="rounded-lg border-2 border-line bg-page p-3">
                <p className="font-semibold">Total ({rows.length})</p>
                <dl className="mt-1 space-y-1 text-sm">
                  {columns
                    .filter((c) => c.key in totals)
                    .map((c) => (
                      <div key={c.key} className="flex justify-between gap-3">
                        <dt className="text-muted">{c.label}</dt>
                        <dd className="text-end font-semibold">{show(totals[c.key], c.type)}</dd>
                      </div>
                    ))}
                </dl>
              </li>
            )}
          </ul>
        </>
      )}
    </article>
  );
}