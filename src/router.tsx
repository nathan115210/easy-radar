import { AppShell, NavLink } from "@mantine/core";
import { Link, Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { NewsPage } from "./pages/NewsPage.js";
import { SourcesPage } from "./pages/SourcesPage.js";
import { validateNewsSearch } from "./routes/news-search.js";
import { validateSourcesSearch } from "./routes/sources-search.js";

function RootLayout() {
  return (
    <AppShell header={{ height: 56 }} padding={0}>
      <AppShell.Header>
        <NavLink component={Link} to="/" label="News" style={{ display: "inline-flex" }} />
        <NavLink
          component={Link}
          to="/sources"
          label="Sources"
          style={{ display: "inline-flex" }}
        />
      </AppShell.Header>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}

const rootRoute = createRootRoute({ component: RootLayout });

const newsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: validateNewsSearch,
  component: NewsPage,
});

const sourcesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sources",
  validateSearch: validateSourcesSearch,
  component: SourcesPage,
});

export const routeTree = rootRoute.addChildren([newsRoute, sourcesRoute]);

export const router = createRouter({ routeTree, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
