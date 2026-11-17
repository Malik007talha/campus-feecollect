import { useEffect, useMemo, useRef, useState } from 'react';
import { Printer, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { reportService } from '../../services/reportService';
import { classService } from '../../services/classService';
import { getErrorMessage } from '../../services/api';
import useDebounce from '../../hooks/useDebounce';
import { currentMonthKey, todayDateString } from '../../utils/dates';
import { REPORTS } from '../../constants/reports';
import PageHeader from '../../components/common/PageHeader';
import ReportFilters from '../../components/reports/ReportFilters';
import ReportView from '../../components/reports/ReportView';

const defaultsFor = (id) => ({
  month: id === 'classwise' ? currentMonthKey() : '',
  from: id === 'collection' ? `${currentMonthKey()}-01` : '',
  to: id === 'collection' ? todayDateString() : '',
  className: '',
  section: '',
  search: '',
});

export default function ReportsPage() {
  const { t } = useLanguage();
  const [reportId, setReportId] = useState('collection');
  const [filters, setFilters] = useState(() => defaultsFor('collection'));
  const [classOptions, setClassOptions] = useState([]);
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const latest = useRef(0);

  const config = REPORTS.find((r) => r.id === reportId);
  const debouncedSearch = useDebounce(filters.search);

  useEffect(() => {
    classService.options().then(setClassOptions).catch(() => {});
  }, []);

  // Only the filters this report uses are sent to the server.
  const params = useMemo(() => {
    const has = (name) => config.filters.includes(name);
    const p = {};
    if ((has('month') || has('monthRequired')) && filters.month) p.month = filters.month;
    if (has('dateRange')) {
      if (filters.from) p.from = filters.from;
      if (filters.to) p.to = filters.to;
    }
    if (has('class')) {
      if (filters.className) p.className = filters.className;
      if (filters.section) p.section = filters.section;
    }
    if (has('search') && debouncedSearch.trim()) p.search = debouncedSearch.trim();
    return p;
  }, [config, filters.month, filters.from, filters.to, filters.className, filters.section, debouncedSearch]);

  const waitingForSearch = config.needsSearch && (params.search?.length ?? 0) < 2;

  useEffect(() => {
    if (waitingForSearch) {
      latest.current += 1;
      setState({ loading: false, error: '', data: null });
      return;
    }
    const id = ++latest.current;
    setState((s) => ({ ...s, loading: true, error: '' }));
    reportService
      .get(reportId, params)
      .then((data) => id === latest.current && setState({ loading: false, error: '', data }))
      .catch((err) => id === latest.current && setState({ loading: false, error: getErrorMessage(err), data: null }));
  }, [reportId, params, waitingForSearch]);

  const choose = (id) => {
    setReportId(id);
    setFilters(defaultsFor(id));
  };

  const change = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const { loading, error, data } = state;

  const printButton = (
    <button
      onClick={() => window.print()}
      disabled={!data}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
    >
      <Printer className="h-5 w-5" /> Print report
    </button>
  );

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title={t('reports')}
          subtitle="Choose a report, set the filters, then print it. Every figure comes from your saved vouchers and payments."
          actions={printButton}
        />

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REPORTS.map((r) => (
            <button
              key={r.id}
              onClick={() => choose(r.id)}
              aria-pressed={reportId === r.id}
              className={`min-h-11 rounded-lg border p-3 text-start ${
                reportId === r.id ? 'border-primary-600 bg-primary-50' : 'border-line bg-white hover:bg-page'
              }`}
            >
              <span className="block font-semibold text-navy-900">{r.title}</span>
              <span className="block text-sm text-muted">{r.hint}</span>
            </button>
          ))}
        </div>

        <div className="mb-4 rounded-lg border border-line bg-white p-4">
          <ReportFilters config={config} filters={filters} onChange={change} classOptions={classOptions} />
        </div>
      </div>

      {waitingForSearch && (
        <p className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-muted">
          Type a student&apos;s name, roll number or voucher number above to see their payment history.
        </p>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-white py-12 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" /> Preparing the report…
        </div>
      )}

      {!loading && error && (
        <div role="alert" className="rounded-md bg-danger-50 p-4 text-danger-600">
          {error}
        </div>
      )}

      {!loading && !error && data && <ReportView report={data} />}
    </div>
  );
}