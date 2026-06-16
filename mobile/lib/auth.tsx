/**
 * Auth context. Holds whether a token exists and exposes login/register/logout.
 * The root layout uses `ready` to avoid flashing the wrong screen on launch.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, clearToken, getToken } from './api';

interface AuthState {
  ready: boolean;
  signedIn: boolean;
  login: (email: string, password: string) => Promise<{ verificationRequired: boolean }>;
  register: (email: string, password: string) => Promise<{ verificationRequired: boolean }>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
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
    const r = await api.login(email, password);
    if (!r.verificationRequired) setSignedIn(true);
    return r;
  };
  const register = async (email: string, password: string) => {
    const r = await api.register(email, password);
    // Only the demo-fallback path signs in immediately; real signups verify first.
    if (!r.verificationRequired) setSignedIn(true);
    return r;
  };
  const verifyEmail = async (email: string, code: string) => {
    await api.verifyEmail(email, code);
    setSignedIn(true);
  };
  const resendVerification = async (email: string) => {
    await api.resendVerification(email);
  };
  const deleteAccount = async () => {
    await api.deleteAccount();
    setSignedIn(false);
  };
  const logout = async () => {
    await clearToken();
    setSignedIn(false);
  };

  return (
    <AuthContext.Provider
      value={{
        ready,
        signedIn,
        login,
        register,
        verifyEmail,
        resendVerification,
        deleteAccount,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
