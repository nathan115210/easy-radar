import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

/**
 * jsdom has no `matchMedia`, but Mantine's `MantineProvider` reads it on
 * mount to resolve the OS color scheme — every RTL test that renders
 * `MantineProvider` needs this stub, not just tests that care about theme.
 */
beforeEach(() => {
  if (typeof window === "undefined") return;
  window.matchMedia ??= vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  // jsdom has no layout engine, so it doesn't implement ResizeObserver;
  // Mantine's Tabs/SegmentedControl use it to size their indicator.
  window.ResizeObserver ??= class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  cleanup();
});
