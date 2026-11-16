import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ClassesPage from './pages/classes/ClassesPage';
import StudentsPage from './pages/students/StudentsPage';
import ImportStudentsPage from './pages/students/ImportStudentsPage';
import FeeStructurePage from './pages/fee-structure/FeeStructurePage';
import ComingSoon from './components/common/ComingSoon';

const placeholders = [
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
          <Route path="classes" element={<ClassesPage />} />
          <Route path="students" element={<StudentsPage />} />
          {placeholders.map(([path, title]) => (
            <Route key={path} path={path} element={<ComingSoon title={title} />} />
          ))}

          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="students/import" element={<ImportStudentsPage />} />
            <Route path="fee-structure" element={<FeeStructurePage />} />
            <Route path="users" element={<ComingSoon title="Users" />} />
            <Route path="settings" element={<ComingSoon title="Settings" />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}