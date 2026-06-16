/**
 * FeedFlow API client.
 *
 * Talks to the FastAPI backend. Token is persisted in expo-secure-store.
 *
 * IMPORTANT — set BASE_URL to your machine's LAN IP when running on a real
 * device (localhost only works on the iOS simulator). Find it with `ipconfig
 * getifaddr en0`, e.g. "http://192.168.1.42:8000".
 *
 * If the backend is unreachable, calls fall back to seeded demo data so the
 * UI stays alive during a demo. Toggle with DEMO_FALLBACK.
 */
import * as SecureStore from 'expo-secure-store';
import { demo } from './demo';

export const BASE_URL = 'https://feedflow-production-bc44.up.railway.app';
const DEMO_FALLBACK = true;
const TOKEN_KEY = 'feedflow_token';

export type PrefMode = 'boost' | 'reduce';
export interface Preference {
  topic: string;
  mode: PrefMode;
}
export interface IgStatus {
  status: 'connected' | 'disconnected' | 'connecting';
  username: string | null;
  last_sync: string | null;
}
export interface LogItem {
  id: number;
  username: string;
  caption: string | null;
  score: number;
  reason: string | null;
  action: 'liked' | 'suppressed' | 'none';
  created_at: string;
}
export interface Me {
  id: number;
  email: string;
}
export interface Settings {
  automation_interval_minutes: number;
}

let cachedToken: string | null = null;

export async function getToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
  return cachedToken;
}
async function setToken(token: string) {
  cachedToken = token;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}
export async function clearToken() {
  cachedToken = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const json = await res.json();
      detail = json.detail || detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Background reads & silent writes: serve demo data on ANY failure — including a
 * stale/unreachable backend returning 404/500 — so a screen never breaks or logs
 * an unhandled error just from loading.
 */
async function withFallback<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (DEMO_FALLBACK) return fallback();
    throw err;
  }
}

/**
 * User-facing writes (auth, Instagram connect): a real API error must reach the
 * UI (wrong password, email already in use, …), so only a *connection* failure
 * falls back to demo.
 */
async function withStrictFallback<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError) throw err; // real API errors (401, 409...) bubble up
    if (DEMO_FALLBACK) return fallback();    // network/connection failure -> demo
    throw err;
  }
}

