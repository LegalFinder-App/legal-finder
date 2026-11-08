/**
 * Route-loader helper for public pages. On the server the loader waits for these queries, so
 * their data is rendered into the HTML and handed to the browser's QueryClient (see
 * setupRouterSsrQueryIntegration in router.tsx) — content is there on first paint instead of
 * appearing after hydration. In the browser it only warms the cache and never blocks
 * navigation: the Supabase client waits for Clerk before its first request, which can take
 * seconds, and a page with its skeletons is better than a frozen link.
 *
 * Prefetching never throws; a failed query is simply fetched again by the page's useQuery.
 */
export function prefetchForPage(prefetches: Promise<unknown>[]): Promise<void> | undefined {
  const all = Promise.all(prefetches).then(() => undefined);
  return typeof window === "undefined" ? all : undefined;
}
