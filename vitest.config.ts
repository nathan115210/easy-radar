import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./src/test-setup.ts"],
    include: [
      "config/**/*.test.ts",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
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
