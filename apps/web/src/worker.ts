/**
 * Custom Cloudflare Worker entrypoint for the Astro app.
 *
 * The @astrojs/cloudflare adapter calls `createExports(manifest)` (the same
 * contract as its built-in entrypoint) and uses the returned `default` export
 * as the Worker. We mirror the adapter's fetch handling and add a `scheduled`
 * handler so the single Worker also runs the nightly digest cron.
 */
import { App } from "astro/app";
import type { SSRManifest } from "astro";
import type {
  ExecutionContext,
  ScheduledController,
} from "@cloudflare/workers-types";
import { handle } from "@astrojs/cloudflare/handler";
import { runDailyDigest } from "./lib/digest";

// Use exactly the parameter types `handle` expects (incoming Cf request and the
// adapter's internal Env shape), sidestepping DOM-vs-workers structural clashes.
type IncomingRequest = Parameters<typeof handle>[2];
type HandlerEnv = Parameters<typeof handle>[3];

export function createExports(manifest: SSRManifest) {
  const app = new App(manifest);

  return {
    default: {
      fetch(request: IncomingRequest, env: HandlerEnv, ctx: ExecutionContext) {
        return handle(manifest, app, request, env, ctx);
      },
      scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
        ctx.waitUntil(runDailyDigest(env, controller.scheduledTime));
      },
    },
  };
}
