import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Download, Upload, Loader2, CheckCircle2, AlertTriangle, Pencil, ArrowLeft, FileSpreadsheet,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { studentService } from '../../services/studentService';
import { classService } from '../../services/classService';
import { getErrorMessage } from '../../services/api';
import { saveBlob } from '../../utils/download';
import PageHeader from '../../components/common/PageHeader';
import ImportRowEditModal from '../../components/students/ImportRowEditModal';

const MAX_FILE_MB = 5;

const tones = {
  neutral: 'text-ink',
  success: 'text-success-600',
  warning: 'text-warning-600',
  danger: 'text-danger-600',
};

function Stat({ label, value, tone = 'neutral' }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tones[tone]}`}>{value}</p>
    </div>
  );
}

function Problems({ row }) {
  if (row.valid) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-0.5 text-sm font-medium text-success-600">
        <CheckCircle2 className="h-4 w-4" /> Ready
      </span>
    );
  }
  return (
    <ul className="space-y-1 text-sm text-danger-600">
      {row.errors.map((e, i) => (
        <li key={i} className="flex gap-1.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{e.message}</span>
        </li>
      ))}
    </ul>
  );
}

function FixButton({ row, onClick }) {
  return (
    <button
      onClick={() => onClick(row)}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-primary-700 hover:bg-page"
    >
      <Pencil className="h-4 w-4" /> {row.valid ? 'Edit' : 'Fix'}
    </button>
  );
}

export default function ImportStudentsPage() {
  const toast = useToast();
  const fileRef = useRef(null);

  const [step, setStep] = useState('upload'); // upload | preview | done
  const [busy, setBusy] = useState(''); // '' | template | parse | commit
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState(null);
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [result, setResult] = useState(null);
  const [classOptions, setClassOptions] = useState([]);

  useEffect(() => {
    classService.options().then(setClassOptions).catch(() => {});
  }, []);

  const visibleRows = useMemo(() => {
    if (!preview) return [];
    if (filter === 'invalid') return preview.rows.filter((r) => !r.valid);
    if (filter === 'valid') return preview.rows.filter((r) => r.valid);
    return preview.rows;
  }, [preview, filter]);

  const handleDownload = async () => {
    setBusy('template');
    try {
      const blob = await studentService.downloadTemplate();
      saveBlob(blob, 'student-import-template.xlsx');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!/\.xlsx$/i.test(file.name)) {
      setError('Please choose an Excel file that ends in .xlsx. CSV and older .xls files are not supported. Start from the sample file.');
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`This file is larger than ${MAX_FILE_MB} MB. Please split it into smaller files.`);
      return;
    }

    setError('');
    setBusy('parse');
    setFileName(file.name);
    try {
      const data = await studentService.parseImportFile(file);
      setPreview(data);
      setFilter(data.summary.invalid > 0 ? 'invalid' : 'all');
      setStep('preview');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const handleSaveRow = async (rowNumber, data) => {
    const rows = preview.rows.map((r) => ({ rowNumber: r.rowNumber, data: r.rowNumber === rowNumber ? data : r.data }));
    const next = await studentService.validateImportRows(rows); // throws to the modal on error
    setPreview(next);
    setEditing(null);
    const updated = next.rows.find((r) => r.rowNumber === rowNumber);
    if (updated?.valid) toast.success(`Row ${rowNumber} is ready to import`);
    else toast.error(`Row ${rowNumber} still has a problem. See the message in the list.`);
  };

  const handleImport = async () => {
    setBusy('commit');
    try {
      const rows = preview.rows.map(({ rowNumber, data }) => ({ rowNumber, data }));
      const res = await studentService.commitImport(rows);
      setResult(res.data);
      setStep('done');
      toast.success(res.message);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const startOver = () => {
    setStep('upload');
    setPreview(null);
    setResult(null);
    setFileName('');
    setError('');
  };

  const backLink = (
    <Link to="/students" className="mb-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline">
      <ArrowLeft className="h-4 w-4" /> Back to Students
    </Link>
  );

  /* ---------------------------------- Step 1 ---------------------------------- */
  if (step === 'upload') {
    return (
      <div>
        {backLink}
        <PageHeader
          title="Import Students from Excel"
          subtitle="Add many students at once. Download the sample file, fill it in, then upload it. You can check and fix everything before anything is saved."
        />

        {error && (
          <div role="alert" className="mb-4 rounded-md bg-danger-50 p-3 text-danger-600">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-lg border border-line bg-white p-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-navy-800">Step 1</p>
            <h2 className="mt-1 text-lg font-semibold">Download the sample Excel file</h2>
            <p className="mt-1 text-muted">
              Type one student per row in the <strong>Students</strong> sheet. The file also lists your current classes, so you can copy the exact names.
            </p>
            <button
              onClick={handleDownload}
              disabled={busy === 'template'}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-primary-700 bg-white px-4 text-base font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-60"
            >
              {busy === 'template' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
              Download sample file
            </button>
          </section>

          <section className="rounded-lg border border-line bg-white p-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-navy-800">Step 2</p>
            <h2 className="mt-1 text-lg font-semibold">Upload your filled file</h2>
            <p className="mt-1 text-muted">
              Choose an .xlsx file (up to {MAX_FILE_MB} MB and 1,000 students). Classes must already exist on the Classes page.
            </p>
            <input ref={fileRef} type="file" accept=".xlsx" onChange={handleFile} className="sr-only" id="excel-file" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy === 'parse'}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-60"
            >
              {busy === 'parse' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              {busy === 'parse' ? 'Checking your file…' : 'Choose Excel file'}
            </button>
          </section>
        </div>
      </div>
    );
  }

  /* ---------------------------------- Step 3 ---------------------------------- */
  if (step === 'done') {
    return (
      <div>
        {backLink}
        <PageHeader title="Import finished" />

        <div className="rounded-lg border border-success-600/30 bg-success-50 p-5 text-success-600">
          <p className="flex items-center gap-2 text-lg font-semibold">
            <CheckCircle2 className="h-6 w-6" />
            {result.imported} {result.imported === 1 ? 'student was' : 'students were'} imported
          </p>
        </div>

        {result.skipped.length > 0 && (
          <div className="mt-4 rounded-lg border border-warning-600/30 bg-warning-50 p-5">
            <p className="flex items-center gap-2 font-semibold text-warning-600">
              <AlertTriangle className="h-5 w-5" />
              {result.skipped.length} {result.skipped.length === 1 ? 'row was' : 'rows were'} not imported
            </p>
            <p className="mt-1 text-sm text-ink">Fix these in your Excel file and import them again.</p>
            <ul className="mt-3 divide-y divide-warning-600/20">
              {result.skipped.map((s) => (
                <li key={s.rowNumber} className="py-2 text-sm">
                  <p className="font-medium">
                    Row {s.rowNumber}: {s.name || '(no name)'}
                  </p>
                  <ul className="list-disc ps-5 text-muted">
                    {s.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/students"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600"
          >
            View students
          </Link>
          <button
            onClick={startOver}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-white px-4 text-base font-medium hover:bg-page"
          >
            Import another file
          </button>
        </div>
      </div>
    );
  }

  /* ---------------------------------- Step 2 ---------------------------------- */
  const { summary } = preview;
  return (
    <div>
      {backLink}
      <PageHeader
        title="Check your students"
        subtitle={`File: ${fileName}. Nothing has been saved yet. Fix the highlighted rows, or leave them out.`}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Rows in file" value={summary.total} />
        <Stat label="Ready to import" value={summary.valid} tone="success" />
        <Stat label="Need fixing" value={summary.invalid} tone={summary.invalid ? 'danger' : 'neutral'} />
        <Stat label="Duplicate roll numbers" value={summary.duplicates} tone={summary.duplicates ? 'warning' : 'neutral'} />
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-line bg-white p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold">
            {summary.valid > 0
              ? `${summary.valid} ${summary.valid === 1 ? 'student is' : 'students are'} ready to import`
              : 'No rows are ready to import yet'}
          </p>
          {summary.invalid > 0 && (
            <p className="text-sm text-muted">
              The {summary.invalid} {summary.invalid === 1 ? 'row' : 'rows'} with problems will be skipped unless you fix them.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={startOver}
            disabled={busy === 'commit'}
            className="min-h-11 rounded-md border border-line bg-white px-4 text-base font-medium hover:bg-page"
          >
            Choose another file
          </button>
          <button
            onClick={handleImport}
            disabled={summary.valid === 0 || busy === 'commit'}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {busy === 'commit' ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSpreadsheet className="h-5 w-5" />}
            Import {summary.valid} {summary.valid === 1 ? 'student' : 'students'}
          </button>
        </div>
      </div>

      <div className="mb-3 max-w-xs">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Show rows"
          className="min-h-11 w-full rounded-md border border-line bg-white px-3 text-base focus:border-primary-600 focus:outline-none"
        >
          <option value="all">Show all rows ({summary.total})</option>
          <option value="invalid">Show rows that need fixing ({summary.invalid})</option>
          <option value="valid">Show rows that are ready ({summary.valid})</option>
        </select>
      </div>

      {visibleRows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-muted">
          No rows to show here.
        </div>
      ) : (
        <>
          {/* Desktop and tablet: table */}
          <div className="hidden overflow-x-auto rounded-lg border border-line bg-white md:block">
            <table className="w-full text-base">
              <thead className="border-b border-line bg-page text-sm text-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">Row</th>
                  <th className="px-4 py-3 text-start font-semibold">Student</th>
                  <th className="px-4 py-3 text-start font-semibold">Roll no.</th>
                  <th className="px-4 py-3 text-start font-semibold">Class</th>
                  <th className="px-4 py-3 text-start font-semibold">Parent</th>
                  <th className="px-4 py-3 text-start font-semibold">Result</th>
                  <th className="px-4 py-3 text-start font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visibleRows.map((r) => (
                  <tr key={r.rowNumber} className={r.valid ? '' : 'bg-danger-50/60'}>
                    <td className="px-4 py-3 text-muted">{r.rowNumber}</td>
                    <td className="px-4 py-3 font-medium">{r.data.name || '—'}</td>
                    <td className="px-4 py-3">{r.data.rollNo || '—'}</td>
                    <td className="px-4 py-3">
                      {r.data.className || '—'} {r.data.section && `– ${r.data.section}`}
                    </td>
                    <td className="px-4 py-3">
                      <p>{r.data.parentName || '—'}</p>
                      <p className="text-sm text-muted">{r.data.parentPhone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Problems row={r} />
                    </td>
                    <td className="px-4 py-2">
                      <FixButton row={r} onClick={setEditing} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones: cards */}
          <ul className="space-y-3 md:hidden">
            {visibleRows.map((r) => (
              <li
                key={r.rowNumber}
                className={`rounded-lg border p-4 ${r.valid ? 'border-line bg-white' : 'border-danger-600/30 bg-danger-50/60'}`}
              >
                <p className="text-sm text-muted">Row {r.rowNumber}</p>
                <p className="text-lg font-semibold text-navy-900">{r.data.name || '(no name)'}</p>
                <p className="text-muted">
                  {r.data.className} {r.data.section && `– Section ${r.data.section}`} · Roll {r.data.rollNo || '—'}
                </p>
                <p className="mt-1 text-sm">
                  {r.data.parentName} {r.data.parentPhone && `· ${r.data.parentPhone}`}
                </p>
                <div className="mt-2">
                  <Problems row={r} />
                </div>
                <div className="mt-2 border-t border-line pt-2">
                  <FixButton row={r} onClick={setEditing} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {editing && (
        <ImportRowEditModal
          row={editing}
          classOptions={classOptions}
          onSave={handleSaveRow}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}