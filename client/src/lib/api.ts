import axios from 'axios';

// Limpiamos el URL base para que no tenga diagonales al final ni el sufijo /api repetido
const rawBaseURL = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '').replace(/\/$/, '');

const api = axios.create({
  baseURL: rawBaseURL,
});

api.interceptors.request.use((config) => {
  // Aseguramos que todas las peticiones relativas lleven el prefijo /api
  if (config.url && !config.url.startsWith('/api') && !config.url.startsWith('http')) {
    config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
  }

  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
