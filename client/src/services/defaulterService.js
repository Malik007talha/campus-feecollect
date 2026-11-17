import api from './api';

export const defaulterService = {
  list: (params) => api.get('/defaulters', { params }).then((r) => r.data),
};