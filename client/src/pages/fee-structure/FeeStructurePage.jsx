import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Loader2, ListChecks, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { feeService } from '../../services/feeService';
import { getErrorMessage } from '../../services/api';
import { formatRs } from '../../utils/format';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import FeeTypesPanel from '../../components/fees/FeeTypesPanel';
import FeeStructureModal from '../../components/fees/FeeStructureModal';
import DiscountsPanel from '../../components/fees/DiscountsPanel';

const TABS = [
  ['classes', 'Class fees'],
  ['types', 'Fee types'],
  ['discounts', 'Student discounts'],
];

function FeeLines({ fees }) {
  if (!fees.length) return <span className="text-muted">Not set yet</span>;
  return (
    <ul className="space-y-0.5 text-sm">
      {fees.map((f) => (
        <li key={f.head}>
          <span className="text-muted">{f.head}:</span> {formatRs(f.amount)}
        </li>
      ))}
    </ul>
  );
}

function EditButton({ cls, onClick, disabled }) {
  return (
    <button
      onClick={() => onClick(cls)}
      disabled={disabled}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-primary-700 hover:bg-page disabled:opacity-50"
    >
      <Pencil className="h-4 w-4" /> {cls.monthlyFees.length ? 'Edit fees' : 'Set fees'}
    </button>
  );
}

export default function FeeStructurePage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState('classes');
  const [state, setState] = useState({ loading: true, error: '', heads: [], classes: [] });
  const [className, setClassName] = useState('');
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const data = await feeService.structure();
      setState({ loading: false, error: '', heads: data.heads, classes: data.classes });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: getErrorMessage(err) }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { loading, error, heads, classes } = state;
  const classNames = useMemo(() => [...new Set(classes.map((c) => c.name))], [classes]);
  const visible = useMemo(() => classes.filter((c) => !className || c.name === className), [classes, className]);
  const withoutFees = classes.filter((c) => c.monthlyFees.length === 0).length;
  const noHeads = heads.length === 0;

  const handleSaved = () => {
    setEditing(null);
    load();
  };

  return (
    <div>
      <PageHeader
        title={t('feeStructure')}
        subtitle="Set the monthly fee for each class and section. Every student's voucher uses these fees, minus any discount."
      />

      <div role="tablist" className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-11 shrink-0 border-b-2 px-4 text-base font-medium ${
              tab === id ? 'border-primary-700 text-primary-700' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && tab !== 'discounts' && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-line bg-white py-12 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading fees…
        </div>
      )}

      {!loading && error && tab !== 'discounts' && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-md bg-danger-50 p-4 text-danger-600">
          <p>{error}</p>
          <button onClick={load} className="min-h-10 rounded-md border border-danger-600 px-4 text-sm font-medium">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && tab === 'types' && <FeeTypesPanel heads={heads} onChanged={load} />}

      {tab === 'discounts' && <DiscountsPanel />}

      {!loading && !error && tab === 'classes' && (
        <>
          {classes.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="No classes yet"
              message="Fees are set for each class and section, so add your classes first."
              action={
                <Link
                  to="/classes"
                  className="inline-flex min-h-11 items-center rounded-md bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-600"
                >
                  Go to Classes
                </Link>
              }
            />
          ) : (
            <>
              {noHeads && (
                <div className="mb-4 rounded-md bg-warning-50 p-3 text-warning-600">
                  There are no fee types yet. Open the <strong>Fee types</strong> tab and add at least one, for example Tuition.
                </div>
              )}

              {withoutFees > 0 && !noHeads && (
                <div className="mb-4 flex items-start gap-2 rounded-md bg-warning-50 p-3 text-warning-600">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>
                    {withoutFees} class {withoutFees === 1 ? 'section has' : 'sections have'} no fees yet. Vouchers cannot be
                    made for their students until you set the fees.
                  </p>
                </div>
              )}

              <div className="mb-4 max-w-xs">
                <select
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  aria-label="Filter by class"
                  className="min-h-11 w-full rounded-md border border-line bg-white px-3 text-base focus:border-primary-600 focus:outline-none"
                >
                  <option value="">All classes</option>
                  {classNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              {/* Desktop and tablet: table */}
              <div className="hidden overflow-x-auto rounded-lg border border-line bg-white md:block">
                <table className="w-full text-base">
                  <thead className="border-b border-line bg-page text-sm text-muted">
                    <tr>
                      <th className="px-4 py-3 text-start font-semibold">Class</th>
                      <th className="px-4 py-3 text-start font-semibold">{t('section')}</th>
                      <th className="px-4 py-3 text-start font-semibold">Active students</th>
                      <th className="px-4 py-3 text-start font-semibold">Monthly fees</th>
                      <th className="px-4 py-3 text-start font-semibold">Total per month</th>
                      <th className="px-4 py-3 text-start font-semibold">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {visible.map((c) => (
                      <tr key={c._id}>
                        <td className="px-4 py-3 font-medium">{c.name}</td>
                        <td className="px-4 py-3">{c.section}</td>
                        <td className="px-4 py-3">{c.activeStudents}</td>
                        <td className="px-4 py-3">
                          <FeeLines fees={c.monthlyFees} />
                        </td>
                        <td className="px-4 py-3 font-semibold">{c.monthlyFees.length ? formatRs(c.total) : '—'}</td>
                        <td className="px-4 py-2">
                          <EditButton cls={c} onClick={setEditing} disabled={noHeads} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Phones: cards */}
              <ul className="space-y-3 md:hidden">
                {visible.map((c) => (
                  <li key={c._id} className="rounded-lg border border-line bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-navy-900">{c.name}</p>
                        <p className="text-muted">
                          {t('section')} {c.section} · {c.activeStudents} active
                        </p>
                      </div>
                      <p className="font-semibold">{c.monthlyFees.length ? formatRs(c.total) : '—'}</p>
                    </div>
                    <div className="mt-2">
                      <FeeLines fees={c.monthlyFees} />
                    </div>
                    <div className="mt-3 border-t border-line pt-2">
                      <EditButton cls={c} onClick={setEditing} disabled={noHeads} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {editing && (
        <FeeStructureModal
          cls={editing}
          heads={heads}
          allClasses={classes}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}