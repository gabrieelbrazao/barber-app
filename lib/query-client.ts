import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Two retries with backoff so one dropped request on a flaky mobile
      // connection doesn't surface as an error screen.
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
  },
});

// React Query has no window focus events on native; without this, data stays
// stale after the app returns from the background (e.g. reconnecting offline).
focusManager.setEventListener((handleFocus) => {
  const sub = AppState.addEventListener('change', (status: AppStateStatus) =>
    handleFocus(status === 'active')
  );
  return () => sub.remove();
});
