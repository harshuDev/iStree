import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

export type Platform = 'ios' | 'android' | 'desktop';

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports itself as a Mac; touch support gives it away.
  const isIPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || isIPadOS) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

/** True when launched from the home screen / installed app window. */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iOS major.minor version (e.g. 16.4), or null when not iOS / unknown. */
export function iosVersion(): number | null {
  const m = navigator.userAgent.match(/OS (\d+)_(\d+)/);
  if (m) return Number(`${m[1]}.${m[2]}`);
  const v = navigator.userAgent.match(/Version\/(\d+)\.(\d+)/); // iPadOS desktop UA
  return detectPlatform() === 'ios' && v ? Number(`${v[1]}.${v[2]}`) : null;
}

/** Safari is the most reliable place to "Add to Home Screen" on iOS. */
export function isIOSSafari(): boolean {
  return detectPlatform() === 'ios' && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(navigator.userAgent);
}

export function supportsPush(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Notification permission is only requested once installed on phones: iOS
 * requires it (16.4+), and on Android it gives a far better prompt context.
 * Desktop browsers are allowed so the flow is easy to test.
 */
export function canRequestPush(): boolean {
  return supportsPush() && (isStandalone() || detectPlatform() === 'desktop');
}

// ---------------------------------------------------------------------------
// Android/desktop install prompt (`beforeinstallprompt`). Captured at module
// load so we never miss the event; iOS never fires it.
// ---------------------------------------------------------------------------

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferredPrompt = null;
    emit();
  });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useInstallPrompt() {
  const canPrompt = useSyncExternalStore(subscribe, () => deferredPrompt !== null);
  const justInstalled = useSyncExternalStore(subscribe, () => installed);
  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    emit();
    return outcome === 'accepted';
  };
  return { canPrompt, justInstalled, promptInstall };
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  registerSW({
    immediate: true,
    onRegisterError: (err) => console.error('Service worker registration failed', err),
  });
}
