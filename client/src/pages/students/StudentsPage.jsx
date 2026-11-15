import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Eye, Users, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { studentService } from '../../services/studentService';
import { classService } from '../../services/classService';
import { getErrorMessage } from '../../services/api';
import useDebounce from '../../hooks/useDebounce';
import { formatPkPhone } from '../../utils/phone';
import { classText, discountText, STATUS_LABELS } from '../../constants/students';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StatusBadge from '../../components/common/StatusBadge';
import StudentFormModal from '../../components/students/StudentFormModal';
import StudentDetailsModal from '../../components/students/StudentDetailsModal';

const PAGE_SIZE = 20;
const selectClass =
  'min-h-11 w-full rounded-md border border-line bg-white px-3 text-base focus:border-primary-600 focus:outline-none';

function RowActions({ student, isAdmin, onView, onEdit, onDelete, t }) {
  const btn = 'inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium hover:bg-page';
  return (
    <div className="flex flex-wrap gap-1">
      <button onClick={() => onView(student)} className={`${btn} text-primary-700`}>
        <Eye className="h-4 w-4" /> {t('view')}
      </button>
      {isAdmin && (
        <>
          <button onClick={() => onEdit(student)} className={`${btn} text-primary-700`}>
            <Pencil className="h-4 w-4" /> {t('edit')}
          </button>
          <button onClick={() => onDelete(student)} className={`${btn} text-danger-600`}>
            <Trash2 className="h-4 w-4" /> {t('delete')}
          </button>
        </>
      )}
    </div>
  );
}

