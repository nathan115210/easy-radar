// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { newsItemView } from "../test-utils/fixtures.js";
import { installFetchMock, jsonResponse } from "../test-utils/mock-fetch.js";
import { NewsCard } from "./NewsCard.js";
import { SetNewsStateResponseSchema } from "../../shared/schemas/index.js";

function renderCard(overrides: Parameters<typeof newsItemView>[0] = {}) {
  const item = newsItemView(overrides);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const queryKey = ["news", item.category, "all", 1];
  queryClient.setQueryData(queryKey, {
    items: [item],
    counts: { all: 1, unread: 1, read: 0 },
    page: 1,
    pageSize: 50,
    totalPages: 1,
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <NewsCard item={item} queryKey={queryKey} />
      </MantineProvider>
    </QueryClientProvider>,
  );
  return { item, queryClient, ...utils };
}

describe("NewsCard (#18)", () => {
  beforeEach(() => {
    installFetchMock();
  });

  it("the card body is a link to the original item, opening in a new tab", () => {
    const { item } = renderCard();

    const link = screen.getByRole("link", { name: new RegExp(item.heading) });
    expect(link).toHaveAttribute("href", item.link);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("clicking a state button never navigates the card's anchor — the click's default action is prevented before it reaches the anchor", async () => {
    const user = userEvent.setup();
    const { container } = renderCard({ state: "unread" });
    installFetchMock((url, init) => {
      if (init?.method === "PATCH") {
        return jsonResponse(SetNewsStateResponseSchema, {
          id: "irrelevant",
          state: "read",
          hasUncommittedChanges: true,
        });
      }
      return undefined;
    });

    const anchor = container.querySelector("a")!;
    let clickEvent: Event | undefined;
    anchor.addEventListener("click", (event) => {
      clickEvent = event;
    });

    await user.click(screen.getByRole("button", { name: "Mark as read" }));

    // The anchor's own listener runs mid-bubble, before React's delegated
    // handler calls preventDefault() — read the flag off the retained event
    // object after the click has fully dispatched, not inside the listener.
    expect(clickEvent?.defaultPrevented).toBe(true);
  });

  it("clicking 'Mark as read' sends the state update without showing an error", async () => {
    const user = userEvent.setup();
    const { item } = renderCard({ state: "unread" });
    const fetchMock = installFetchMock((url, init) => {
      if (url === `/api/news/${encodeURIComponent(item.id)}/state` && init?.method === "PATCH") {
        return jsonResponse(SetNewsStateResponseSchema, {
          id: item.id,
          state: "read",
          hasUncommittedChanges: true,
        });
      }
      return undefined;
    });

    await user.click(screen.getByRole("button", { name: "Mark as read" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/news/${encodeURIComponent(item.id)}/state`,
        expect.objectContaining({ method: "PATCH", body: JSON.stringify({ state: "read" }) }),
      );
    });
    expect(screen.queryByText(/Failed to update state/)).not.toBeInTheDocument();
  });

  it("clicking 'Ignore' opens a confirmation dialog rather than sending a request immediately", async () => {
    const user = userEvent.setup();
    const fetchMock = installFetchMock();
    renderCard();

    await user.click(screen.getByRole("button", { name: "Ignore" }));

    expect(await screen.findByRole("dialog", { name: "Ignore this item?" })).toBeInTheDocument();
    expect(screen.getByText(/This removes/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cancelling the ignore confirmation is a no-op — no request is sent and the modal closes", async () => {
    const user = userEvent.setup();
    const fetchMock = installFetchMock();
    renderCard();

    await user.click(screen.getByRole("button", { name: "Ignore" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("confirming ignore sends the ignored state update", async () => {
    const user = userEvent.setup();
    const { item } = renderCard();
    const fetchMock = installFetchMock((url, init) => {
      if (url === `/api/news/${encodeURIComponent(item.id)}/state` && init?.method === "PATCH") {
        return jsonResponse(SetNewsStateResponseSchema, {
          id: item.id,
          state: "ignored",
          hasUncommittedChanges: true,
        });
      }
      return undefined;
    });

    await user.click(screen.getByRole("button", { name: "Ignore" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Ignore" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/news/${encodeURIComponent(item.id)}/state`,
        expect.objectContaining({ method: "PATCH" }),
      );
    });
  });
});