export const api = {
  // Registration no longer hands back a token — the account is created
  // unverified and a code is emailed. Returns whether the caller must verify.
  async register(email: string, password: string): Promise<{ verificationRequired: boolean }> {
    try {
      await request<{ status: string; email: string }>('/auth/register', {
        method: 'POST',
        body: { email, password },
        auth: false,
      });
      return { verificationRequired: true };
    } catch (err) {
      if (err instanceof ApiError) throw err; // 409 email taken, etc. bubble up
      if (DEMO_FALLBACK) {
        // Backend unreachable — keep the demo alive by signing in directly.
        await setToken('demo-token');
        return { verificationRequired: false };
      }
      throw err;
    }
  },

  // Submit the emailed code; on success the account is verified and signed in.
  async verifyEmail(email: string, code: string): Promise<void> {
    const r = await request<{ access_token: string }>('/auth/verify-email', {
      method: 'POST',
      body: { email, code },
      auth: false,
    });
    await setToken(r.access_token);
  },

  resendVerification(email: string): Promise<void> {
    return withStrictFallback(
      async () => {
        await request('/auth/resend-verification', {
          method: 'POST',
          body: { email },
          auth: false,
        });
      },
      () => undefined
    );
  },

  async login(email: string, password: string): Promise<{ verificationRequired: boolean }> {
    try {
      const r = await request<{ access_token: string }>('/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false,
      });
      await setToken(r.access_token);
      return { verificationRequired: false };
    } catch (err) {
      // 403 = account exists but email isn't verified; backend already re-sent a
      // code, so route the user to the verify screen instead of erroring out.
      if (err instanceof ApiError) {
        if (err.status === 403) return { verificationRequired: true };
        throw err;
      }
      if (DEMO_FALLBACK) {
        await setToken('demo-token');
        return { verificationRequired: false };
      }
      throw err;
    }
  },

  getMe(): Promise<Me> {
    return withFallback(
      () => request<Me>('/auth/me'),
      () => demo.me
    );
  },

  // Permanently deletes the account on the backend, then drops the local token.
  // A real API error (e.g. expired session) bubbles up; a pure connection
  // failure in demo mode still signs the user out locally.
  async deleteAccount(): Promise<void> {
    try {
      await request('/auth/me', { method: 'DELETE' });
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (!DEMO_FALLBACK) throw err;
    }
    await clearToken();
  },

  changeEmail(email: string): Promise<Me> {
    return withStrictFallback(
      () => request<Me>('/auth/email', { method: 'PATCH', body: { email } }),
      () => {
        demo.me = { ...demo.me, email };
        return demo.me;
      }
    );
  },

  changePassword(current_password: string, new_password: string): Promise<void> {
    return withStrictFallback(
      async () => {
        await request('/auth/password', {
          method: 'POST',
          body: { current_password, new_password },
        });
      },
      () => undefined
    );
  },

  forgotPassword(email: string): Promise<void> {
    return withStrictFallback(
      async () => {
        await request('/auth/forgot-password', {
          method: 'POST',
          body: { email },
          auth: false,
        });
      },
      () => undefined
    );
  },

  resetPassword(email: string, code: string, new_password: string): Promise<void> {
    return withStrictFallback(
      async () => {
        await request('/auth/reset-password', {
          method: 'POST',
          body: { email, code, new_password },
          auth: false,
        });
      },
      () => undefined
    );
  },

  getPreferences(): Promise<Preference[]> {
    return withFallback(
      async () => {
        const r = await request<{ preferences: Preference[] }>('/preferences');
        return r.preferences;
      },
      () => demo.preferences
    );
  },

  setPreferences(preferences: Preference[]): Promise<void> {
    return withFallback(
      async () => {
        await request('/preferences', { method: 'POST', body: { preferences } });
      },
      () => {
        demo.preferences = preferences;
      }
    );
  },

  getInstagramStatus(): Promise<IgStatus> {
    return withFallback(
      () => request<IgStatus>('/instagram/status'),
      () => demo.igStatus
    );
  },

  connectInstagram(username: string, password: string): Promise<{ status: string }> {
    return withStrictFallback(
      () =>
        request('/instagram/connect', {
          method: 'POST',
          body: { username, password },
        }),
      () => {
        demo.igStatus = {
          status: 'connected',
          username,
          last_sync: new Date().toISOString(),
        };
        return { status: 'connected' };
      }
    );
  },

  connectInstagramWebView(session_id: string, ds_user_id: string): Promise<{ status: string; username: string }> {
    return withStrictFallback(
      () =>
        request('/instagram/connect-webview', {
          method: 'POST',
          body: { session_id, ds_user_id },
        }),
      () => {
        demo.igStatus = {
          status: 'connected',
          username: 'demo_user',
          last_sync: new Date().toISOString(),
        };
        return { status: 'connected', username: 'demo_user' };
      }
    );
  },

  disconnectInstagram(): Promise<{ status: string }> {
    return withFallback(
      () => request('/instagram/disconnect', { method: 'POST' }),
      () => {
        demo.igStatus = { status: 'disconnected', username: null, last_sync: null };
        return { status: 'disconnected' };
      }
    );
  },

  getSettings(): Promise<Settings> {
    return withFallback(
      () => request<Settings>('/settings'),
      () => demo.settings
    );
  },

  updateSettings(automation_interval_minutes: number): Promise<Settings> {
    return withFallback(
      () =>
        request<Settings>('/settings', {
          method: 'PATCH',
          body: { automation_interval_minutes },
        }),
      () => {
        demo.settings = { automation_interval_minutes };
        return demo.settings;
      }
    );
  },

  suggestTopics(topics: string[]): Promise<string[]> {
    return withFallback(
      async () => {
        const r = await request<{ suggestions: string[] }>('/preferences/suggest', {
          method: 'POST',
          body: { topics },
        });
        return r.suggestions;
      },
      () => {
        const pool = [
          'Machine Learning',
          'Venture Capital',
          'Productivity',
          'Open Source',
          'Robotics',
          'Data Science',
          'Web Development',
          'Crypto',
        ];
        const chosen = new Set(topics.map((t) => t.toLowerCase()));
        return pool.filter((t) => !chosen.has(t.toLowerCase())).slice(0, 6);
      }
    );
  },

  triggerAutomation(): Promise<{ task_id: string }> {
    return withFallback(
      () => request('/automation/trigger', { method: 'POST' }),
      () => ({ task_id: 'demo-task' })
    );
  },

  getLogs(): Promise<LogItem[]> {
    return withFallback(
      () => request<LogItem[]>('/automation/logs'),
      () => demo.logs
    );
  },
};
