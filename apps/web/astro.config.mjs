// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import clerk from "@clerk/astro";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  output: "server",
  // The ingest endpoint (/api/event) is cross-origin by design (called from
  // customer sites), so Astro's same-origin CSRF check must be off. Dashboard
  // mutations are protected by Clerk's SameSite session cookies instead.
  security: { checkOrigin: false },
  adapter: cloudflare({
    // Expose local Cloudflare bindings (D1, Analytics Engine) during `astro dev`.
    platformProxy: { enabled: true },
    // Cloudflare's runtime has no `sharp`; we don't transform images, so skip it.
    imageService: "passthrough",
    // Custom worker entry so we can add a `scheduled` (cron) handler for the
    // daily digest alongside Astro's fetch handler. The adapter builds this
    // into dist/_worker.js/index.js (the `main` in wrangler.jsonc).
    workerEntryPoint: { path: "src/worker.ts" },
  }),
  integrations: [clerk()],
  vite: {
    plugins: [tailwindcss()],
  },
});
