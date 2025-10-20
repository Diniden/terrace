import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi } from '../api/auth';
import { apiClient } from '../api/client';
import type { LoginRequest, RegisterRequest } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user has a token on mount
    const token = apiClient.getToken();
    if (token) {
      // Decode JWT to check if admin (simple decode, not verifying)
      try {
        JSON.parse(atob(token.split('.')[1]));
        setIsAuthenticated(true);
        // You would need to add user info to JWT payload to check admin status
        // For now, we'll make an API call after login to determine this
      } catch (error) {
        apiClient.setToken(null);
      }
    }
    setLoading(false);
  }, []);

  const login = async (data: LoginRequest) => {
    await authApi.login(data);
    setIsAuthenticated(true);

    // Check if admin by attempting to access admin endpoint
    // This is a simple approach - in production you'd include role in JWT
    try {
      // If we can access users endpoint, user is admin
      await fetch('http://localhost:3000/users?limit=1', {
        headers: { Authorization: `Bearer ${apiClient.getToken()}` }
      });
      setIsAdmin(true);
    } catch {
      setIsAdmin(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    await authApi.register(data);
    setIsAuthenticated(true);
    setIsAdmin(false); // New users are not admins
  };

  const logout = () => {
    authApi.logout();
    setIsAuthenticated(false);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAdmin, login, register, logout, loading }}>
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
