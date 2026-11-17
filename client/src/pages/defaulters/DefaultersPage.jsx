import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Eye, Bell, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { defaulterService } from '../../services/defaulterService';
import { classService } from '../../services/classService';
import { getErrorMessage } from '../../services/api';
import useDebounce from '../../hooks/useDebounce';
import { formatRs, formatDate } from '../../utils/format';
import { monthOptions, monthLabel, daysOverdue } from '../../utils/dates';
import { formatPkPhone } from '../../utils/phone';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import VoucherDetailsModal from '../../components/vouchers/VoucherDetailsModal';
import VoucherPdfButtons from '../../components/vouchers/VoucherPdfButtons';
import SendReminderModal from '../../components/defaulters/SendReminderModal';
import ReminderHistoryPanel from '../../components/defaulters/ReminderHistoryPanel';

const PAGE_SIZE = 20;
const MAX_REMINDERS = 100;
const MONTH_CHOICES = [...monthOptions(12, 3)].reverse();
const TABS = [
  ['unpaid', 'Unpaid fees'],
  ['history', 'Reminder history'],
];
const selectClass =
  'min-h-11 w-full rounded-md border border-line bg-white px-3 text-base focus:border-primary-600 focus:outline-none';
const linkBtn = 'inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-primary-700 hover:bg-page';

