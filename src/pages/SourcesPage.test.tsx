// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SourcesResponseSchema } from "../../shared/schemas/index.js";
import {
  categorySources,
  monitoredSourceView,
  referenceSourceView,
  sourcesResponse,
} from "../test-utils/fixtures.js";
import { installFetchMock, jsonResponse } from "../test-utils/mock-fetch.js";
import { renderApp } from "../test-utils/render-app.js";

function mockSources(response: ReturnType<typeof sourcesResponse>) {
  installFetchMock((url) => {
    if (url === "/api/sources") {
      return jsonResponse(SourcesResponseSchema, response);
    }
    return undefined;
  });
}

describe("SourcesPage (#25)", () => {
  it("renders every category, each with its own coverage counts and sources", async () => {
    mockSources(
      sourcesResponse({
        categories: [
          categorySources({
            category: "web-core",
            monitored: [monitoredSourceView({ id: "web-core-source", name: "Web Core Source" })],
          }),
          categorySources({
            category: "mobile-development",
            monitored: [
              monitoredSourceView({
                id: "mobile-source",
                name: "Mobile Source",
                status: "planned",
              }),
            ],
          }),
        ],
      }),
    );

    renderApp("/sources");

    expect(
      await screen.findByRole("heading", { name: "Web Core & Frontend Ecosystem" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mobile Development" })).toBeInTheDocument();
    expect(screen.getByText("Web Core Source")).toBeInTheDocument();
    expect(screen.getByText("Mobile Source")).toBeInTheDocument();
  });

  it("shows the category's active/failing/planned/total coverage counts", async () => {
    mockSources(
      sourcesResponse({
        categories: [
          categorySources({
            category: "web-core",
            coverage: { active: 3, failing: 1, planned: 2, total: 6 },
            monitored: [monitoredSourceView()],
          }),
        ],
      }),
    );

    renderApp("/sources");

    expect(await screen.findByText("3 / 6 Active · Failing: 1 · Planned: 2")).toBeInTheDocument();
  });

  it("labels a reference-only source as 'Not collected'", async () => {
    mockSources(
      sourcesResponse({
        categories: [
          categorySources({
            category: "web-core",
            referenceOnly: [referenceSourceView({ name: "A Reference Doc" })],
          }),
        ],
      }),
    );

    renderApp("/sources");

    expect(await screen.findByText("A Reference Doc")).toBeInTheDocument();
    expect(screen.getByText("Not collected")).toBeInTheDocument();
  });

  it("shows a failing source's failure reason", async () => {
    mockSources(
      sourcesResponse({
        categories: [
          categorySources({
            category: "web-core",
            monitored: [
              monitoredSourceView({
                status: "failing",
                failureReason: "HTTP 503 for 3 consecutive attempts",
              }),
            ],
          }),
        ],
      }),
    );

    renderApp("/sources");

    expect(await screen.findByText("HTTP 503 for 3 consecutive attempts")).toBeInTheDocument();
    expect(screen.getByText("Failing")).toBeInTheDocument();
  });
});
