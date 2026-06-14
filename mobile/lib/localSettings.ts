/**
 * Local cache for the automation interval.
 *
 * The backend (user_settings table) is what Celery actually reads, but the app
 * may be offline or fall back to demo data — in which case the in-memory demo
 * value resets to 60 on every restart. Persisting the user's choice here makes
 * the picker sticky across restarts; chooseInterval still pushes the value to
 * the backend so the scheduler stays in sync.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const INTERVAL_KEY = 'ff_automation_interval';
const DEFAULT_INTERVAL = 60;

export async function getStoredInterval(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(INTERVAL_KEY);
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) ? n : DEFAULT_INTERVAL;
  } catch {
    return DEFAULT_INTERVAL;
  }
}

export async function setStoredInterval(minutes: number): Promise<void> {
  try {
    await AsyncStorage.setItem(INTERVAL_KEY, String(minutes));
  } catch {}
}
