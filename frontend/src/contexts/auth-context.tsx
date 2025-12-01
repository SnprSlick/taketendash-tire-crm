'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  scopes: string[];
  stores: string[];
  mustChangePassword: boolean;
  employeeId?: string;
  employeeName?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasScope: (scope: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load from local storage on mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    const validateAndSetUser = async (token: string, savedUser: User | null) => {
      try {
        const res = await fetch('/api/v1/auth/validate', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
          } else if (savedUser) {
            setUser(savedUser);
          }
          setToken(token);
        } else {
          // Token invalid
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Token validation failed:', error);
        // If validation fails (e.g. network error), fallback to stored user but keep token
        if (savedUser) {
          setUser(savedUser);
          setToken(token);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (storedToken && storedToken !== 'undefined' && storedToken !== 'null') {
      validateAndSetUser(storedToken, storedUser ? JSON.parse(storedUser) : null);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    if (newToken === 'undefined' || newToken === 'null') {
      console.error('Attempted to store invalid token:', newToken);
      return;
    }
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    // Use window.location to support both App Router and Pages Router
    if (newUser.mustChangePassword) {
      window.location.href = '/change-password';
    } else {
      window.location.href = '/dashboard';
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Use window.location to support both App Router and Pages Router
    window.location.href = '/login';
  };

  const hasScope = (scope: string) => {
    if (!user) return false;
    if (user.scopes.includes('*')) return true;
    return user.scopes.includes(scope);
  };

  const hasRole = (role: string) => {
    return user?.role === role;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout, 
      isAuthenticated: !!token,
      isLoading,
      hasScope,
      hasRole
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
