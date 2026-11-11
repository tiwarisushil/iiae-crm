import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('iiae_token');
      const storedUser = localStorage.getItem('iiae_user');

      if (token && storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          // Student accounts belong on the public website, not this CRM.
          if (parsed?.role === 'student') {
            localStorage.removeItem('iiae_token');
            localStorage.removeItem('iiae_user');
          } else {
            setUser(parsed);
            // Quick fetch to verify token validity
            const response = await api.get('/auth/me');
            if (response.data?.role === 'student') {
              localStorage.removeItem('iiae_token');
              localStorage.removeItem('iiae_user');
              setUser(null);
            } else {
              setUser(response.data);
              localStorage.setItem('iiae_user', JSON.stringify(response.data));
            }
          }
        } catch (error) {
          console.error('Session validation failed:', error);
          // Session expired or invalid
          localStorage.removeItem('iiae_token');
          localStorage.removeItem('iiae_user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, ...userData } = response.data;

      if (userData.role === 'student') {
        return {
          success: false,
          message: 'Student accounts sign in on the institute website, not the CRM.',
        };
      }

      localStorage.setItem('iiae_token', token);
      localStorage.setItem('iiae_user', JSON.stringify(userData));
      
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please check credentials.';
      return { success: false, message };
    }
  };

  const establishSession = (payload) => {
    const { token, ...userData } = payload;
    localStorage.setItem('iiae_token', token);
    localStorage.setItem('iiae_user', JSON.stringify(userData));
    setUser(userData);
  };

  const patchUser = (partial) => {
    setUser((current) => {
      const next = { ...(current || {}), ...partial };
      localStorage.setItem('iiae_user', JSON.stringify(next));
      return next;
    });
  };

  const logout = () => {
    localStorage.removeItem('iiae_token');
    localStorage.removeItem('iiae_user');
    // The next person to sign in on this browser starts on the current session
    localStorage.removeItem('iiae_session');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, establishSession, patchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