export default function StudentsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const isAdmin = user.role === 'admin';

  const [search, setSearch] = useState('');
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: '', items: [], pagination: null });
  const [classOptions, setClassOptions] = useState([]);
  const [modal, setModal] = useState(null); // { mode: 'create' | 'edit' | 'view', student }
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const debouncedSearch = useDebounce(search);

  const classNames = useMemo(() => [...new Set(classOptions.map((c) => c.name))], [classOptions]);
  const sections = useMemo(
    () => [...new Set(classOptions.filter((c) => !className || c.name === className).map((c) => c.section))].sort(),
    [classOptions, className]
  );

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const params = { page, limit: PAGE_SIZE };
      if (debouncedSearch) params.search = debouncedSearch;
      if (className) params.className = className;
      if (section) params.section = section;
      if (status) params.status = status;
      const res = await studentService.list(params);
      setState({ loading: false, error: '', items: res.data, pagination: res.pagination });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: getErrorMessage(err) }));
    }
  }, [page, debouncedSearch, className, section, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    classService.options().then(setClassOptions).catch(() => {});
  }, []);

  const resetPage = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const handleClassChange = (e) => {
    setClassName(e.target.value);
    setSection('');
    setPage(1);
  };

  const handleSaved = () => {
    setModal(null);
    load();
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const res = await studentService.remove(toDelete._id);
      toast.success(res.message);
      setToDelete(null);
      if (state.items.length === 1 && page > 1) setPage((p) => p - 1);
      else load();
    } catch (err) {
      toast.error(getErrorMessage(err));
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const openView = (student) => setModal({ mode: 'view', student });
  const openEdit = (student) => setModal({ mode: 'edit', student });
  const filtersActive = Boolean(debouncedSearch || className || section || status);
  const { loading, error, items, pagination } = state;

  const addButton = isAdmin && (
    <button
      onClick={() => setModal({ mode: 'create' })}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600"
    >
      <Plus className="h-5 w-5" /> {t('addStudent')}
    </button>
  );

  return (
    <div>
      <PageHeader
        title={t('students')}
        subtitle="Find a student by name, roll number or parent. Use the filters to see one class or section."
        actions={addButton}
      />

      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={search}
            onChange={resetPage(setSearch)}
            placeholder="Search by student name, roll number, parent name or phone"
            aria-label={t('search')}
            className="block min-h-11 w-full rounded-md border border-line bg-white py-2.5 ps-10 pe-3 text-base focus:border-primary-600 focus:outline-none"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <select value={className} onChange={handleClassChange} aria-label="Filter by class" className={selectClass}>
            <option value="">All classes</option>
            {classNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select value={section} onChange={resetPage(setSection)} aria-label="Filter by section" className={selectClass}>
            <option value="">All sections</option>
            {sections.map((s) => (
              <option key={s} value={s}>
                Section {s}
              </option>
            ))}
          </select>
          <select value={status} onChange={resetPage(setStatus)} aria-label="Filter by status" className={selectClass}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
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
          icon={Users}
          title={filtersActive ? 'No students match your search' : 'No students yet'}
          message={
            filtersActive
              ? 'Try a different word, or clear the filters.'
              : classOptions.length === 0
                ? 'Students belong to a class and section, so add your classes first.'
                : isAdmin
                  ? 'Add your first student to get started.'
                  : 'The school administrator has not added any students yet.'
          }
          action={
            !filtersActive &&
            (classOptions.length === 0 && isAdmin ? (
              <Link
                to="/classes"
                className="inline-flex min-h-11 items-center rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600"
              >
                Go to Classes
              </Link>
            ) : (
              addButton
            ))
          }
        />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <p className="mb-2 text-sm text-muted">
            {pagination.total} {pagination.total === 1 ? 'student' : 'students'} found
          </p>

          {/* Desktop and tablet: table */}
          <div className="hidden overflow-x-auto rounded-lg border border-line bg-white md:block">
            <table className="w-full text-base">
              <thead className="border-b border-line bg-page text-sm text-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">Student</th>
                  <th className="px-4 py-3 text-start font-semibold">Roll no.</th>
                  <th className="px-4 py-3 text-start font-semibold">Class</th>
                  <th className="px-4 py-3 text-start font-semibold">Parent</th>
                  <th className="px-4 py-3 text-start font-semibold">Discount</th>
                  <th className="px-4 py-3 text-start font-semibold">Status</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((s) => (
                  <tr key={s._id}>
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3">{s.rollNo}</td>
                    <td className="px-4 py-3">{classText(s.class)}</td>
                    <td className="px-4 py-3">
                      <p>{s.parentName}</p>
                      <p className="text-sm text-muted">{formatPkPhone(s.parentPhone)}</p>
                    </td>
                    <td className="px-4 py-3">{discountText(s)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-2">
                      <RowActions
                        student={s}
                        isAdmin={isAdmin}
                        t={t}
                        onView={openView}
                        onEdit={openEdit}
                        onDelete={setToDelete}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones: cards */}
          <ul className="space-y-3 md:hidden">
            {items.map((s) => (
              <li key={s._id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-navy-900">{s.name}</p>
                    <p className="text-muted">
                      {classText(s.class)} · Roll {s.rollNo}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <p className="mt-2 text-sm">
                  <span className="text-muted">Parent: </span>
                  {s.parentName} · {formatPkPhone(s.parentPhone)}
                </p>
                {s.discountPercent > 0 && (
                  <p className="mt-1 text-sm">
                    <span className="text-muted">Discount: </span>
                    {discountText(s)}
                  </p>
                )}
                <div className="mt-3 border-t border-line pt-2">
                  <RowActions
                    student={s}
                    isAdmin={isAdmin}
                    t={t}
                    onView={openView}
                    onEdit={openEdit}
                    onDelete={setToDelete}
                  />
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

      {modal?.mode === 'view' && (
        <StudentDetailsModal
          student={modal.student}
          canEdit={isAdmin}
          onEdit={openEdit}
          onClose={() => setModal(null)}
        />
      )}

      {(modal?.mode === 'create' || modal?.mode === 'edit') && (
        <StudentFormModal
          mode={modal.mode}
          student={modal.student}
          classOptions={classOptions}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete this student?"
          message={`${toDelete.name} will be removed permanently. This cannot be undone. Students who already have fee records cannot be deleted. Use the status "Left school" for them.`}
          confirmLabel={t('delete')}
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}