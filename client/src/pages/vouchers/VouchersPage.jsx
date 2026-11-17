import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Eye, FileText, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { voucherService } from '../../services/voucherService';
import { classService } from '../../services/classService';
import { getErrorMessage } from '../../services/api';
import useDebounce from '../../hooks/useDebounce';
import { formatRs, formatDate } from '../../utils/format';
import { currentMonthKey, monthOptions, monthLabel } from '../../utils/dates';
import { VOUCHER_STATUS_LABELS } from '../../constants/vouchers';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import VoucherStatusBadge from '../../components/vouchers/VoucherStatusBadge';
import VoucherDetailsModal from '../../components/vouchers/VoucherDetailsModal';
import VoucherPdfButtons from '../../components/vouchers/VoucherPdfButtons';

const PAGE_SIZE = 20;
const MONTH_CHOICES = [...monthOptions(12, 3)].reverse(); // newest first
const selectClass =
  'min-h-11 w-full rounded-md border border-line bg-white px-3 text-base focus:border-primary-600 focus:outline-none';
const linkBtn =
  'inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-primary-700 hover:bg-page';

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-ink">{value}</p>
    </div>
  );
}

export default function VouchersPage() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const initialMonth = /^\d{4}-\d{2}$/.test(searchParams.get('month') ?? '') ? searchParams.get('month') : currentMonthKey();

  const [month, setMonth] = useState(initialMonth);
  const [search, setSearch] = useState('');
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: '', items: [], summary: null, pagination: null });
  const [classOptions, setClassOptions] = useState([]);
  const [viewing, setViewing] = useState(null);

  const debouncedSearch = useDebounce(search);

  const classNames = useMemo(() => [...new Set(classOptions.map((c) => c.name))], [classOptions]);
  const sections = useMemo(
    () => [...new Set(classOptions.filter((c) => !className || c.name === className).map((c) => c.section))].sort(),
    [classOptions, className]
  );

  // The same filters are used for the list and for "Download all".
  const filterParams = useMemo(() => {
    const p = {};
    if (month) p.month = month;
    if (debouncedSearch) p.search = debouncedSearch;
    if (className) p.className = className;
    if (section) p.section = section;
    if (status) p.status = status;
    return p;
  }, [month, debouncedSearch, className, section, status]);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const res = await voucherService.list({ page, limit: PAGE_SIZE, ...filterParams });
      setState({ loading: false, error: '', items: res.data.items, summary: res.data.summary, pagination: res.pagination });
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

  const onFilter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const onClassChange = (e) => {
    setClassName(e.target.value);
    setSection('');
    setPage(1);
  };

  const filtersActive = Boolean(debouncedSearch || className || section || status);
  const { loading, error, items, summary, pagination } = state;

  const generateButton = (
    <Link
      to="/vouchers/generate"
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600"
    >
      <Plus className="h-5 w-5" /> {t('generateVouchers')}
    </Link>
  );

  const headerActions = (
    <>
      {month && !error && items.length > 0 && <VoucherPdfButtons bulk params={filterParams} />}
      {generateButton}
    </>
  );

  return (
    <div>
      <PageHeader
        title={t('feeVouchers')}
        subtitle="Every student's monthly fee voucher. Generate a month's vouchers, then download or print them."
        actions={headerActions}
      />

      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={search}
            onChange={onFilter(setSearch)}
            placeholder="Search by voucher number, student, roll number or parent"
            aria-label={t('search')}
            className="block min-h-11 w-full rounded-md border border-line bg-white py-2.5 ps-10 pe-3 text-base focus:border-primary-600 focus:outline-none"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select value={month} onChange={onFilter(setMonth)} aria-label="Filter by month" className={selectClass}>
            <option value="">All months</option>
            {MONTH_CHOICES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select value={className} onChange={onClassChange} aria-label="Filter by class" className={selectClass}>
            <option value="">All classes</option>
            {classNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select value={section} onChange={onFilter(setSection)} aria-label="Filter by section" className={selectClass}>
            <option value="">All sections</option>
            {sections.map((s) => (
              <option key={s} value={s}>
                Section {s}
              </option>
            ))}
          </select>
          <select value={status} onChange={onFilter(setStatus)} aria-label="Filter by status" className={selectClass}>
            <option value="">All statuses</option>
            {Object.entries(VOUCHER_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {summary && !error && (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Vouchers" value={summary.count} />
          <Stat label="Total fees" value={formatRs(summary.total)} />
          <Stat label="Collected" value={formatRs(summary.paid)} />
          <Stat label="Pending" value={formatRs(summary.pending)} />
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-white py-12 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading vouchers…
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
          icon={FileText}
          title={filtersActive ? 'No vouchers match your search' : month ? `No vouchers for ${monthLabel(month)}` : 'No vouchers yet'}
          message={
            filtersActive
              ? 'Try a different word, or clear the filters.'
              : 'Press Generate Vouchers to create this month’s vouchers for your students.'
          }
          action={!filtersActive && generateButton}
        />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          {/* Desktop and tablet: table */}
          <div className="hidden overflow-x-auto rounded-lg border border-line bg-white md:block">
            <table className="w-full text-base">
              <thead className="border-b border-line bg-page text-sm text-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">Voucher no.</th>
                  <th className="px-4 py-3 text-start font-semibold">Student</th>
                  <th className="px-4 py-3 text-start font-semibold">Class</th>
                  <th className="px-4 py-3 text-start font-semibold">Due date</th>
                  <th className="px-4 py-3 text-start font-semibold">Total</th>
                  <th className="px-4 py-3 text-start font-semibold">Balance</th>
                  <th className="px-4 py-3 text-start font-semibold">Status</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((v) => (
                  <tr key={v._id}>
                    <td className="px-4 py-3 font-medium">{v.voucherNo}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{v.studentName}</p>
                      <p className="text-sm text-muted">Roll {v.rollNo}</p>
                    </td>
                    <td className="px-4 py-3">
                      {v.className} – {v.section}
                    </td>
                    <td className="px-4 py-3">{formatDate(v.dueDate)}</td>
                    <td className="px-4 py-3">{formatRs(v.total)}</td>
                    <td className="px-4 py-3 font-semibold">{formatRs(v.total - v.paid)}</td>
                    <td className="px-4 py-3">
                      <VoucherStatusBadge status={v.status} />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        <button onClick={() => setViewing(v)} className={linkBtn}>
                          <Eye className="h-4 w-4" /> {t('view')}
                        </button>
                        <VoucherPdfButtons voucherId={v._id} fileName={`fee-voucher-${v.voucherNo}`} />
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
              <li key={v._id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-navy-900">{v.studentName}</p>
                    <p className="text-muted">
                      {v.className} – {v.section} · Roll {v.rollNo}
                    </p>
                  </div>
                  <VoucherStatusBadge status={v.status} />
                </div>
                <p className="mt-1 text-sm text-muted">{v.voucherNo}</p>
                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted">Due date</dt>
                    <dd>{formatDate(v.dueDate)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Total</dt>
                    <dd>{formatRs(v.total)}</dd>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <dt>Balance</dt>
                    <dd>{formatRs(v.total - v.paid)}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-1 border-t border-line pt-2">
                  <button onClick={() => setViewing(v)} className={linkBtn}>
                    <Eye className="h-4 w-4" /> {t('view')}
                  </button>
                  <VoucherPdfButtons voucherId={v._id} fileName={`fee-voucher-${v.voucherNo}`} />
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

      {viewing && <VoucherDetailsModal voucher={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}