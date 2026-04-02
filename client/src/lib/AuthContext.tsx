import React, { createContext, useContext, useState, useEffect } from 'react';
import api from './api';

interface User {
  id: string;
  nombre: string;
  email: string;
  rol: 'ADMIN' | 'PROMOTOR' | 'INSTRUCTOR' | 'PROVEEDOR';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, selectedRole?: string) => Promise<any>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setToken(storedToken);
      setUser(parsedUser);
      // Actualizar el token en el api si es necesario
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
    setIsLoading(false);
  }, []);

  async function login(email: string, password: string, selectedRole?: string) {
    const { data } = await api.post('/auth/login', { email, password, selectedRole });
    
    if (data.requiresSelection) {
      return data;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.usuario));
    setToken(data.token);
    setUser(data.usuario);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    return data;
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
