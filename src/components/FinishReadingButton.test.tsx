// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FinishReadingResponseSchema } from "../../shared/schemas/index.js";
import { UNCOMMITTED_CHANGES_QUERY_KEY } from "../domain/uncommitted-changes.js";
import { errorResponse, installFetchMock, jsonResponse } from "../test-utils/mock-fetch.js";
import { FinishReadingButton } from "./FinishReadingButton.js";

function renderButton() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(UNCOMMITTED_CHANGES_QUERY_KEY, true);
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <FinishReadingButton />
      </MantineProvider>
    </QueryClientProvider>,
  );
  return { queryClient };
}

describe("FinishReadingButton (#21)", () => {
  it("a successful commit+push reports success", async () => {
    const user = userEvent.setup();
    installFetchMock((url, init) => {
      if (url === "/api/finish-reading" && init?.method === "POST") {
        return jsonResponse(FinishReadingResponseSchema, {
          committed: true,
          pushed: true,
          hasUncommittedChanges: false,
        });
      }
      return undefined;
    });
    renderButton();

    await user.click(screen.getByRole("button", { name: "Finish reading" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your reading state was committed and pushed.",
    );
  });

  it("on the error path — a rejected push — the local uncommitted-changes flag is left untouched and the server's error is shown", async () => {
    const user = userEvent.setup();
    installFetchMock((url, init) => {
      if (url === "/api/finish-reading" && init?.method === "POST") {
        return errorResponse(409, "Push rejected: remote has diverged, rebase and retry");
      }
      return undefined;
    });
    const { queryClient } = renderButton();

    await user.click(screen.getByRole("button", { name: "Finish reading" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Push rejected: remote has diverged, rebase and retry",
    );
    // A failure never resets `hasUncommittedChanges` — the local files are
    // untouched by the server's fail-closed contract, so the flag set
    // before the click must still read true.
    expect(queryClient.getQueryData(UNCOMMITTED_CHANGES_QUERY_KEY)).toBe(true);
  });
});
