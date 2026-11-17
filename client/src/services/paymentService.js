import api from './api';

export const paymentService = {
  search: (q) => api.get('/payments/search', { params: q ? { q } : {} }).then((r) => r.data.data),
  record: (payload) => api.post('/payments', payload).then((r) => r.data),
  list: (params) => api.get('/payments', { params }).then((r) => r.data),
  forVoucher: (voucherId) => api.get(`/payments/voucher/${voucherId}`).then((r) => r.data.data),
};