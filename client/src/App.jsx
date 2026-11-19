import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import PortalLayout from './layouts/PortalLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ClassesPage from './pages/classes/ClassesPage';
import StudentsPage from './pages/students/StudentsPage';
import ImportStudentsPage from './pages/students/ImportStudentsPage';
import FeeStructurePage from './pages/fee-structure/FeeStructurePage';
import VouchersPage from './pages/vouchers/VouchersPage';
import GenerateVouchersPage from './pages/vouchers/GenerateVouchersPage';
import PaymentsPage from './pages/payments/PaymentsPage';
import DefaultersPage from './pages/defaulters/DefaultersPage';
import ReportsPage from './pages/reports/ReportsPage';
import UsersPage from './pages/users/UsersPage';
import SettingsPage from './pages/settings/SettingsPage';
import PortalAccountsPage from './pages/portal-accounts/PortalAccountsPage';
import PortalFeesPage from './pages/portal/PortalFeesPage';
import PortalProfilePage from './pages/portal/PortalProfilePage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        {/* Student portal: student logins only */}
        <Route element={<ProtectedRoute roles={['student']} />}>
          <Route element={<PortalLayout />}>
            <Route path="portal" element={<PortalFeesPage />} />
            <Route path="portal/profile" element={<PortalProfilePage />} />
          </Route>
        </Route>

        {/* School staff */}
        <Route element={<ProtectedRoute roles={['admin', 'accountant']} />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="classes" element={<ClassesPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="vouchers" element={<VouchersPage />} />
            <Route path="vouchers/generate" element={<GenerateVouchersPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="defaulters" element={<DefaultersPage />} />
            <Route path="reports" element={<ReportsPage />} />

            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="students/import" element={<ImportStudentsPage />} />
              <Route path="fee-structure" element={<FeeStructurePage />} />
              <Route path="portal-accounts" element={<PortalAccountsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}