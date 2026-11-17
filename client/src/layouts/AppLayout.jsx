import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Users, School, ListChecks, FileText, Wallet,
  AlertCircle, BarChart3, Settings, LogOut, Menu, X, GraduationCap, UserCog,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const NAV = [
  { to: '/', key: 'home', icon: LayoutDashboard, roles: ['admin', 'accountant'], end: true },
  { to: '/students', key: 'students', icon: Users, roles: ['admin', 'accountant'] },
  { to: '/classes', key: 'classes', icon: School, roles: ['admin', 'accountant'] },
  { to: '/fee-structure', key: 'feeStructure', icon: ListChecks, roles: ['admin'] },
  { to: '/vouchers', key: 'feeVouchers', icon: FileText, roles: ['admin', 'accountant'] },
  { to: '/payments', key: 'payments', icon: Wallet, roles: ['admin', 'accountant'] },
  { to: '/defaulters', key: 'unpaidFees', icon: AlertCircle, roles: ['admin', 'accountant'] },
  { to: '/reports', key: 'reports', icon: BarChart3, roles: ['admin', 'accountant'] },
  { to: '/users', key: 'users', icon: UserCog, roles: ['admin'] },
  { to: '/settings', key: 'settings', icon: Settings, roles: ['admin'] },
];

function SidebarContent({ onNavigate }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const items = NAV.filter((n) => n.roles.includes(user.role));

  return (
    <nav aria-label="Main" className="flex-1 space-y-1 px-3 py-4">
      {items.map(({ to, key, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-base font-medium ${
              isActive ? 'bg-primary-700 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`
          }
        >
          <Icon className="h-5 w-5 shrink-0" />
          {t(key)}
        </NavLink>
      ))}
    </nav>
  );
}

function Brand() {
  const { t } = useLanguage();
  return (
    <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
      <GraduationCap className="h-7 w-7 text-white" />
      <span className="text-lg font-bold text-white">{t('appName')}</span>
    </div>
  );
}

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { t, toggleLang } = useLanguage();

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-navy-900 lg:flex">
        <Brand />
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 start-0 flex w-72 max-w-[85%] flex-col bg-navy-900">
            <div className="flex items-center justify-between pe-2">
              <Brand />
              <button
                onClick={() => setOpen(false)}
                aria-label={t('close')}
                className="flex h-11 w-11 items-center justify-center rounded-md text-white hover:bg-white/10"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-white px-4">
          <button
            onClick={() => setOpen(true)}
            aria-label={t('menu')}
            className="flex h-11 w-11 items-center justify-center rounded-md text-ink hover:bg-page lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="ms-auto flex items-center gap-2">
            <button
              onClick={toggleLang}
              className="min-h-11 rounded-md px-3 text-sm font-medium text-primary-700 hover:bg-primary-50"
            >
              {t('language')}
            </button>
            <div className="hidden text-end sm:block">
              <p className="text-sm font-semibold leading-tight">{user.name}</p>
              <p className="text-xs capitalize text-muted">{user.role}</p>
            </div>
            <button
              onClick={logout}
              className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-ink hover:bg-page"
            >
              <LogOut className="h-5 w-5" />
              <span className="hidden sm:inline">{t('logout')}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}