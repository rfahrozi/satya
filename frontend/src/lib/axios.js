import axios from 'axios';

// Konfigurasi baseline Axios agar selalu mengarah ke port API
const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor pada Request: Memasukkan JWT Token secara dinamis
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('satya_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor pada Response: Penanganan global (misal 401 Unauthorized)
api.interceptors.response.use(
  (response) => response.data, // langsung ekstrak `data` untuk memudahkan (karena standard response kita: success, message, data)
  (error) => {
    // Jika 401 Unauthorized (token invalid/expired) otomatis arahkan ke login
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('satya_token');
      localStorage.removeItem('satya_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Simplifikasi pesan error dari backend AppError (kalau ada)
    const errMessage = error.response?.data?.message || error.message || 'Terjadi kesalahan sistem';
    return Promise.reject(new Error(errMessage));
  }
);

export default api;
