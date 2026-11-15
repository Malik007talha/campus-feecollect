import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, School, Loader2, PlusCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { classService } from '../../services/classService';
import { getErrorMessage } from '../../services/api';
import useDebounce from '../../hooks/useDebounce';
import { formatRs } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ClassFormModal from '../../components/classes/ClassFormModal';

const PAGE_SIZE = 20;
const classLabel = (c) => `${c.name} – Section ${c.section}`;

function FeeSummary({ cls }) {
  if (!cls.monthlyFees?.length) return <span className="text-muted">Not set yet</span>;
  const total = cls.monthlyFees.reduce((sum, f) => sum + f.amount, 0);
  return <span>{formatRs(total)} / month</span>;
}

function RowActions({ cls, onEdit, onAddSection, onDelete, t }) {
  const btn =
    'inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium hover:bg-page';
  return (
    <div className="flex flex-wrap gap-1">
      <button onClick={() => onEdit(cls)} className={`${btn} text-primary-700`}>
        <Pencil className="h-4 w-4" /> {t('edit')}
      </button>
      <button onClick={() => onAddSection(cls)} className={`${btn} text-primary-700`}>
        <PlusCircle className="h-4 w-4" /> Add section
      </button>
      <button onClick={() => onDelete(cls)} className={`${btn} text-danger-600`}>
        <Trash2 className="h-4 w-4" /> {t('delete')}
      </button>
    </div>
  );
}

export default function ClassesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const isAdmin = user.role === 'admin';

  const [search, setSearch] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: '', items: [], pagination: null });
  const [names, setNames] = useState([]);
  const [modal, setModal] = useState(null); // { mode, cls }
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const debouncedSearch = useDebounce(search);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const params = { page, limit: PAGE_SIZE };
      if (debouncedSearch) params.search = debouncedSearch;
      if (nameFilter) params.name = nameFilter;
      const res = await classService.list(params);
      setState({ loading: false, error: '', items: res.data, pagination: res.pagination });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: getErrorMessage(err) }));
    }
  }, [page, debouncedSearch, nameFilter]);

  const loadNames = useCallback(() => {
    classService.names().then(setNames).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadNames();
  }, [loadNames]);

  const handleSaved = () => {
    setModal(null);
    load();
    loadNames();
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const res = await classService.remove(toDelete._id);
      toast.success(res.message);
      setToDelete(null);
      if (state.items.length === 1 && page > 1) setPage((p) => p - 1);
      else load();
      loadNames();
    } catch (err) {
      toast.error(getErrorMessage(err));
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const openAdd = () => setModal({ mode: 'create' });
  const filtersActive = Boolean(debouncedSearch || nameFilter);
  const { loading, error, items, pagination } = state;

  const addButton = isAdmin && (
    <button
      onClick={openAdd}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600"
    >
      <Plus className="h-5 w-5" /> {t('addClass')}
    </button>
  );

  return (
    <div>
      <PageHeader
        title={t('classes')}
        subtitle="Add your school's classes and their sections. Each student is placed in one class and section."
        actions={addButton}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by class or section"
            aria-label={t('search')}
            className="block min-h-11 w-full rounded-md border border-line bg-white py-2.5 ps-10 pe-3 text-base focus:border-primary-600 focus:outline-none"
          />
        </div>
        <select
          value={nameFilter}
          onChange={(e) => {
            setNameFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by class"
          className="min-h-11 rounded-md border border-line bg-white px-3 text-base focus:border-primary-600 focus:outline-none sm:w-56"
        >
          <option value="">All classes</option>
          {names.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-white py-12 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading classes…
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
          icon={School}
          title={filtersActive ? 'No classes match your search' : 'No classes yet'}
          message={
            filtersActive
              ? 'Try a different word, or clear the filter.'
              : isAdmin
                ? 'Start by adding your first class, for example Class 1 with sections A and B.'
                : 'The school administrator has not added any classes yet.'
          }
          action={!filtersActive && addButton}
        />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          {/* Desktop and tablet: table */}
          <div className="hidden overflow-x-auto rounded-lg border border-line bg-white md:block">
            <table className="w-full text-start text-base">
              <thead className="border-b border-line bg-page text-sm text-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">Class</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('section')}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('students')}</th>
                  <th className="px-4 py-3 text-start font-semibold">Monthly fee</th>
                  {isAdmin && <th className="px-4 py-3 text-start font-semibold">{t('actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((c) => (
                  <tr key={c._id}>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">{c.section}</td>
                    <td className="px-4 py-3">{c.studentCount}</td>
                    <td className="px-4 py-3">
                      <FeeSummary cls={c} />
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-2">
                        <RowActions
                          cls={c}
                          t={t}
                          onEdit={(cls) => setModal({ mode: 'edit', cls })}
                          onAddSection={(cls) => setModal({ mode: 'addSection', cls })}
                          onDelete={setToDelete}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones: cards */}
          <ul className="space-y-3 md:hidden">
            {items.map((c) => (
              <li key={c._id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-navy-900">{c.name}</p>
                    <p className="text-muted">
                      {t('section')} {c.section}
                    </p>
                  </div>
                  <p className="rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700">
                    {c.studentCount} {t('students').toLowerCase()}
                  </p>
                </div>
                <p className="mt-2 text-sm">
                  <span className="text-muted">Monthly fee: </span>
                  <FeeSummary cls={c} />
                </p>
                {isAdmin && (
                  <div className="mt-3 border-t border-line pt-2">
                    <RowActions
                      cls={c}
                      t={t}
                      onEdit={(cls) => setModal({ mode: 'edit', cls })}
                      onAddSection={(cls) => setModal({ mode: 'addSection', cls })}
                      onDelete={setToDelete}
                    />
                  </div>
                )}
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

      {modal && (
        <ClassFormModal
          mode={modal.mode}
          cls={modal.cls}
          existingNames={names}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete this section?"
          message={`${classLabel(toDelete)} will be removed permanently. This cannot be undone.`}
          confirmLabel={t('delete')}
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}