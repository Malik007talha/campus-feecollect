export const formatRs = (amount) => `Rs ${Number(amount || 0).toLocaleString('en-PK')}`;

// DD-MM-YYYY in Pakistan time
export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi' }).replace(/\//g, '-')
    : '—';
    // 17-11-2026 14:30 in Pakistan time
export const formatDateTime = (value) =>
  value
    ? new Date(value)
        .toLocaleString('en-GB', {
          timeZone: 'Asia/Karachi',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
        .replace(/\//g, '-')
        .replace(',', '')
    : '—';