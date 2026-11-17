import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import PageHeader from '../../components/common/PageHeader';
import OutstandingVouchersPanel from '../../components/payments/OutstandingVouchersPanel';
import PaymentRecordsPanel from '../../components/payments/PaymentRecordsPanel';
import RecordPaymentModal from '../../components/payments/RecordPaymentModal';

const TABS = [
  ['record', 'Record payment'],
  ['history', 'Payment records'],
];

export default function PaymentsPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState('record');
  const [paying, setPaying] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div>
      <PageHeader
        title={t('payments')}
        subtitle="Find a student, record the money received, and print a receipt. Partial payments are fine: the balance stays on the voucher."
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

      {tab === 'record' && <OutstandingVouchersPanel onPay={setPaying} reloadKey={reloadKey} />}
      {tab === 'history' && <PaymentRecordsPanel reloadKey={reloadKey} />}

      {paying && (
        <RecordPaymentModal
          voucher={paying}
          onClose={() => setPaying(null)}
          onRecorded={() => setReloadKey((k) => k + 1)}
        />
      )}
    </div>
  );
}