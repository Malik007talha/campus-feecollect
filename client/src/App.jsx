import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ComingSoon from './components/common/ComingSoon';

const placeholders = [
  ['students', 'Students'],
  ['classes', 'Classes'],
  ['vouchers', 'Fee Vouchers'],
  ['payments', 'Payments'],
  ['defaulters', 'Unpaid Fees'],
  ['reports', 'Reports'],
];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          {placeholders.map(([path, title]) => (
            <Route key={path} path={path} element={<ComingSoon title={title} />} />
          ))}

          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="fee-structure" element={<ComingSoon title="Fee Structure" />} />
            <Route path="users" element={<ComingSoon title="Users" />} />
            <Route path="settings" element={<ComingSoon title="Settings" />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}