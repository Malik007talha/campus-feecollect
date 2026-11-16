import api from './api';

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const studentService = {
  list: (params) => api.get('/students', { params }).then((r) => r.data),
  get: (id) => api.get(`/students/${id}`).then((r) => r.data.data),
  create: (payload) => api.post('/students', payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/students/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/students/${id}`).then((r) => r.data),

  // Excel import
  downloadTemplate: async () => {
    try {
      const res = await api.get('/students/import/template', { responseType: 'blob' });
      return res.data;
    } catch (err) {
      // Error bodies arrive as a Blob here; turn them back into JSON so the message shows.
      if (err.response?.data instanceof Blob) {
        try {
          err.response.data = JSON.parse(await err.response.data.text());
        } catch {
          /* keep the generic message */
        }
      }
      throw err;
    }
  },
  parseImportFile: (file) =>
    api
      .post('/students/import/parse', file, { headers: { 'Content-Type': XLSX_TYPE }, timeout: 120000 })
      .then((r) => r.data.data),
  validateImportRows: (rows) => api.post('/students/import/validate', { rows }).then((r) => r.data.data),
  commitImport: (rows) => api.post('/students/import/commit', { rows }, { timeout: 120000 }).then((r) => r.data),
};