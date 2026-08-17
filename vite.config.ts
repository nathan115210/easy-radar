import react from "@vitejs/plugin-react";
import postcssPresetMantine from "postcss-preset-mantine";
import postcssSimpleVars from "postcss-simple-vars";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    // Single-bundle, local-only app (PRD §4.4) — no CDN, no cold-start-
    // sensitive users, so splitting the bundle to chase this warning isn't
    // worth the added complexity. Raised past the real ~570KB output
    // rather than left at Vite's generic 500KB default.
    chunkSizeWarningLimit: 700,
  },
  css: {
    // Inlined here (rather than a postcss.config.cjs) to keep the repo
    // TypeScript-only for executable source (PRD §14.5) — no committed
    // JavaScript config files.
    postcss: {
      plugins: [
        postcssPresetMantine(),
        postcssSimpleVars({
          variables: {
            "mantine-breakpoint-xs": "36em",
            "mantine-breakpoint-sm": "48em",
            "mantine-breakpoint-md": "62em",
            "mantine-breakpoint-lg": "75em",
            "mantine-breakpoint-xl": "88em",
          },
        }),
      ],
    },
  },
});
