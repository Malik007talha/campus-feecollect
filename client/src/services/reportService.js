import api from './api';

export const reportService = {
  get: (type, params) => api.get(`/reports/${type}`, { params }).then((r) => r.data.data),
};