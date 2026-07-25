import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes cache before re-fetching
        refetchOnWindowFocus: false, // prevent duplicate requests when switching tabs
        retry: 1, // only retry once on failure
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 1000 * 30, // 30 seconds — don't re-fetch on hover if data is fresh
  });

  return router;
};
