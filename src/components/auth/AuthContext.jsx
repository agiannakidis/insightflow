import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const forceLogout = () => {
    localStorage.removeItem('obs_token');
    setUser(null);
  };

  // Listen for global unauthorized events
  useEffect(() => {
    const handler = () => forceLogout();
    window.addEventListener('obs:unauthorized', handler);
    return () => window.removeEventListener('obs:unauthorized', handler);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('obs_token');
    if (token) {
      base44.functions.invoke('authLogin', { action: 'validate', token })
        .then(res => {
          if (res.data?.valid) setUser(res.data.user);
          else forceLogout();
        })
        .catch(() => forceLogout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await base44.functions.invoke('authLogin', { action: 'login', username, password });
    if (res.data?.success) {
      localStorage.setItem('obs_token', res.data.token);
      setUser(res.data.user);
      return { success: true };
    }
    return { success: false, error: res.data?.error || 'Login failed' };
  };

  const logout = async () => {
    const token = localStorage.getItem('obs_token');
    if (token) await base44.functions.invoke('authLogin', { action: 'logout', token });
    localStorage.removeItem('obs_token');
    setUser(null);
  };

  // Global 401 interceptor - any function returning 401 forces re-login
  useEffect(() => {
    if (!user) return;
    const originalInvoke = base44.functions.invoke.bind(base44.functions);
    base44.functions.invoke = async (...args) => {
      const res = await originalInvoke(...args);
      if (res?.data?.error === 'Unauthorized' || res?.status === 401) {
        forceLogout();
      }
      return res;
    };
    return () => {
      base44.functions.invoke = originalInvoke;
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, token: localStorage.getItem('obs_token') }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);