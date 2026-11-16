import api from './api';

export const voucherService = {
  preview: (payload) => api.post('/vouchers/preview', payload).then((r) => r.data.data),
  generate: (payload) => api.post('/vouchers/generate', payload).then((r) => r.data),
  list: (params) => api.get('/vouchers', { params }).then((r) => r.data),
  get: (id) => api.get(`/vouchers/${id}`).then((r) => r.data.data),
};