import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
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
import SettingsPage from './pages/settings/SettingsPage';
import ComingSoon from './components/common/ComingSoon';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
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
            <Route path="users" element={<ComingSoon title="Users" />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}