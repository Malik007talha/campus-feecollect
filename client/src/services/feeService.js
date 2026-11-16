import api from './api';

export const feeService = {
  heads: () => api.get('/fees/heads').then((r) => r.data.data),
  addHead: (name) => api.post('/fees/heads', { name }).then((r) => r.data),
  removeHead: (name) => api.delete(`/fees/heads/${encodeURIComponent(name)}`).then((r) => r.data),
  structure: () => api.get('/fees/structure').then((r) => r.data.data),
  saveStructure: (payload) => api.put('/fees/structure', payload).then((r) => r.data),
  discounts: () => api.get('/fees/discounts').then((r) => r.data.data),
};