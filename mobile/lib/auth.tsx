/**
 * Auth context. Holds whether a token exists and exposes login/register/logout.
 * The root layout uses `ready` to avoid flashing the wrong screen on launch.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, clearToken, getToken } from './api';

interface AuthState {
  ready: boolean;
  signedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    getToken().then((t) => {
      setSignedIn(!!t);
      setReady(true);
    });
  }, []);

  const login = async (email: string, password: string) => {
    await api.login(email, password);
    setSignedIn(true);
  };
  const register = async (email: string, password: string) => {
    await api.register(email, password);
    setSignedIn(true);
  };
  const logout = async () => {
    await clearToken();
    setSignedIn(false);
  };

  return (
    <AuthContext.Provider value={{ ready, signedIn, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
