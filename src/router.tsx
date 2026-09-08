import { QueryClient } from "@tanstack/react-query";
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
  });

  return router;
};
