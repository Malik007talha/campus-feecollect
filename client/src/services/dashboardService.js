import api from './api';

export const dashboardService = {
  get: (month) => api.get('/dashboard', { params: month ? { month } : {} }).then((r) => r.data.data),
};