function Stat({ label, value, tone = 'text-ink' }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function Overdue({ dueDate }) {
  const days = daysOverdue(dueDate);
  return <span className="block text-sm text-danger-600">{days} {days === 1 ? 'day' : 'days'} overdue</span>;
}

export default function DefaultersPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState('unpaid');
  const [search, setSearch] = useState('');
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [month, setMonth] = useState('');
  const [minBalance, setMinBalance] = useState('');
  const [sort, setSort] = useState('due_asc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [state, setState] = useState({ loading: true, error: '', items: [], summary: null, byClass: [], pagination: null });
  const [classOptions, setClassOptions] = useState([]);
  const [viewing, setViewing] = useState(null);
  const [reminding, setReminding] = useState(null);
  const [historyKey, setHistoryKey] = useState(0);

  const debouncedSearch = useDebounce(search);
  const debouncedMin = useDebounce(minBalance);

  const classNames = useMemo(() => [...new Set(classOptions.map((c) => c.name))], [classOptions]);
  const sections = useMemo(
    () => [...new Set(classOptions.filter((c) => !className || c.name === className).map((c) => c.section))].sort(),
    [classOptions, className]
  );

  // The same filters are used for the list and for "remind everyone shown".
  const filterParams = useMemo(() => {
    const p = {};
    if (debouncedSearch) p.search = debouncedSearch;
    if (className) p.className = className;
    if (section) p.section = section;
    if (month) p.month = month;
    if (/^\d+$/.test(debouncedMin.trim())) p.minBalance = Number(debouncedMin.trim());
    p.sort = sort;
    return p;
  }, [debouncedSearch, className, section, month, debouncedMin, sort]);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const res = await defaulterService.list({ page, limit: PAGE_SIZE, ...filterParams });
      setState({
        loading: false,
        error: '',
        items: res.data.items,
        summary: res.data.summary,
        byClass: res.data.byClass,
        pagination: res.pagination,
      });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: getErrorMessage(err) }));
    }
  }, [page, filterParams]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    classService.options().then(setClassOptions).catch(() => {});
  }, []);

  const changeFilter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
    setSelected(new Set());
  };

  const onClassChange = (e) => {
    setClassName(e.target.value);
    setSection('');
    setPage(1);
    setSelected(new Set());
  };

  const pickClass = (c) => {
    setClassName(c.className);
    setSection(c.section);
    setPage(1);
    setSelected(new Set());
  };

  const toggleOne = (id) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const { loading, error, items, summary, byClass, pagination } = state;
  const allOnPage = items.length > 0 && items.every((v) => selected.has(v._id));
  const toggleAll = () =>
    setSelected((s) => {
      const next = new Set(s);
      if (allOnPage) items.forEach((v) => next.delete(v._id));
      else items.forEach((v) => next.add(v._id));
      return next;
    });

  const remindOne = (v) => setReminding({ voucherIds: [v._id], count: 1, label: v.studentName });
  const remindSelected = () =>
    setReminding({
      voucherIds: [...selected],
      count: selected.size,
      label: `${selected.size} selected ${selected.size === 1 ? 'student' : 'students'}`,
    });
  const remindAll = () =>
    setReminding({
      filters: filterParams,
      count: summary.count,
      label: `All ${summary.count} ${summary.count === 1 ? 'student' : 'students'} in this list`,
    });

  const filtersActive = Boolean(debouncedSearch || className || section || month || debouncedMin.trim());

  const clearFilters = () => {
    setSearch('');
    setClassName('');
    setSection('');
    setMonth('');
    setMinBalance('');
    setPage(1);
    setSelected(new Set());
  };

  const remindButton = (v) => (
    <button onClick={() => remindOne(v)} className={linkBtn}>
      <Bell className="h-4 w-4" /> Send reminder
    </button>
  );

  return (
    <div>
      <PageHeader
        title="Students with Unpaid Fees"
        subtitle="Students whose fee is past the due date. Send a reminder to the parent by SMS or email."
      />

      <div role="tablist" className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-11 shrink-0 border-b-2 px-4 text-base font-medium ${
              tab === id ? 'border-primary-700 text-primary-700' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'history' && <ReminderHistoryPanel reloadKey={historyKey} />}

      {tab === 'unpaid' && (
        <>
          {summary && !error && (
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              <Stat label="Overdue vouchers" value={summary.count} />
              <Stat label="Total outstanding" value={formatRs(summary.outstanding)} tone="text-danger-600" />
              <Stat label="Late fines included" value={formatRs(summary.fines)} />
            </div>
          )}

          {byClass.length > 0 && !error && (
            <section className="mb-4 rounded-lg border border-line bg-white p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-navy-800">Outstanding by class</h2>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {byClass.map((c) => (
                  <li key={`${c.className}-${c.section}`}>
                    <button
                      onClick={() => pickClass(c)}
                      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-line px-3 py-2 text-start hover:bg-page"
                    >
                      <span>
                        {c.className} – {c.section}
                        <span className="block text-sm text-muted">
                          {c.count} {c.count === 1 ? 'voucher' : 'vouchers'}
                        </span>
                      </span>
                      <span className="font-semibold">{formatRs(c.outstanding)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mb-4 space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={search}
                onChange={changeFilter(setSearch)}
                placeholder="Search by student, roll number, voucher number, parent name or phone"
                aria-label={t('search')}
                className="block min-h-11 w-full rounded-md border border-line bg-white py-2.5 ps-10 pe-3 text-base focus:border-primary-600 focus:outline-none"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <select value={className} onChange={onClassChange} aria-label="Filter by class" className={selectClass}>
                <option value="">All classes</option>
                {classNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <select value={section} onChange={changeFilter(setSection)} aria-label="Filter by section" className={selectClass}>
                <option value="">All sections</option>
                {sections.map((s) => (
                  <option key={s} value={s}>
                    Section {s}
                  </option>
                ))}
              </select>
              <select value={month} onChange={changeFilter(setMonth)} aria-label="Filter by month" className={selectClass}>
                <option value="">All months</option>
                {MONTH_CHOICES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <input
                inputMode="numeric"
                value={minBalance}
                onChange={changeFilter(setMinBalance)}
                placeholder="Minimum balance (Rs)"
                aria-label="Minimum balance in rupees"
                className={selectClass}
              />
              <select value={sort} onChange={changeFilter(setSort)} aria-label="Sort by" className={selectClass}>
                <option value="due_asc">Oldest due date first</option>
                <option value="due_desc">Newest due date first</option>
                <option value="balance_desc">Highest balance first</option>
                <option value="balance_asc">Lowest balance first</option>
                <option value="name">Student name (A to Z)</option>
              </select>
              {filtersActive && (
                <button onClick={clearFilters} className="min-h-11 rounded-md border border-line bg-white px-3 text-base font-medium text-primary-700 hover:bg-page">
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {summary && summary.count > 0 && !error && (
            <div className="mb-4 flex flex-col gap-2 rounded-lg border border-line bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">
                {selected.size > 0
                  ? `${selected.size} ${selected.size === 1 ? 'student' : 'students'} selected`
                  : 'Tick students to remind several at once, or remind everyone in this list.'}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                {selected.size > 0 && (
                  <button
                    onClick={remindSelected}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600"
                  >
                    <Bell className="h-5 w-5" /> Remind selected
                  </button>
                )}
                <button
                  onClick={remindAll}
                  disabled={summary.count > MAX_REMINDERS}
                  title={summary.count > MAX_REMINDERS ? `Choose a class or section first (up to ${MAX_REMINDERS} at a time)` : undefined}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-primary-700 bg-white px-4 text-base font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-50"
                >
                  <Bell className="h-5 w-5" /> Remind all {summary.count}
                </button>
              </div>
              {summary.count > MAX_REMINDERS && (
                <p className="text-sm text-warning-600 sm:hidden">Choose a class or section to remind everyone (up to {MAX_REMINDERS}).</p>
              )}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-white py-12 text-muted">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading students with unpaid fees…
            </div>
          )}

          {!loading && error && (
            <div role="alert" className="flex flex-col items-start gap-3 rounded-md bg-danger-50 p-4 text-danger-600">
              <p>{error}</p>
              <button onClick={load} className="min-h-10 rounded-md border border-danger-600 px-4 text-sm font-medium">
                Try again
              </button>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <EmptyState
              icon={AlertCircle}
              title={filtersActive ? 'No students match your search' : 'No overdue fees'}
              message={
                filtersActive
                  ? 'Try a different word, or clear the filters.'
                  : 'Every voucher is paid or not yet due. Students appear here after the due date passes.'
              }
            />
          )}

          {!loading && !error && items.length > 0 && (
            <>
              {/* Desktop and tablet: table */}
              <div className="hidden overflow-x-auto rounded-lg border border-line bg-white md:block">
                <table className="w-full text-base">
                  <thead className="border-b border-line bg-page text-sm text-muted">
                    <tr>
                      <th className="px-3 py-3">
                        <input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select all on this page" className="h-5 w-5" />
                      </th>
                      <th className="px-3 py-3 text-start font-semibold">Student</th>
                      <th className="px-3 py-3 text-start font-semibold">Parent</th>
                      <th className="px-3 py-3 text-start font-semibold">Voucher</th>
                      <th className="px-3 py-3 text-start font-semibold">Due date</th>
                      <th className="px-3 py-3 text-start font-semibold">Total</th>
                      <th className="px-3 py-3 text-start font-semibold">Paid</th>
                      <th className="px-3 py-3 text-start font-semibold">Fine</th>
                      <th className="px-3 py-3 text-start font-semibold">Balance</th>
                      <th className="px-3 py-3 text-start font-semibold">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {items.map((v) => (
                      <tr key={v._id} className={selected.has(v._id) ? 'bg-primary-50' : ''}>
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(v._id)}
                            onChange={() => toggleOne(v._id)}
                            aria-label={`Select ${v.studentName}`}
                            className="h-5 w-5"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium">{v.studentName}</p>
                          <p className="text-sm text-muted">
                            {v.className} – {v.section} · Roll {v.rollNo}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <p>{v.parentName || '—'}</p>
                          <p className="text-sm text-muted">{formatPkPhone(v.parentPhone)}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p>{v.voucherNo}</p>
                          <p className="text-sm text-muted">{monthLabel(v.month)}</p>
                        </td>
                        <td className="px-3 py-3">
                          {formatDate(v.dueDate)}
                          <Overdue dueDate={v.dueDate} />
                        </td>
                        <td className="px-3 py-3">{formatRs(v.total)}</td>
                        <td className="px-3 py-3">{formatRs(v.paid)}</td>
                        <td className="px-3 py-3">{v.fine > 0 ? formatRs(v.fine) : '—'}</td>
                        <td className="px-3 py-3 font-semibold text-danger-600">{formatRs(v.balance)}</td>
                        <td className="px-3 py-2">
                          <div className="flex max-w-[16rem] flex-wrap gap-1">
                            <button onClick={() => setViewing(v)} className={linkBtn}>
                              <Eye className="h-4 w-4" /> {t('view')}
                            </button>
                            <VoucherPdfButtons voucherId={v._id} fileName={`fee-voucher-${v.voucherNo}`} />
                            {remindButton(v)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Phones: cards */}
              <ul className="space-y-3 md:hidden">
                {items.map((v) => (
                  <li key={v._id} className={`rounded-lg border border-line p-4 ${selected.has(v._id) ? 'bg-primary-50' : 'bg-white'}`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected.has(v._id)}
                        onChange={() => toggleOne(v._id)}
                        aria-label={`Select ${v.studentName}`}
                        className="mt-1 h-5 w-5 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-semibold text-navy-900">{v.studentName}</p>
                        <p className="text-muted">
                          {v.className} – {v.section} · Roll {v.rollNo}
                        </p>
                        <p className="text-sm text-muted">
                          {v.parentName || '—'} · {formatPkPhone(v.parentPhone)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      {v.voucherNo} · {monthLabel(v.month)}
                    </p>
                    <dl className="mt-1 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted">Due date</dt>
                        <dd className="text-end">
                          {formatDate(v.dueDate)}
                          <Overdue dueDate={v.dueDate} />
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted">Total</dt>
                        <dd>{formatRs(v.total)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted">Paid</dt>
                        <dd>{formatRs(v.paid)}</dd>
                      </div>
                      {v.fine > 0 && (
                        <div className="flex justify-between">
                          <dt className="text-muted">Late fine</dt>
                          <dd>{formatRs(v.fine)}</dd>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold">
                        <dt>Balance</dt>
                        <dd className="text-danger-600">{formatRs(v.balance)}</dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-1 border-t border-line pt-2">
                      <button onClick={() => setViewing(v)} className={linkBtn}>
                        <Eye className="h-4 w-4" /> {t('view')}
                      </button>
                      <VoucherPdfButtons voucherId={v._id} fileName={`fee-voucher-${v.voucherNo}`} />
                      {remindButton(v)}
                    </div>
                  </li>
                ))}
              </ul>

              {pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page <= 1}
                    className="min-h-11 rounded-md border border-line bg-white px-4 text-sm font-medium hover:bg-page disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <p className="text-sm text-muted">
                    Page {pagination.page} of {pagination.totalPages}
                  </p>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= pagination.totalPages}
                    className="min-h-11 rounded-md border border-line bg-white px-4 text-sm font-medium hover:bg-page disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {viewing && <VoucherDetailsModal voucher={viewing} onClose={() => setViewing(null)} onChanged={load} />}

      {reminding && (
        <SendReminderModal
          target={reminding}
          onClose={() => setReminding(null)}
          onDone={() => {
            setHistoryKey((k) => k + 1);
            setSelected(new Set());
          }}
        />
      )}
    </div>
  );
}