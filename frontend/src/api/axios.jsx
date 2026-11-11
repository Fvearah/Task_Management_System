import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// AuthProvider mendaftarkan handler ini agar token yang kedaluwarsa
// membersihkan sesi lewat state React, bukan lewat reload halaman.
let onUnauthorized = null;
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

// Pesan error untuk toast. Backend mengirim { error: "..." }.
export const errorMessage = (err, fallback) => {
  if (!err.response) {
    return `Tidak dapat terhubung ke server (${apiClient.defaults.baseURL}). Pastikan backend berjalan dan CORS diizinkan.`;
  }
  // 400 berisi pesan validator Gin berbahasa Inggris; pesan umum lebih mudah dipahami.
  if (err.response.status === 400) return fallback;
  return err.response.data?.error || fallback;
};

// Interceptor untuk menyisipkan token JWT secara otomatis
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 dari /auth/login berarti kredensial salah, bukan sesi berakhir.
    const isAuthRequest = error.config?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && !isAuthRequest) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export default apiClient;