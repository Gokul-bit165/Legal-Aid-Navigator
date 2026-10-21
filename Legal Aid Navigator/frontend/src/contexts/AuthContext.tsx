import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<User>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_KEY = 'lan_auth';

// ── Demo credentials (no backend required) ────────────────────────────────────
const DEMO_USER: User = {
  id: 'demo-001',
  username: 'test',
  email: 'test@example.com',
  full_name: 'Demo User',
  created_at: new Date().toISOString(),
};
const DEMO_TOKEN = 'demo-jwt-token';

async function tryBackendLogin(username: string, password: string) {
  const res = await fetch('http://localhost:8000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Login failed');
  }
  return res.json();
}

async function tryBackendRegister(username: string, email: string, password: string) {
  const res = await fetch('http://localhost:8000/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Registration failed');
  }
  return res.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) {
        const { user, token } = JSON.parse(raw);
        setUser(user);
        setToken(token);
      }
    } catch { /* noop */ }
    setIsLoading(false);
  }, []);

  const persist = (u: User, t: string) => {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ user: u, token: t }));
    setUser(u);
    setToken(t);
  };

  const login = async (username: string, password: string) => {
    // Demo shortcut – works offline without backend
    if (username === 'test' && password === 'test') {
      persist(DEMO_USER, DEMO_TOKEN);
      return DEMO_USER;
    }
    // Try real backend
    const data = await tryBackendLogin(username, password);
    persist(data.user, data.access_token);
    return data.user as User;
  };

  const register = async (username: string, email: string, password: string) => {
    // Demo shortcut
    if (username === 'test') {
      persist(DEMO_USER, DEMO_TOKEN);
      return;
    }
    const data = await tryBackendRegister(username, email, password);
    persist(data.user, data.access_token);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.clear();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, isAdmin: user?.role === 'admin', isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
