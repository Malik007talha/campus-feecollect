import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Plus, KeyRound, UserPlus, Loader2, GraduationCap, Power } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { portalAccountService } from '../../services/portalAccountService';
import { classService } from '../../services/classService';
import { getErrorMessage } from '../../services/api';
import useDebounce from '../../hooks/useDebounce';
import { formatDateTime } from '../../utils/format';
import { classText } from '../../constants/students';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import CreateAccountModal from '../../components/portal-accounts/CreateAccountModal';
import BulkAccountsModal from '../../components/portal-accounts/BulkAccountsModal';
import CredentialsModal from '../../components/portal-accounts/CredentialsModal';

const PAGE_SIZE = 20;
const selectClass =
  'min-h-11 w-full rounded-md border border-line bg-white px-3 text-base focus:border-primary-600 focus:outline-none';
const linkBtn = 'inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium hover:bg-page';

function AccountBadge({ account }) {
  if (!account) return <span className="inline-block rounded-full bg-page px-2.5 py-0.5 text-sm font-medium text-muted">No login</span>;
  return account.isActive ? (
    <span className="inline-block rounded-full bg-success-50 px-2.5 py-0.5 text-sm font-medium text-success-600">Active</span>
  ) : (
    <span className="inline-block rounded-full bg-warning-50 px-2.5 py-0.5 text-sm font-medium text-warning-600">Disabled</span>
  );
}

export default function PortalAccountsPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [account, setAccount] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: '', items: [], summary: null, pagination: null });
  const [classOptions, setClassOptions] = useState([]);
  const [creating, setCreating] = useState(null); // a student row
  const [bulk, setBulk] = useState(false);
  const [resetting, setResetting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(null); // { credentials, notes }

  const debounced = useDebounce(search);
  const classNames = useMemo(() => [...new Set(classOptions.map((c) => c.name))], [classOptions]);
  const sections = useMemo(
    () => [...new Set(classOptions.filter((c) => !className || c.name === className).map((c) => c.section))].sort(),
    [classOptions, className]
  );

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const params = { page, limit: PAGE_SIZE };
      if (debounced) params.search = debounced;
      if (className) params.className = className;
      if (section) params.section = section;
      if (account) params.account = account;
      const res = await portalAccountService.list(params);
      setState({ loading: false, error: '', items: res.data.items, summary: res.data.summary, pagination: res.pagination });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: getErrorMessage(err) }));
    }
  }, [page, debounced, className, section, account]);

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

  const created = (credentials, message, notes = []) => {
    setCreating(null);
    setBulk(false);
    toast.success(message);
    setShown({ credentials, notes });
    load();
  };

  const doReset = async () => {
    setBusy(true);
    try {
      const res = await portalAccountService.resetPassword(resetting._id);
      setResetting(null);
      toast.success(res.message);
      setShown({ credentials: res.data.credentials, notes: [] });
    } catch (err) {
      toast.error(getErrorMessage(err));
      setResetting(null);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (row) => {
    try {
      const res = await portalAccountService.setActive(row._id, !row.account.isActive);
      toast.success(res.message);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const { loading, error, items, summary, pagination } = state;
  const filtersActive = Boolean(debounced || className || section || account);

  const actions = (row) => (
    <div className="flex flex-wrap gap-1">
      {!row.account ? (
        <button onClick={() => setCreating(row)} className={`${linkBtn} text-primary-700`}>
          <UserPlus className="h-4 w-4" /> Create login
        </button>
      ) : (
        <>
          <button onClick={() => setResetting(row)} className={`${linkBtn} text-primary-700`}>
            <KeyRound className="h-4 w-4" /> Reset password
          </button>
          <button onClick={() => toggle(row)} className={`${linkBtn} ${row.account.isActive ? 'text-danger-600' : 'text-success-600'}`}>
            <Power className="h-4 w-4" /> {row.account.isActive ? 'Disable' : 'Enable'}
          </button>
        </>
      )}
    </div>
  );

  const bulkButton = (
    <button
      onClick={() => setBulk(true)}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600"
    >
      <Plus className="h-5 w-5" /> Create logins for a class
    </button>
  );

  return (
    <div>
      <PageHeader
        title={t('studentPortal')}
        subtitle="Give students a login so they can see their fee vouchers, download them and check if they are paid. Each student sees only their own fees."
        actions={bulkButton}
      />

      {summary && !error && (
        <p className="mb-4 text-muted">
          <strong className="text-ink">{summary.withAccount}</strong> of <strong className="text-ink">{summary.students}</strong> students have a portal login.
        </p>
      )}

      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={search}
            onChange={onFilter(setSearch)}
            placeholder="Search by student name, roll number or parent"
            aria-label={t('search')}
            className="block min-h-11 w-full rounded-md border border-line bg-white py-2.5 ps-10 pe-3 text-base focus:border-primary-600 focus:outline-none"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <select
            value={className}
            onChange={(e) => {
              setClassName(e.target.value);
              setSection('');
              setPage(1);
            }}
            aria-label="Filter by class"
            className={selectClass}
          >
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
          <select value={account} onChange={onFilter(setAccount)} aria-label="Filter by login" className={selectClass}>
            <option value="">With and without login</option>
            <option value="with">Has a login</option>
            <option value="without">No login yet</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-white py-12 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading students…
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
          icon={GraduationCap}
          title={filtersActive ? 'No students match your search' : 'No students yet'}
          message={filtersActive ? 'Try a different word, or clear the filters.' : 'Add students first, then give them a portal login here.'}
        />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-line bg-white md:block">
            <table className="w-full text-base">
              <thead className="border-b border-line bg-page text-sm text-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">Student</th>
                  <th className="px-4 py-3 text-start font-semibold">Class</th>
                  <th className="px-4 py-3 text-start font-semibold">Username</th>
                  <th className="px-4 py-3 text-start font-semibold">Login</th>
                  <th className="px-4 py-3 text-start font-semibold">Last login</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((row) => (
                  <tr key={row._id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.name}</p>
                      <p className="text-sm text-muted">Roll {row.rollNo}</p>
                    </td>
                    <td className="px-4 py-3">{classText(row.class)}</td>
                    <td className="px-4 py-3">{row.account?.username ?? '—'}</td>
                    <td className="px-4 py-3">
                      <AccountBadge account={row.account} />
                    </td>
                    <td className="px-4 py-3">{formatDateTime(row.account?.lastLoginAt)}</td>
                    <td className="px-4 py-2">{actions(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {items.map((row) => (
              <li key={row._id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-navy-900">{row.name}</p>
                    <p className="text-muted">
                      {classText(row.class)} · Roll {row.rollNo}
                    </p>
                  </div>
                  <AccountBadge account={row.account} />
                </div>
                {row.account && <p className="mt-1 text-sm text-muted">Username: {row.account.username}</p>}
                <div className="mt-3 border-t border-line pt-2">{actions(row)}</div>
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

      {creating && <CreateAccountModal student={creating} onClose={() => setCreating(null)} onCreated={created} />}
      {bulk && <BulkAccountsModal classOptions={classOptions} onClose={() => setBulk(false)} onCreated={created} />}
      {resetting && (
        <ConfirmDialog
          title="Reset this password?"
          message={`${resetting.name} will get a new password, and the old one stops working straight away. You will see the new password once.`}
          confirmLabel="Reset password"
          danger={false}
          loading={busy}
          onConfirm={doReset}
          onCancel={() => setResetting(null)}
        />
      )}
      {shown && <CredentialsModal credentials={shown.credentials} notes={shown.notes} onClose={() => setShown(null)} />}
    </div>
  );
}