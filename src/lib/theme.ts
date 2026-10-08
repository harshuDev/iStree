// App appearance: follow the system, or force light/dark. Stored per device
// (it's a display preference, not account data) and applied as
// <html data-theme="…"> so CSS tokens switch instantly.
import { useSyncExternalStore } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'istree-theme';
const THEME_COLOR = { light: '#ffffff', dark: '#181a20' };
const listeners = new Set<() => void>();
const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function read(): ThemePreference {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

let current: ThemePreference = typeof window !== 'undefined' ? read() : 'system';

export const resolvedTheme = (pref: ThemePreference = current): 'light' | 'dark' =>
  pref === 'system' ? (media?.matches ? 'dark' : 'light') : pref;

function apply() {
  const root = document.documentElement;
  if (current === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', current);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[resolvedTheme()]);
}

/** Call once at startup, before the first render. */
export function initTheme() {
  apply();
  media?.addEventListener('change', () => {
    apply();
    listeners.forEach((l) => l());
  });
}

export function setThemePreference(pref: ThemePreference) {
  current = pref;
  try {
    if (pref === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    /* storage unavailable: still applies for this session */
  }
  apply();
  listeners.forEach((l) => l());
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}
