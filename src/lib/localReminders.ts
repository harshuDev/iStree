// Same-session reminders ("remind me to drink water in 1 hour") that don't need
// a server round-trip. They fire only while the app stays open or suspended in
// memory — anything that must survive closing the app uses server push.
import { useSyncExternalStore } from 'react';
import { reminderMessage, type Phase, type ReminderKind } from './cycle';

export interface LocalReminder {
  id: string;
  kind: ReminderKind;
  fireAt: number;
}

let reminders: LocalReminder[] = [];
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function showLocalNotification(title: string, body: string, url = '/') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker?.getRegistration();
  // Android Chrome forbids `new Notification()` from a page; use the SW.
  if (reg) await reg.showNotification(title, { body, icon: '/pwa-192x192.png', badge: '/pwa-64x64.png', data: { url } });
  else new Notification(title, { body });
  return true;
}

export function scheduleLocalReminder(kind: ReminderKind, minutes: number, phase: Phase): LocalReminder {
  const id = crypto.randomUUID();
  const reminder = { id, kind, fireAt: Date.now() + minutes * 60_000 };
  timers.set(
    id,
    setTimeout(() => {
      const msg = reminderMessage(kind, phase, { seed: Date.now() });
      void showLocalNotification(msg.title, msg.body, '/check-in');
      cancelLocalReminder(id);
    }, minutes * 60_000),
  );
  reminders = [...reminders, reminder];
  emit();
  return reminder;
}

export function cancelLocalReminder(id: string) {
  clearTimeout(timers.get(id));
  timers.delete(id);
  reminders = reminders.filter((r) => r.id !== id);
  emit();
}

export function useLocalReminders(): LocalReminder[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => reminders,
  );
}
