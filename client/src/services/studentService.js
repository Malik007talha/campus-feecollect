import api from './api';

export const studentService = {
  list: (params) => api.get('/students', { params }).then((r) => r.data),
  get: (id) => api.get(`/students/${id}`).then((r) => r.data.data),
  create: (payload) => api.post('/students', payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/students/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/students/${id}`).then((r) => r.data),
};