import { describe, expect, it } from "vitest";
import type { NewsItem } from "../../shared/schemas/index.js";
import { applyVirtualScope } from "../../scripts/collect/virtual-source-filter.js";
import { sources } from "./mobile-development.js";

function item(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: "abc",
    sourceId: "s",
    heading: "Accelerating our Android apps with Baseline Profiles",
    label: "Announcement",
    link: "https://engineering.fb.com/2026/07/20/android/baseline-profiles",
    date: "2026-07-20",
    dateBasis: "published",
    category: "mobile-development",
    tags: [],
    ...overrides,
  };
}

function findSource(id: string) {
  const source = sources.find((s) => s.id === id);
  if (!source) {
    throw new Error(`Fixture source "${id}" not found in mobile-development.ts`);
  }
  return source;
}

describe("meta-engineering-android-rn virtual source", () => {
  const filters = findSource("meta-engineering-android-rn").filters;

  it("keeps items whose title mentions React Native", () => {
    const rnItem = item({
      id: "rn-1",
      heading: "React Native at Meta: the New Architecture in production",
      link: "https://engineering.fb.com/2026/07/21/android/react-native-new-architecture",
    });

    expect(applyVirtualScope([rnItem], filters)).toEqual([rnItem]);
  });

  it("drops general Android items that don't mention React Native", () => {
    const androidItem = item({
      id: "android-1",
      heading: "Accelerating our Android apps with Baseline Profiles",
    });

    expect(applyVirtualScope([androidItem], filters)).toEqual([]);
  });

  it("discriminates within a mixed batch", () => {
    const rnItem = item({
      id: "rn-2",
      heading: "How Meta ships React Native features faster",
    });
    const kotlinItem = item({
      id: "kotlin-1",
      heading: "How Meta is translating its Java codebase to Kotlin",
    });

    expect(applyVirtualScope([rnItem, kotlinItem], filters)).toEqual([rnItem]);
  });
});

describe("shopify-engineering-mobile virtual source", () => {
  const filters = findSource("shopify-engineering-mobile").filters;

  it("keeps items whose link path is under /category/mobile", () => {
    const mobileItem = item({
      id: "mobile-1",
      heading: "Building Shopify's Point of Sale app",
      link: "https://shopify.engineering/category/mobile/building-pos-app",
    });

    expect(applyVirtualScope([mobileItem], filters)).toEqual([mobileItem]);
  });

  it("drops items from other Shopify Engineering categories", () => {
    const backendItem = item({
      id: "backend-1",
      heading: "Scaling Shopify's checkout for Black Friday",
      link: "https://shopify.engineering/category/infrastructure/scaling-checkout",
    });

    expect(applyVirtualScope([backendItem], filters)).toEqual([]);
  });

  it("discriminates within a mixed batch", () => {
    const mobileItem = item({
      id: "mobile-2",
      heading: "Shipping FlashList performance wins",
      link: "https://shopify.engineering/category/mobile/flashlist-performance",
    });
    const rubyItem = item({
      id: "ruby-1",
      heading: "Ruby on Rails at Shopify scale",
      link: "https://shopify.engineering/category/ruby/rails-at-scale",
    });

    expect(applyVirtualScope([mobileItem, rubyItem], filters)).toEqual([mobileItem]);
  });
});
