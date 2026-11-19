import api from './api';

export const portalService = {
  me: () => api.get('/portal/me').then((r) => r.data.data),
  vouchers: () => api.get('/portal/vouchers').then((r) => r.data.data),
  voucher: (id) => api.get(`/portal/vouchers/${id}`).then((r) => r.data.data),
};