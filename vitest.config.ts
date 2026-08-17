import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "config/**/*.test.ts",
      "src/**/*.test.ts",
      "server/**/*.test.ts",
      "shared/**/*.test.ts",
      "scripts/**/*.test.ts",
      "tests/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["config/**", "src/**", "server/**", "shared/**", "scripts/**"],
    },
  },
});
