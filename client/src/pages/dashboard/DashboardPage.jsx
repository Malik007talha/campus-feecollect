import { useAuth } from '../../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-900">Welcome, {user.name}</h1>
      <p className="mt-1 text-muted">Your school's fee summary will appear here once students and vouchers are added.</p>
    </div>
  );
}