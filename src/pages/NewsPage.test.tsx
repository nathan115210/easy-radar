// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import {
  CollectionStatusResponseSchema,
  NewsPageResponseSchema,
} from "../../shared/schemas/index.js";
import {
  collectionStatusResponse,
  newsItemView,
  newsPageResponse,
} from "../test-utils/fixtures.js";
import { installFetchMock, jsonResponse } from "../test-utils/mock-fetch.js";
import { renderApp } from "../test-utils/render-app.js";

function mockNews(overrides: Parameters<typeof newsPageResponse>[0] = {}) {
  installFetchMock(
    (url) => {
      if (url === "/api/collection-status") {
        return jsonResponse(CollectionStatusResponseSchema, collectionStatusResponse());
      }
      return undefined;
    },
    (url) => {
      if (url.startsWith("/api/news")) {
        return jsonResponse(NewsPageResponseSchema, newsPageResponse(overrides));
      }
      return undefined;
    },
  );
}

describe("NewsPage (#17)", () => {
  beforeEach(() => {
    mockNews();
  });

  it("category tabs list every category with 'Web Core & Frontend Ecosystem' selected by default", async () => {
    renderApp("/");

    const tabs = await screen.findByRole("tablist");
    expect(
      within(tabs).getByRole("tab", { name: "Web Core & Frontend Ecosystem" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(within(tabs).getByRole("tab", { name: "Mobile Development" })).toBeInTheDocument();
  });

  it("switching category tabs updates the URL's category search param", async () => {
    const user = userEvent.setup();
    const { router } = renderApp("/");
    await screen.findByRole("tablist");

    await user.click(screen.getByRole("tab", { name: "Mobile Development" }));

    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ category: "mobile-development" });
    });
  });

  it("the state filter shows unread/read/all counts from the response", async () => {
    mockNews({
      items: [newsItemView()],
      counts: { all: 7, unread: 4, read: 3 },
    });

    renderApp("/");

    expect(await screen.findByText("All (7)")).toBeInTheDocument();
    expect(screen.getByText("Unread (4)")).toBeInTheDocument();
    expect(screen.getByText("Read (3)")).toBeInTheDocument();
  });

  it("switching the state filter updates the URL's state search param", async () => {
    const user = userEvent.setup();
    const { router } = renderApp("/");
    await screen.findByText(/All \(/);

    await user.click(screen.getByText(/Unread \(/));

    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ state: "unread" });
    });
  });

  it("renders a card per item and shows pagination only when there is more than one page", async () => {
    mockNews({
      items: [newsItemView({ id: "a" }), newsItemView({ id: "b" })],
      counts: { all: 2, unread: 2, read: 0 },
      totalPages: 3,
      page: 2,
    });

    renderApp("/?category=web-core&page=2");

    await waitFor(() => {
      expect(screen.getAllByRole("link", { name: /A great engineering article/ })).toHaveLength(2);
    });
    const pagination = screen.getByRole("button", { name: "3" });
    expect(pagination).toBeInTheDocument();
  });

  it("changing page updates the URL's page search param", async () => {
    mockNews({
      items: [newsItemView()],
      counts: { all: 1, unread: 1, read: 0 },
      totalPages: 2,
      page: 1,
    });
    const user = userEvent.setup();
    const { router } = renderApp("/");
    await screen.findByRole("link", { name: /A great engineering article/ });

    await user.click(screen.getByRole("button", { name: "2" }));

    await waitFor(() => {
      expect(router.state.location.search).toMatchObject({ page: 2 });
    });
  });

  it("reads the initial category/state/page from the URL rather than always defaulting", async () => {
    mockNews({
      items: [newsItemView({ category: "ai-engineering" })],
      counts: { all: 1, unread: 0, read: 1 },
    });

    renderApp("/?category=ai-engineering&state=read&page=1");

    const tabs = await screen.findByRole("tablist");
    expect(
      within(tabs).getByRole("tab", { name: "AI Engineering & Developer Workflows" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByText("Read (1)")).toBeInTheDocument();
  });
});
