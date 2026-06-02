import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { createDb, sites } from "@abacus/db";
import {
  buildDimensions,
  parsePayload,
  visitorHash,
  writeEvent,
} from "../../lib/analytics";

export const prerender = false;

const NO_STORE: Record<string, string> = {
  "Cache-Control": "no-store, must-revalidate",
  "Access-Control-Allow-Origin": "*",
};

// Preflight (only hit by the fetch fallback; sendBeacon doesn't preflight).
export const OPTIONS: APIRoute = () =>
  new Response(null, {
    status: 204,
    headers: {
      ...NO_STORE,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;

  // sendBeacon sends text/plain; parse the body defensively either way.
  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new Response("bad request", { status: 400, headers: NO_STORE });
  }

  const payload = parsePayload(body);
  if (!payload) {
    return new Response("bad request", { status: 400, headers: NO_STORE });
  }

  // Resolve the declared domain to a registered site.
  const db = createDb(env.DB);
  const site = await db.query.sites.findFirst({
    where: eq(sites.domain, payload.d),
    columns: { id: true },
  });
  if (!site) {
    // Unknown domain — accept silently so we don't leak which domains exist.
    return new Response(null, { status: 202, headers: NO_STORE });
  }

  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    "0.0.0.0";
  const userAgent = request.headers.get("user-agent") || "";

  // Ignore obvious bots cheaply.
  if (/bot|crawler|spider|crawling|preview|headless/i.test(userAgent)) {
    return new Response(null, { status: 202, headers: NO_STORE });
  }

  const country =
    (locals.runtime.cf?.country as string | undefined) ||
    request.headers.get("cf-ipcountry") ||
    "XX";

  const visitor = await visitorHash(
    env.VISITOR_HASH_SALT,
    site.id,
    ip,
    userAgent,
  );

  const dims = buildDimensions({
    siteId: site.id,
    payload,
    country,
    userAgent,
    visitor,
  });

  writeEvent(env.AE, dims);

  return new Response(null, { status: 202, headers: NO_STORE });
};
