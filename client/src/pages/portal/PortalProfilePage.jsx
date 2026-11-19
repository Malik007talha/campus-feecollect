import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { portalService } from '../../services/portalService';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:gap-4">
      <dt className="text-sm text-muted sm:w-44 sm:shrink-0">{label}</dt>
      <dd className="font-medium">{children || '—'}</dd>
    </div>
  );
}

export default function PortalProfilePage() {
  const [state, setState] = useState({ loading: true, error: '', data: null });

  useEffect(() => {
    portalService
      .me()
      .then((data) => setState({ loading: false, error: '', data }))
      .catch((err) => setState({ loading: false, error: getErrorMessage(err), data: null }));
  }, []);

  const { loading, error, data } = state;

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Your details as the school has them." />

      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-white py-12 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-md bg-danger-50 p-4 text-danger-600">
          {error}
        </div>
      )}

      {data && (
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="text-xl font-bold text-navy-900">{data.name}</h2>
          <dl className="mt-2 divide-y divide-line">
            <Row label="Login username">{data.username}</Row>
            <Row label="Class">{data.className}</Row>
            <Row label="Section">{data.section}</Row>
            <Row label="Roll number">{data.rollNo}</Row>
            <Row label="Parent name">{data.parentName}</Row>
            <Row label="Status">
              <StatusBadge status={data.status} />
            </Row>
          </dl>
          <p className="mt-4 text-sm text-muted">
            To correct any detail, please contact the school office. You can change your password with the Change password
            button at the top.
          </p>
        </section>
      )}
    </div>
  );
}