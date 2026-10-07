import { canRequestPush, supportsPush } from './pwa';
import { registerPushSubscription, removePushSubscription } from '../services/pushSubscriptions';

export type PushState = 'unsupported' | 'needs-install' | 'denied' | 'prompt' | 'off' | 'on';

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function getPushState(): Promise<PushState> {
  if (!supportsPush()) return 'unsupported';
  if (!canRequestPush()) return 'needs-install';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission === 'default') return 'prompt';
  return (await currentSubscription()) ? 'on' : 'off';
}

/** Must be called from a user gesture (tap) — iOS rejects it otherwise. */
export async function enablePush(): Promise<PushState> {
  if (!canRequestPush()) return getPushState();
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'prompt';

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidKey) throw new Error('VITE_VAPID_PUBLIC_KEY is not set');

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true, // required by Chrome and Safari
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }
  await registerPushSubscription(sub);
  return 'on';
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await removePushSubscription(sub.endpoint).catch(() => undefined);
  await sub.unsubscribe();
}

/** Re-sync this device's subscription with the database (e.g. after login). */
export async function syncPushSubscription(): Promise<void> {
  if (!supportsPush() || Notification.permission !== 'granted') return;
  const sub = await currentSubscription();
  if (sub) await registerPushSubscription(sub);
}
