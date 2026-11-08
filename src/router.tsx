import { QueryClient, dehydrate, hydrate, type DehydratedState } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // Default retry is 3 attempts with exponential backoff — fine for a flaky network blip,
  // but every query here fails fast and deterministically (bad input, RLS denial, not found),
  // so the default turns something like an invalid :id route param into an ~12s, 8-request
  // retry storm before the UI ever settles into its "not found" state. One retry is enough
  // to ride out a genuine transient blip without that stall.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Progressive enhancement: browsers/WebViews without View Transitions support just
    // navigate instantly, same as before — this only adds a native-feeling cross-fade/slide
    // where the API exists (including the Capacitor Android/iOS WebViews).
    defaultViewTransition: true,
    // Queries a route loader fetched on the server (lib/prefetch.ts) travel to the browser
    // inside the HTML and seed this QueryClient, so public pages render with their data on
    // first paint instead of after hydration. Only successful queries are sent.
    // Sent as a JSON string: the payload is plain Supabase rows, and the router's serialiser
    // can't prove DehydratedState's `unknown` fields are serialisable.
    dehydrate: () => ({ queryState: JSON.stringify(dehydrate(queryClient)) }),
    hydrate: (dehydrated: { queryState: string }) => {
      hydrate(queryClient, JSON.parse(dehydrated.queryState) as DehydratedState);
    },
  });

  return router;
};
