import api from './api';

// Fetches a PDF (or any file) as a Blob. If the server answers with an error,
// the JSON error is unpacked so the normal message shows.
export async function fetchPdf(path, params) {
  try {
    const res = await api.get(path, { params, responseType: 'blob', timeout: 120000 });
    return res.data;
  } catch (err) {
    if (err.response?.data instanceof Blob) {
      try {
        err.response.data = JSON.parse(await err.response.data.text());
      } catch {
        /* keep the generic message */
      }
    }
    throw err;
  }
}