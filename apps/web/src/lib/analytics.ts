/**
 * Helpers for ingesting a tracking event into Analytics Engine.
 *
 * Privacy model: we never store IPs or cookies. A "visitor" is identified by a
 * one-way hash of (daily salt + site + ip + user-agent). Because the salt
 * rotates every UTC day, the same person produces a different id tomorrow, so
 * visitors cannot be followed across days or sites.
 */
import { parseUA } from "./ua";

export interface TrackerPayload {
  /** event name, e.g. "pageview" */
  n: string;
  /** declared domain (data-domain) */
  d: string;
  /** full page url */
  u: string;
  /** referrer or null */
  r: string | null;
  /** viewport width or null */
  w: number | null;
}

export function parsePayload(raw: unknown): TrackerPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.n !== "string" || typeof o.d !== "string" || typeof o.u !== "string") {
    return null;
  }
  return {
    n: o.n.slice(0, 64),
    d: o.d.toLowerCase().slice(0, 253),
    u: o.u.slice(0, 2048),
    r: typeof o.r === "string" ? o.r.slice(0, 2048) : null,
    w: typeof o.w === "number" && Number.isFinite(o.w) ? o.w : null,
  };
}

/** Stable, irreversible daily visitor id. */
export async function visitorHash(
  salt: string,
  siteId: string,
  ip: string,
  ua: string,
): Promise<string> {
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const data = `${salt}:${day}:${siteId}:${ip}:${ua}`;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(data),
  );
  // 16 hex chars (64 bits) is plenty to distinguish visitors within a day.
  return [...new Uint8Array(digest).slice(0, 8)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Normalize a referrer URL down to its hostname ("Direct" when empty). */
export function referrerSource(referrer: string | null, ownDomain: string): string {
  if (!referrer) return "Direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (host === ownDomain.replace(/^www\./, "")) return "Direct"; // internal nav
    return host;
  } catch {
    return "Direct";
  }
}

/** Extract a clean pathname from the tracked url. */
export function pathFromUrl(url: string): string {
  try {
    const u = new URL(url);
    // Strip trailing slash except for root, drop query/hash.
    const p = u.pathname.replace(/\/+$/, "");
    return p === "" ? "/" : p;
  } catch {
    return "/";
  }
}

export interface EventDimensions {
  siteId: string;
  path: string;
  source: string;
  country: string;
  browser: string;
  os: string;
  device: string;
  visitor: string;
  eventName: string;
}

export function buildDimensions(args: {
  siteId: string;
  payload: TrackerPayload;
  country: string;
  userAgent: string;
  visitor: string;
}): EventDimensions {
  const { siteId, payload, country, userAgent, visitor } = args;
  const ua = parseUA(userAgent);
  return {
    siteId,
    path: pathFromUrl(payload.u),
    source: referrerSource(payload.r, payload.d),
    country: country || "XX",
    browser: ua.browser,
    os: ua.os,
    device: ua.device,
    visitor,
    eventName: payload.n,
  };
}

/**
 * Write one event to Analytics Engine.
 *
 * Index = siteId (the dimension we always filter by, so queries stay cheap).
 * Blobs carry the categorical dimensions; doubles carry the metric (count=1).
 */
export function writeEvent(ae: AnalyticsEngineDataset, d: EventDimensions): void {
  ae.writeDataPoint({
    indexes: [d.siteId],
    blobs: [
      d.path, // blob1
      d.source, // blob2
      d.country, // blob3
      d.browser, // blob4
      d.os, // blob5
      d.device, // blob6
      d.visitor, // blob7
      d.eventName, // blob8
    ],
    doubles: [1],
  });
}
