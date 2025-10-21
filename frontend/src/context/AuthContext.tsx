import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi } from '../api/auth';
import { apiClient } from '../api/client';
import type { LoginRequest, RegisterRequest, ApplicationRole } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  userEmail: string | null;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user has a token on mount
    const token = apiClient.getToken();
    if (token) {
      // Fetch profile to get user info and admin status
      authApi.getProfile()
        .then((profile) => {
          setIsAuthenticated(true);
          setUserEmail(profile.email);
          setIsAdmin(profile.applicationRole === 'admin');
        })
        .catch((error) => {
          // Token is invalid, clear it
          console.error('Failed to fetch profile:', error);
          apiClient.setToken(null);
          setIsAuthenticated(false);
          setIsAdmin(false);
          setUserEmail(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (data: LoginRequest) => {
    await authApi.login(data);

    // Fetch profile to get user info and admin status
    const profile = await authApi.getProfile();
    setIsAuthenticated(true);
    setUserEmail(profile.email);
    setIsAdmin(profile.applicationRole === 'admin');
  };

  const register = async (data: RegisterRequest) => {
    await authApi.register(data);

    // Fetch profile to get user info and admin status
    const profile = await authApi.getProfile();
    setIsAuthenticated(true);
    setUserEmail(profile.email);
    setIsAdmin(profile.applicationRole === 'admin');
  };

  const logout = () => {
    authApi.logout();
    setIsAuthenticated(false);
    setIsAdmin(false);
    setUserEmail(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAdmin, userEmail, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
