import api from './api';

export const settingsService = {
  get: () => api.get('/settings').then((r) => r.data.data),
  update: (payload) => api.put('/settings', payload).then((r) => r.data),
};