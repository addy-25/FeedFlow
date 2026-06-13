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

export const BASE_URL = 'http://192.168.1.9:8000';
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

/** Wraps a network call so a connection failure transparently serves demo data. */
async function withFallback<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError) throw err; // real API errors (401, 409...) bubble up
    if (DEMO_FALLBACK) return fallback();    // network/connection failure -> demo
    throw err;
  }
}

export const api = {
  async register(email: string, password: string) {
    const r = await request<{ access_token: string }>('/auth/register', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
    await setToken(r.access_token);
  },

  async login(email: string, password: string) {
    try {
      const r = await request<{ access_token: string }>('/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false,
      });
      await setToken(r.access_token);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (DEMO_FALLBACK) {
        await setToken('demo-token');
        return;
      }
      throw err;
    }
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
    return withFallback(
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
