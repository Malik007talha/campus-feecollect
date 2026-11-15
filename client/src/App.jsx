import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import api, { getErrorMessage } from './services/api';

function SetupCheck() {
  const [state, setState] = useState({ status: 'loading', data: null, error: '' });

  useEffect(() => {
    api
      .get('/health')
      .then((res) => setState({ status: 'ok', data: res.data.data, error: '' }))
      .catch((err) => setState({ status: 'error', data: null, error: getErrorMessage(err) }));
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-navy-900">Campus FeeCollect</h1>
        <p className="mt-1 text-sm text-muted">Setup check</p>

        <div className="mt-6">
          {state.status === 'loading' && (
            <p className="flex items-center gap-2 text-muted">
              <Loader2 className="h-5 w-5 animate-spin" /> Connecting to the server…
            </p>
          )}

          {state.status === 'error' && (
            <div className="flex items-start gap-2 rounded-md bg-danger-50 p-3 text-danger-600">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{state.error}</p>
            </div>
          )}

          {state.status === 'ok' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-md bg-success-50 p-3 text-success-600">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-medium">Frontend and backend are connected</p>
              </div>
              <dl className="divide-y divide-line text-sm">
                <div className="flex justify-between py-2">
                  <dt className="text-muted">Database</dt>
                  <dd className="font-medium">{state.data.database}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted">Timezone</dt>
                  <dd className="font-medium">{state.data.timezone}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-muted">Server time</dt>
                  <dd className="font-medium">{state.data.serverTime}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="*" element={<SetupCheck />} />
    </Routes>
  );
}