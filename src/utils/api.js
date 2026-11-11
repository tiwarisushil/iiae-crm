import axios from 'axios';

// Create Axios Instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('iiae_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Selected admission session ('all' or a session id). Absent = the admin's current session.
    const session = localStorage.getItem('iiae_session');
    if (session) {
      config.headers['X-Session-Id'] = session;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle errors like expired token
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear local storage and redirect to login if unauthorized
      localStorage.removeItem('iiae_token');
      localStorage.removeItem('iiae_user');
      if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// We export using CommonJS or ESM? The vite environment is "type": "module" which uses ESM.
// Wait, the client is React ESM. So we should use ES modules exports!
export default api;
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('iiae_token', token);
  } else {
    localStorage.removeItem('iiae_token');
  }
};
