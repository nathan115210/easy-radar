import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

/**
 * A small smoke suite (PRD §17, #32) — not broad E2E coverage. Runs
 * against a single locally started app instance (tests/e2e/fixtures/
 * server.ts) seeded with fixture data and a hermetic local git "remote",
 * so no test depends on live source availability or real network access.
 * `workers: 1` is deliberate: every spec shares that one server process
 * and its on-disk state, so specs must not run concurrently against it.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `tsx tests/e2e/fixtures/server.ts`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { E2E_PORT: String(PORT) },
  },
});
