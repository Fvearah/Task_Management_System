import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import apiClient, { setUnauthorizedHandler } from '../api/axios';

const AuthContext = createContext(null);

// JWT berbentuk header.payload.signature. Payload di-decode hanya untuk menampilkan nama user;
// keabsahan token tetap diperiksa backend.
const decodeToken = (token) => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      toast.error('Sesi berakhir, silakan masuk kembali', { id: 'session-expired' });
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    // Disimpan langsung (bukan lewat effect): halaman tujuan memanggil API
    // saat mount, dan interceptor membaca token dari localStorage.
    localStorage.setItem('token', data.token);
    setToken(data.token);
    return data;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { data } = await apiClient.post('/auth/register', { name, email, password });
    return data;
  }, []);

  const value = useMemo(() => {
    const payload = token ? decodeToken(token) : null;
    return {
      token,
      user: payload?.name ? { name: payload.name } : null,
      login,
      register,
      logout,
      isAuthenticated: Boolean(token),
    };
  }, [token, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return context;
};