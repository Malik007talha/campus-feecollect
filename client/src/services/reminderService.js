import api from './api';

export const reminderService = {
  status: () => api.get('/reminders/status').then((r) => r.data.data),
  send: (payload) => api.post('/reminders/send', payload, { timeout: 120000 }).then((r) => r.data),
  list: (params) => api.get('/reminders', { params }).then((r) => r.data),
};