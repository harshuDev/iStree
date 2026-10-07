/// <reference lib="webworker" />
// Custom service worker (vite-plugin-pwa `injectManifest` strategy).
// - Precaches the app shell so the installed app opens offline.
// - Receives Web Push messages and shows notifications.
// - Focuses/opens the app when a notification is tapped.
//
// Health data is deliberately NOT cached here: Supabase API responses are
// cached by React Query in app storage instead, so they're cleared on sign-out.
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// SPA: serve index.html for navigations (deep links work offline).
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/^\/api\//] }));

// Same-origin static images/fonts not in the precache.
registerRoute(
  ({ request, url }) => url.origin === self.location.origin && ['image', 'font'].includes(request.destination),
  new CacheFirst({
    cacheName: 'istree-static',
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  }),
);

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
}

self.addEventListener('push', (event) => {
  let data: PushPayload = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() };
  }
  // iOS revokes push permission if a push doesn't result in a visible notification,
  // so always show one.
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'iStree', {
      body: data.body ?? '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      tag: data.tag,
      data: { url: data.url ?? '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data?.url as string) ?? '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          if ('navigate' in client) await (client as WindowClient).navigate(target).catch(() => undefined);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
