// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CollectionStatusResponse } from "../../shared/schemas/index.js";
import {
  CollectionStatusResponseSchema,
  SourcesResponseSchema,
} from "../../shared/schemas/index.js";
import { collectionStatusResponse, sourcesResponse } from "../test-utils/fixtures.js";
import { installFetchMock, jsonResponse } from "../test-utils/mock-fetch.js";
import { CollectionStatusAlert } from "./CollectionStatusAlert.js";

function mockStatus(overrides: Partial<CollectionStatusResponse> = {}) {
  installFetchMock((url) => {
    if (url === "/api/collection-status") {
      return jsonResponse(CollectionStatusResponseSchema, collectionStatusResponse(overrides));
    }
    if (url === "/api/sources") {
      return jsonResponse(SourcesResponseSchema, sourcesResponse());
    }
    return undefined;
  });
}

function renderAlert() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: CollectionStatusAlert });
  const sourcesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/sources",
    component: () => null,
  });
  const routeTree = rootRoute.addChildren([sourcesRoute]);
  const router = createRouter({ routeTree });
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <RouterProvider router={router} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe("CollectionStatusAlert (#19)", () => {
  it("green: all sources succeeding shows a compact success alert", async () => {
    mockStatus({ coverage: { succeeded: 5, failed: 0, planned: 0, added: 0, total: 5 } });

    renderAlert();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("All sources collecting successfully");
  });

  it("orange: planned sources outrank green but not red", async () => {
    mockStatus({ coverage: { succeeded: 4, failed: 0, planned: 1, added: 0, total: 5 } });

    renderAlert();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("1 source planned");
  });

  it("red: a failing source outranks planned sources present at the same time", async () => {
    mockStatus({ coverage: { succeeded: 3, failed: 1, planned: 1, added: 0, total: 5 } });

    renderAlert();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("1 source failing");
  });

  it("a rejected run's reason always takes priority in the title, even over a failing-source count", async () => {
    mockStatus({
      coverage: { succeeded: 3, failed: 1, planned: 0, added: 0, total: 5 },
      rejected: { reason: "volume-guard", detail: "212 items added, exceeds threshold of 200" },
    });

    renderAlert();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Collection rejected — Change guard: 212 items added, exceeds threshold of 200",
    );
  });

  it("red and orange alerts have no dismiss control", async () => {
    mockStatus({ coverage: { succeeded: 3, failed: 1, planned: 0, added: 0, total: 5 } });

    renderAlert();

    await waitFor(() => screen.getByRole("alert"));
    expect(screen.queryByRole("button", { name: /close|dismiss/i })).not.toBeInTheDocument();
  });
});
