import { describe, expect, it } from "vitest";
import type { NewsItem } from "../../shared/schemas/index.js";
import { applyVirtualScope } from "../../scripts/collect/virtual-source-filter.js";
import { sources } from "./testing-quality.js";

function item(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: "abc",
    sourceId: "s",
    heading: "Untitled",
    label: "Engineering Article",
    link: "https://example.com/post",
    date: "2026-01-01",
    dateBasis: "published",
    category: "testing-quality",
    tags: [],
    ...overrides,
  };
}

function scopeFor(id: string) {
  const source = sources.find((s) => s.id === id);
  if (!source) throw new Error(`Missing source: ${id}`);
  return source.filters;
}

describe("testing-quality virtual sources", () => {
  it("Kent C. Dodds testing-topic virtual source keeps only titles containing 'test'", () => {
    const testing = item({
      id: "t1",
      heading: "Write tests. Not too many. Mostly integration.",
      link: "https://kentcdodds.com/blog/write-tests",
    });
    const nonTesting = item({
      id: "t2",
      heading: "Migrating to Workspaces and Nx",
      link: "https://kentcdodds.com/blog/migrating-to-workspaces-and-nx",
    });

    const result = applyVirtualScope(
      [testing, nonTesting],
      scopeFor("kent-c-dodds-testing-virtual"),
    );

    expect(result).toEqual([testing]);
  });

  it("Martin Fowler testing virtual source keeps only /testing/ links, dropping other sections", () => {
    const testing = item({
      id: "m1",
      heading: "Contract Test",
      link: "https://martinfowler.com/testing/contractTest.html",
    });
    const architecture = item({
      id: "m2",
      heading: "Microservices",
      link: "https://martinfowler.com/articles/microservices.html",
    });

    const result = applyVirtualScope(
      [testing, architecture],
      scopeFor("martin-fowler-testing-virtual"),
    );

    expect(result).toEqual([testing]);
  });

  it("Grafana k6 virtual source keeps only titles mentioning k6, dropping unrelated Grafana posts", () => {
    const k6Post = item({
      id: "g1",
      heading: "Grafana k6 1.0 release",
      link: "https://grafana.com/blog/grafana-k6-1-0-release/",
    });
    const otherPost = item({
      id: "g2",
      heading: "What's new in Grafana 12",
      link: "https://grafana.com/blog/whats-new-in-grafana-12/",
    });

    const result = applyVirtualScope([k6Post, otherPost], scopeFor("grafana-k6-virtual"));

    expect(result).toEqual([k6Post]);
  });

  it("produces disjoint sets for cross-category duplicate pairs called out in #41's acceptance criteria", () => {
    const grafanaGeneral = item({
      id: "d1",
      heading: "Grafana Cloud pricing update",
      link: "https://grafana.com/blog/grafana-cloud-pricing-update/",
    });
    const grafanaK6 = item({
      id: "d2",
      heading: "New in Grafana k6 v0.50",
      link: "https://grafana.com/blog/new-in-grafana-k6-v0-50/",
    });
    const fowlerArchitecture = item({
      id: "d3",
      heading: "Strangler Fig Application",
      link: "https://martinfowler.com/bliki/StranglerFigApplication.html",
    });
    const fowlerTesting = item({
      id: "d4",
      heading: "Test Double",
      link: "https://martinfowler.com/testing/testDouble.html",
    });

    const k6Result = applyVirtualScope([grafanaGeneral, grafanaK6], scopeFor("grafana-k6-virtual"));
    const fowlerResult = applyVirtualScope(
      [fowlerArchitecture, fowlerTesting],
      scopeFor("martin-fowler-testing-virtual"),
    );

    expect(k6Result).toEqual([grafanaK6]);
    expect(fowlerResult).toEqual([fowlerTesting]);
  });
});
