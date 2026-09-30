import { QueryClient, type Query } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Public content (advocates, judgements, advice) changes slowly; avoid refetch storms on
      // every tab switch while still refreshing on focus/reconnect via the managers in _layout.
      staleTime: 30_000,
      // Must be >= the persister's maxAge, or restored queries are garbage-collected immediately.
      gcTime: 24 * 60 * 60_000,
    },
  },
});

// AsyncStorage is unencrypted, so only public directory/reference content is written to disk for
// offline browsing. Cases, messages, documents, payments and profiles are confidential legal data
// and stay in memory only.
const PUBLIC_QUERY_ROOTS = new Set([
  "lawyers",
  "lawyer",
  "reviews",
  "advice",
  "news",
  "judgements",
  "library",
  "stations",
  "wanted",
  "security-tips",
  "quotes",
  "app-settings",
]);

export function shouldPersistQuery(query: Query): boolean {
  const root = query.queryKey[0];
  return (
    typeof root === "string" && PUBLIC_QUERY_ROOTS.has(root) && query.state.status === "success"
  );
}

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "lf.query-cache.v1",
  throttleTime: 2_000,
});
