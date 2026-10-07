import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const WEEK = 7 * 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: WEEK, // must be >= persist maxAge for offline restore
      retry: 1,
      // Serve cached data immediately when offline instead of erroring.
      networkMode: 'offlineFirst',
    },
  },
});

// Previously loaded data is persisted on this device so the installed app
// opens with your history even offline. Cleared on sign-out.
export const queryPersister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'istree-query-cache',
});

export const PERSIST_MAX_AGE = WEEK;

export function clearLocalCache() {
  queryClient.clear();
  try {
    window.localStorage.removeItem('istree-query-cache');
  } catch {
    /* storage unavailable */
  }
}
