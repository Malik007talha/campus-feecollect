import { useMemo } from 'react';
import { Search } from 'lucide-react';
import { monthOptions, todayDateString } from '../../utils/dates';

const MONTH_CHOICES = [...monthOptions(12, 3)].reverse();
const field =
  'mt-1 min-h-11 w-full rounded-md border border-line bg-white px-3 text-base focus:border-primary-600 focus:outline-none';

export default function ReportFilters({ config, filters, onChange, classOptions }) {
  const has = (name) => config.filters.includes(name);
  const today = todayDateString();

  const classNames = useMemo(() => [...new Set(classOptions.map((c) => c.name))], [classOptions]);
  const sections = useMemo(
    () => [...new Set(classOptions.filter((c) => !filters.className || c.name === filters.className).map((c) => c.section))].sort(),
    [classOptions, filters.className]
  );

  const set = (key) => (e) => onChange({ [key]: e.target.value });

  return (
    <div className="space-y-3">
      {has('search') && (
        <label className="block text-sm font-medium">
          Student name, roll number, voucher number or receipt number
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={filters.search}
              onChange={set('search')}
              placeholder="e.g. Ali Raza"
              className="block min-h-11 w-full rounded-md border border-line bg-white py-2.5 ps-10 pe-3 text-base focus:border-primary-600 focus:outline-none"
            />
          </div>
        </label>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(has('month') || has('monthRequired')) && (
          <label className="block text-sm font-medium">
            Month
            <select value={filters.month} onChange={set('month')} className={field}>
              {!has('monthRequired') && <option value="">All months</option>}
              {MONTH_CHOICES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {has('dateRange') && (
          <>
            <label className="block text-sm font-medium">
              From
              <input type="date" max={today} value={filters.from} onChange={set('from')} className={field} />
            </label>
            <label className="block text-sm font-medium">
              To
              <input type="date" max={today} value={filters.to} onChange={set('to')} className={field} />
            </label>
          </>
        )}

        {has('class') && (
          <>
            <label className="block text-sm font-medium">
              Class
              <select
                value={filters.className}
                onChange={(e) => onChange({ className: e.target.value, section: '' })}
                className={field}
              >
                <option value="">All classes</option>
                {classNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Section
              <select value={filters.section} onChange={set('section')} className={field}>
                <option value="">All sections</option>
                {sections.map((s) => (
                  <option key={s} value={s}>
                    Section {s}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>
    </div>
  );
}