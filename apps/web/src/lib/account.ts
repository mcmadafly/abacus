/**
 * Bridges Clerk identities to local D1 rows. Every dashboard request ensures an
 * `accounts` row exists for the signed-in Clerk user, then scopes `sites` to it.
 */
import { and, eq } from "drizzle-orm";
import { createDb, accounts, sites, type Site } from "@abacus/db";

/** The shared, read-only "live demo" site shown to new users (see db/demo.sql). */
export const DEMO_SITE_ID = "demo";

/** Load the demo site regardless of who's asking (it's public/read-only). */
export async function getDemoSite(
  db: ReturnType<typeof createDb>,
): Promise<Site | undefined> {
  return db.query.sites.findFirst({ where: eq(sites.id, DEMO_SITE_ID) });
}

export function shortId(): string {
  // 10-char base36 id, url-safe and short enough to read aloud.
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(36))
    .join("")
    .slice(0, 10);
}

export function normalizeDomain(input: string): string {
  let d = input.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/^www\./, "");
  d = d.replace(/\/.*$/, ""); // drop any path
  return d;
}

export function isValidDomain(d: string): boolean {
  return /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(d);
}

export async function ensureAccount(
  db: ReturnType<typeof createDb>,
  userId: string,
  email: string,
): Promise<void> {
  await db
    .insert(accounts)
    .values({ id: userId, email })
    .onConflictDoNothing();
}

export async function listSites(
  db: ReturnType<typeof createDb>,
  userId: string,
): Promise<Site[]> {
  return db.select().from(sites).where(eq(sites.accountId, userId));
}

export async function getSite(
  db: ReturnType<typeof createDb>,
  userId: string,
  siteId: string,
): Promise<Site | undefined> {
  return db.query.sites.findFirst({
    where: and(eq(sites.id, siteId), eq(sites.accountId, userId)),
  });
}

export async function createSite(
  db: ReturnType<typeof createDb>,
  userId: string,
  domain: string,
): Promise<{ ok: true; site: Site } | { ok: false; error: string }> {
  const normalized = normalizeDomain(domain);
  if (!isValidDomain(normalized)) {
    return { ok: false, error: "Please enter a valid domain, e.g. example.com" };
  }
  const existing = await db.query.sites.findFirst({
    where: eq(sites.domain, normalized),
  });
  if (existing) {
    return { ok: false, error: "That domain is already registered." };
  }
  const [site] = await db
    .insert(sites)
    .values({ id: shortId(), domain: normalized, accountId: userId })
    .returning();
  return { ok: true, site: site! };
}
