import { describe, expect, it } from "vitest";
import type { NewsItem } from "../../shared/schemas/index.js";
import { applyVirtualScope } from "../../scripts/collect/virtual-source-filter.js";
import { sources } from "./devops-cloud.js";

function item(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: "abc",
    sourceId: "s",
    heading: "Workers - New binding for D1",
    label: "Announcement",
    link: "https://developers.cloudflare.com/changelog/post/2026-08-01-example/",
    date: "2026-08-01",
    dateBasis: "published",
    category: "devops-cloud",
    tags: [],
    ...overrides,
  };
}

function findSource(id: string) {
  const source = sources.find((s) => s.id === id);
  if (!source) {
    throw new Error(`Expected source ${id} to exist in devops-cloud.ts`);
  }
  return source;
}

describe("Cloudflare changelog virtual sources (resolves #40)", () => {
  it("keeps Workers items and drops unrelated Cloudflare changelog items", () => {
    const workers = item({ heading: "Workers - AI agents can debug Workers with local tracing" });
    const zeroTrust = item({
      id: "zt",
      heading: "Zero Trust - Independent MFA supports FIDO2 for infrastructure applications",
    });

    const result = applyVirtualScope(
      [workers, zeroTrust],
      findSource("cloudflare-changelog-workers").filters,
    );

    expect(result).toEqual([workers]);
  });

  it("keeps Pages items and drops unrelated Cloudflare changelog items", () => {
    const pages = item({ id: "pg", heading: "Pages - Pages now skips superseded queued builds" });
    const zeroTrust = item({ id: "zt", heading: "Zero Trust - New Cloudflare Status page" });

    const result = applyVirtualScope(
      [pages, zeroTrust],
      findSource("cloudflare-changelog-pages").filters,
    );

    expect(result).toEqual([pages]);
  });

  it("keeps D1 items and drops unrelated Cloudflare changelog items", () => {
    const d1 = item({
      id: "d1",
      heading: "D1 - D1 migrations support nested layouts via `migrations_pattern`",
    });
    const gateway = item({
      id: "gw",
      heading:
        "Gateway - Detect and control software package downloads with package registry security",
    });

    const result = applyVirtualScope([d1, gateway], findSource("cloudflare-changelog-d1").filters);

    expect(result).toEqual([d1]);
  });

  it("keeps R2 items and drops unrelated Cloudflare changelog items", () => {
    const r2 = item({
      id: "r2",
      heading: "R2 - Sippy now supports Azure Blob Storage and S3-compatible storage",
    });
    const radar = item({
      id: "radar",
      heading: "Radar - AS-level connectivity and upstream providers",
    });

    const result = applyVirtualScope([r2, radar], findSource("cloudflare-changelog-r2").filters);

    expect(result).toEqual([r2]);
  });

  it("does not let Grafana k6 items leak into any of the four Cloudflare filters", () => {
    const k6Item = item({
      id: "k6",
      heading: "k6 - Load testing new scenarios API",
      link: "https://grafana.com/blog/2026/08/01/k6-load-testing-new-scenarios-api/",
      category: "testing-quality",
    });

    for (const id of [
      "cloudflare-changelog-workers",
      "cloudflare-changelog-pages",
      "cloudflare-changelog-d1",
      "cloudflare-changelog-r2",
    ]) {
      expect(applyVirtualScope([k6Item], findSource(id).filters)).toEqual([]);
    }
  });
});
