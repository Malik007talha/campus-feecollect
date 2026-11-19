import api from './api';

export const portalAccountService = {
  list: (params) => api.get('/portal-accounts', { params }).then((r) => r.data),
  create: (payload) => api.post('/portal-accounts', payload).then((r) => r.data),
  bulk: (payload) => api.post('/portal-accounts/bulk', payload, { timeout: 120000 }).then((r) => r.data),
  resetPassword: (studentId) => api.post(`/portal-accounts/${studentId}/reset-password`).then((r) => r.data),
  setActive: (studentId, isActive) => api.patch(`/portal-accounts/${studentId}/status`, { isActive }).then((r) => r.data),
};