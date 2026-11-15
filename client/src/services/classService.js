import api from './api';

export const classService = {
  list: (params) => api.get('/classes', { params }).then((r) => r.data),
  names: () => api.get('/classes/names').then((r) => r.data.data),
  options: () => api.get('/classes/options').then((r) => r.data.data),
  create: (payload) => api.post('/classes', payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/classes/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/classes/${id}`).then((r) => r.data),
};