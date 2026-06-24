import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
});

// Automatically attach JWT Bearer token to every request.
// The token is stored in localStorage by AuthContext after login.
api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('canteenUser');
  if (raw) {
    const { token } = JSON.parse(raw);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;