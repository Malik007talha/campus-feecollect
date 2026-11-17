import { useState } from 'react';
import { Download, Printer, Loader2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { fetchPdf } from '../../services/fileService';
import { getErrorMessage } from '../../services/api';
import { saveBlob } from '../../utils/download';

const btn =
  'inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-primary-700 hover:bg-page disabled:opacity-60';

// One voucher: pass voucherId + fileName.  Many vouchers: pass bulk + params (month, class...).
export default function VoucherPdfButtons({ voucherId, fileName, bulk = false, params }) {
  const toast = useToast();
  const [busy, setBusy] = useState('');

  const path = bulk ? '/vouchers/pdf' : `/vouchers/${voucherId}/pdf`;
  const name = bulk ? `fee-vouchers-${params?.month || 'all'}.pdf` : `${fileName || 'fee-voucher'}.pdf`;

  const download = async () => {
    setBusy('download');
    try {
      saveBlob(await fetchPdf(path, params), name);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  // Opens the PDF in a new tab, where the browser's own Print button works.
  const print = async () => {
    const win = window.open('', '_blank'); // opened first so the browser does not block it
    setBusy('print');
    try {
      const blob = await fetchPdf(path, params);
      const url = URL.createObjectURL(blob);
      if (win) {
        win.location.href = url;
      } else {
        saveBlob(blob, name);
        toast.error('Your browser blocked the print window, so the PDF was downloaded. Open it and press Print.');
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      win?.close();
      toast.error(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <button onClick={download} disabled={Boolean(busy)} className={btn}>
        {busy === 'download' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {bulk ? 'Download all (PDF)' : 'Download'}
      </button>
      <button onClick={print} disabled={Boolean(busy)} className={btn}>
        {busy === 'print' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
        {bulk ? 'Print all' : 'Print'}
      </button>
    </>
  );
}