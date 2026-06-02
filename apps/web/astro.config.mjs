// @ts-check
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import clerk from "@clerk/astro";
import tailwindcss from "@tailwindcss/vite";

// Only wire up Clerk when auth is actually enabled. In the launch "waitlist"
// build (no PUBLIC_AUTH_ENABLED) we skip it — its injected client script
// references `document` and breaks the Cloudflare Worker at startup, and auth
// routes redirect to /beta anyway. `astro dev` always includes it.
const isBuild = process.argv.includes("build");
const withClerk = process.env.PUBLIC_AUTH_ENABLED === "true" || !isBuild;

// When Clerk is omitted, alias its UI components to no-op stubs and stub the
// virtual config it would otherwise provide, so the existing imports still build.
const clerkStub = {
  name: "clerk-noop",
  enforce: /** @type {const} */ ("pre"),
  resolveId(/** @type {string} */ id) {
    if (id === "virtual:@clerk/astro/config") return "\0clerk-noop-config";
    return null;
  },
  load(/** @type {string} */ id) {
    if (id === "\0clerk-noop-config") return "export default {};";
    return null;
  },
};
const noop = (/** @type {string} */ p) =>
  fileURLToPath(new URL(p, import.meta.url));

// @clerk/astro registers two client-only injected scripts (before-hydration +
// page) that do a top-level `await runInjectionScript()` touching `document`.
// A bundling bug in @astrojs/cloudflare v12 emits the before-hydration chunk
// into the SSR worker bundle, so that top-level await runs at Worker startup →
// "document is not defined" and the deploy/runtime dies. These scripts are only
// ever meant to run in the browser, so we empty them in the SSR build only; the
// CLIENT build (env name "client") still gets the real Clerk init, so the
// widgets hydrate normally. SSR HTML uses the manifest's inlined string / URL,
// which is unaffected.
/** @type {import('vite').Plugin} */
const stripClerkScriptsSSR = {
  name: "abacus-strip-clerk-client-scripts-ssr",
  enforce: "pre",
  resolveId(/** @type {string} */ id, _importer, /** @type {any} */ options) {
    const env = /** @type {any} */ (this).environment;
    const isSSR = options?.ssr === true || (env && env.name !== "client");
    const isClerkInjectedScript =
      id === "astro:scripts/before-hydration.js" ||
      id === "astro:scripts/page.js";
    if (isSSR && isClerkInjectedScript) return "\0abacus-empty-clerk-script";
    return null;
  },
  load(/** @type {string} */ id) {
    if (id === "\0abacus-empty-clerk-script") return "";
    return null;
  },
};

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
  integrations: withClerk ? [clerk()] : [],
  vite: {
    plugins: withClerk
      ? [tailwindcss(), stripClerkScriptsSSR]
      : [tailwindcss(), clerkStub],
    resolve: withClerk
      ? {}
      : {
          alias: {
            "@clerk/astro/components": noop("./src/clerk-noop/components.ts"),
            "@clerk/astro/server": noop("./src/clerk-noop/server.ts"),
          },
        },
  },
});
