import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { render } from "@testing-library/react";
import { routeTree } from "../router.js";

/**
 * Renders the real app route tree (PRD-scoped: `/` and `/sources`) against
 * an in-memory history, so page-level tests (#17, #25) exercise the actual
 * `NewsPage`/`SourcesPage` components and their URL search-param wiring
 * rather than a hand-rolled stand-in.
 */
export function renderApp(initialPath: string, queryClient = createTestQueryClient()) {
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  const router = createRouter({ routeTree, history });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <RouterProvider router={router} />
      </MantineProvider>
    </QueryClientProvider>,
  );
  return { ...utils, queryClient, router };
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}
