import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    api.get('/auth/me')
      .then((response) => setUser(response.data))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login: async (email, password) => {
      const { data } = await api.post('/auth/login', { email: email.trim().toLowerCase(), password });
      localStorage.setItem('token', data.token);
      setUser(data.user);
    },
    signup: async (payload) => {
      const { data } = await api.post('/auth/signup', {
        ...payload,
        name: payload.name.trim(),
        email: payload.email.trim().toLowerCase(),
        companyCode: payload.companyCode?.trim().toUpperCase()
      });
      localStorage.setItem('token', data.token);
      setUser(data.user);
    },
    logout: () => {
      localStorage.removeItem('token');
      setUser(null);
    }
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
