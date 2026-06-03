/// <reference types="astro/client" />
/// <reference types="@clerk/astro/env" />

/**
 * Bindings + vars available to the Worker and to Astro pages via
 * `Astro.locals.runtime.env`. (Mirror any change here in wrangler.jsonc.)
 */
interface Env {
  // Bindings
  DB: D1Database;
  AE: AnalyticsEngineDataset;
  ASSETS: Fetcher;

  // Vars
  CF_ACCOUNT_ID: string;

  // Secrets (.dev.vars / wrangler secret)
  CLERK_SECRET_KEY: string;
  PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  RESEND_API_KEY: string;
  RESEND_AUDIENCE_ID: string;
  DIGEST_FROM_EMAIL: string;
  CF_AE_API_TOKEN: string;
  VISITOR_HASH_SALT: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  /** Where new-signup notifications are sent (optional). */
  ADMIN_EMAIL: string;
}

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
