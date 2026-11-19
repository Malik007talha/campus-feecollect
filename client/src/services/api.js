import axios from 'axios';

export const TOKEN_KEY = 'fc_token';

// const configuredBaseURL = import.meta.env.VITE_API_URL?.trim() || 'http://localhost:5000/api';
const configuredBaseURL = import.meta.env.VITE_API_URL?.trim() || 'https://api-campus-feecollect.onrender.com';

const normalizedBaseURL = configuredBaseURL.replace(/\/+$/, '');
const apiBaseURL = /\/api$/i.test(normalizedBaseURL) ? normalizedBaseURL : `${normalizedBaseURL}/api`;

const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 60000, // generous: free-tier servers can be slow to wake up
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Expired or invalid session: clear it and send the user to login.
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

// Turns any error into a short, human-readable message.
export function getErrorMessage(error) {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.code === 'ECONNABORTED') return 'The server is taking too long to respond. Please try again.';
  if (error.request) return 'Cannot reach the server. Check your internet connection.';
  return 'Something went wrong. Please try again.';
}

export default api;
