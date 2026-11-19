import { AlertTriangle, Copy, Download } from 'lucide-react';
import Modal from '../common/Modal';
import { useToast } from '../../context/ToastContext';
import { saveBlob } from '../../utils/download';

const btn =
  'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-line bg-white px-4 text-base font-medium hover:bg-page sm:flex-none';

export default function CredentialsModal({ credentials, notes = [], onClose }) {
  const toast = useToast();
  const loginUrl = `${window.location.origin}/login`;

  const downloadCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Student', 'Class', 'Section', 'Roll no.', 'Username', 'Password', 'Login page'],
      ...credentials.map((c) => [c.studentName, c.className, c.section, c.rollNo, c.username, c.password, loginUrl]),
    ];
    const text = `\uFEFF${rows.map((r) => r.map(esc).join(',')).join('\n')}`;
    saveBlob(new Blob([text], { type: 'text/csv;charset=utf-8' }), 'student-logins.csv');
  };

  const copy = async () => {
    const text = credentials
      .map((c) => `${c.studentName} (${c.className} - ${c.section}, Roll ${c.rollNo})\nUsername: ${c.username}\nPassword: ${c.password}`)
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(`${text}\n\nLogin page: ${loginUrl}`);
      toast.success('Copied');
    } catch {
      toast.error('Could not copy. Please use Download instead.');
    }
  };

  return (
    <Modal
      title={credentials.length === 1 ? 'Student login' : `${credentials.length} student logins`}
      onClose={onClose}
      footer={
        <div className="flex w-full flex-wrap gap-2 sm:justify-end">
          <button type="button" onClick={copy} className={btn}>
            <Copy className="h-5 w-5" /> Copy
          </button>
          <button type="button" onClick={downloadCsv} className={btn}>
            <Download className="h-5 w-5" /> Download list
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600 sm:flex-none"
          >
            Done
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-2 rounded-md bg-warning-50 p-3 text-sm text-warning-600">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Passwords are shown only now and cannot be looked up later. Copy or download them before you close this window.
          If one is lost, use Reset password to make a new one.
        </p>
      </div>
      {notes.map((n) => (
        <p key={n} className="mt-2 text-sm text-muted">
          {n}
        </p>
      ))}
      <p className="mt-3 text-sm text-muted">
        Students log in at <strong className="break-all text-ink">{loginUrl}</strong>
      </p>

      <ul className="mt-3 divide-y divide-line rounded-md border border-line">
        {credentials.map((c) => (
          <li key={c.studentId} className="p-3">
            <p className="font-semibold text-navy-900">{c.studentName}</p>
            <p className="text-sm text-muted">
              {c.className} – Section {c.section} · Roll {c.rollNo}
            </p>
            <p className="mt-1 text-sm">
              Username: <span className="font-mono font-semibold">{c.username}</span>
            </p>
            <p className="text-sm">
              Password: <span className="font-mono font-semibold">{c.password}</span>
            </p>
          </li>
        ))}
      </ul>
    </Modal>
  );
}