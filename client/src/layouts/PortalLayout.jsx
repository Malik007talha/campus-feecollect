import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { GraduationCap, KeyRound, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import ChangePasswordModal from '../components/common/ChangePasswordModal';

export default function PortalLayout() {
  const { user, logout } = useAuth();
  const { t, toggleLang } = useLanguage();
  const [pwOpen, setPwOpen] = useState(false);

  const tab = ({ isActive }) =>
    `flex min-h-11 shrink-0 items-center border-b-2 px-4 text-base font-medium ${
      isActive ? 'border-primary-700 text-primary-700' : 'border-transparent text-muted hover:text-ink'
    }`;

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy-900 text-white">
              <GraduationCap className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold text-navy-900">{t('appName')}</p>
              <p className="truncate text-sm text-muted">{user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleLang} className="min-h-11 rounded-md px-3 text-sm font-medium text-primary-700 hover:bg-primary-50">
              {t('language')}
            </button>
            <button onClick={() => setPwOpen(true)} className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium hover:bg-page">
              <KeyRound className="h-5 w-5" />
              <span className="hidden sm:inline">Change password</span>
            </button>
            <button onClick={logout} className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium hover:bg-page">
              <LogOut className="h-5 w-5" />
              <span className="hidden sm:inline">{t('logout')}</span>
            </button>
          </div>
        </div>
        <nav aria-label="Student portal" className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4">
          <NavLink to="/portal" end className={tab}>
            My Fees
          </NavLink>
          <NavLink to="/portal/profile" className={tab}>
            My Profile
          </NavLink>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl p-4 sm:p-6">
        <Outlet />
      </main>

      {pwOpen && <ChangePasswordModal onClose={() => setPwOpen(false)} />}
    </div>
  );
}