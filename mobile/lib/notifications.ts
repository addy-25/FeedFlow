/**
 * Notifications: a local-notification + in-app history layer.
 *
 * Remote push needs a dev build (Expo Go dropped it), so we keep an in-app
 * notification center (always works) and additionally fire a best-effort system
 * banner when not muted. Every notify call is wrapped so it can never crash the
 * app if the runtime doesn't support notifications.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// expo-notifications throws on import in Expo Go (SDK 53+). Try to load it —
// if it throws, fall back to null. In-app notification history always works.
let Notifications: typeof import('expo-notifications') | null = null;
try { Notifications = require('expo-notifications'); } catch {}

const MUTE_KEY = 'ff_notifications_enabled';
const HIST_KEY = 'ff_notification_history';

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export interface NotifItem {
  id: string;
  title: string;
  body: string;
  ts: string;
}

export async function isNotificationsEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(MUTE_KEY);
  return v === null ? true : v === 'true';
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(MUTE_KEY, enabled ? 'true' : 'false');
  if (enabled && Notifications) {
    try {
      await Notifications.requestPermissionsAsync();
    } catch {}
  }
}

export async function getNotificationHistory(): Promise<NotifItem[]> {
  try {
    const raw = await AsyncStorage.getItem(HIST_KEY);
    return raw ? (JSON.parse(raw) as NotifItem[]) : [];
  } catch {
    return [];
  }
}

export async function clearNotificationHistory(): Promise<void> {
  await AsyncStorage.removeItem(HIST_KEY);
}

async function pushHistory(item: NotifItem): Promise<void> {
  const list = await getNotificationHistory();
  await AsyncStorage.setItem(HIST_KEY, JSON.stringify([item, ...list].slice(0, 30)));
}

/** Record (and best-effort surface) a completed automation run. */
export async function notifyRun(summary: {
  processed: number;
  liked: number;
  suppressed: number;
}): Promise<void> {
  const title = 'Feed personalized';
  const body = `Reviewed ${summary.processed} posts · ${summary.liked} boosted · ${summary.suppressed} reduced`;
  const item: NotifItem = {
    id: Date.now().toString(),
    title,
    body,
    ts: new Date().toISOString(),
  };
  await pushHistory(item); // always record for the in-app center

  if (!(await isNotificationsEnabled())) return;
  if (!Notifications) return;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) {
      const req = await Notifications.requestPermissionsAsync();
      if (!req.granted) return;
    }
    await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  } catch {
    // notifications unsupported in this runtime — in-app history still has it
  }
}
