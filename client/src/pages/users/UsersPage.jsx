import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, UserCog, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { userService } from '../../services/userService';
import { getErrorMessage } from '../../services/api';
import { formatDateTime } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import UserFormModal from '../../components/users/UserFormModal';

const ROLE = { admin: 'Admin', accountant: 'Accountant' };

function ActiveBadge({ active }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-medium ${
        active ? 'bg-success-50 text-success-600' : 'bg-page text-muted'
      }`}
    >
      {active ? 'Active' : 'Disabled'}
    </span>
  );
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const { t } = useLanguage();
  const [state, setState] = useState({ loading: true, error: '', items: [] });
  const [modal, setModal] = useState(null); // { mode, target }

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      setState({ loading: false, error: '', items: await userService.list() });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: getErrorMessage(err) }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { loading, error, items } = state;

  const addButton = (
    <button
      onClick={() => setModal({ mode: 'create' })}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600"
    >
      <Plus className="h-5 w-5" /> Add user
    </button>
  );

  const editButton = (u) => (
    <button
      onClick={() => setModal({ mode: 'edit', target: u })}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-primary-700 hover:bg-page"
    >
      <Pencil className="h-4 w-4" /> {t('edit')}
    </button>
  );

  return (
    <div>
      <PageHeader
        title={t('users')}
        subtitle="People who can log in. Accountants handle daily fee work. Admins also manage classes, fees, settings and users."
        actions={addButton}
      />

      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-white py-12 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading users…
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
        <EmptyState icon={UserCog} title="No users yet" action={addButton} />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-line bg-white md:block">
            <table className="w-full text-base">
              <thead className="border-b border-line bg-page text-sm text-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">Name</th>
                  <th className="px-4 py-3 text-start font-semibold">Username</th>
                  <th className="px-4 py-3 text-start font-semibold">Email</th>
                  <th className="px-4 py-3 text-start font-semibold">Role</th>
                  <th className="px-4 py-3 text-start font-semibold">Status</th>
                  <th className="px-4 py-3 text-start font-semibold">Last login</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((u) => (
                  <tr key={u._id}>
                    <td className="px-4 py-3 font-medium">
                      {u.name}
                      {u._id === me._id && <span className="ms-2 text-sm font-normal text-muted">(you)</span>}
                    </td>
                    <td className="px-4 py-3">{u.username}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{ROLE[u.role] ?? u.role}</td>
                    <td className="px-4 py-3">
                      <ActiveBadge active={u.isActive} />
                    </td>
                    <td className="px-4 py-3">{formatDateTime(u.lastLoginAt)}</td>
                    <td className="px-4 py-2">{editButton(u)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {items.map((u) => (
              <li key={u._id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-navy-900">
                      {u.name} {u._id === me._id && <span className="text-sm font-normal text-muted">(you)</span>}
                    </p>
                    <p className="text-muted">
                      {ROLE[u.role] ?? u.role} · {u.username}
                    </p>
                  </div>
                  <ActiveBadge active={u.isActive} />
                </div>
                <p className="mt-1 break-all text-sm text-muted">{u.email}</p>
                <p className="text-sm text-muted">Last login: {formatDateTime(u.lastLoginAt)}</p>
                <div className="mt-3 border-t border-line pt-2">{editButton(u)}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      {modal && (
        <UserFormModal
          mode={modal.mode}
          target={modal.target}
          isSelf={modal.target?._id === me._id}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}