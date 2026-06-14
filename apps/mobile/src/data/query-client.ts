import { QueryClient } from '@tanstack/react-query';

/**
 * Einzelne, geteilte QueryClient-Instanz. Als Singleton exportiert, damit auch
 * Nicht-React-Code (z. B. der „Bin dabei"-Store) Queries gezielt invalidieren
 * kann (Zusagen-Zähler, Trending-Reihenfolge).
 */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});
