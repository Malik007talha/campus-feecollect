export const formatRs = (amount) => `Rs ${Number(amount || 0).toLocaleString('en-PK')}`;

// DD-MM-YYYY in Pakistan time
export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi' }).replace(/\//g, '-')
    : '—';