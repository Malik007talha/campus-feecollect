import api from './api';

export const userService = {
  list: () => api.get('/users').then((r) => r.data.data),
  create: (payload) => api.post('/users', payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/users/${id}`, payload).then((r) => r.data),
};