/**
 * Bridges Clerk identities to local D1 rows. Every dashboard request ensures an
 * `accounts` row exists for the signed-in Clerk user, then scopes `sites` to it.
 */
import { and, eq } from "drizzle-orm";
import { createDb, accounts, sites, type Account, type Site } from "@abacus/db";
import { isPaid } from "./plans";

/** The shared, read-only "live demo" site shown to new users (see db/demo.sql). */
export const DEMO_SITE_ID = "demo";

/** Free plan: one site. More requires an upgrade (see /upgrade). */
export const FREE_SITE_LIMIT = 1;
/** New accounts get a 30-day trial of paid features (derived from created_at). */
export const TRIAL_DAYS = 30;

/** Load the local account row for a Clerk user (created by `ensureAccount`). */
export async function getAccount(
  db: ReturnType<typeof createDb>,
  userId: string,
): Promise<Account | undefined> {
  return db.query.accounts.findFirst({ where: eq(accounts.id, userId) });
}

/** Whole days remaining in the 30-day feature trial (0 once it has lapsed). */
export function trialDaysLeft(account: Account | undefined): number {
  if (!account) return TRIAL_DAYS;
  const endMs = account.createdAt.getTime() + TRIAL_DAYS * 86_400_000;
  return Math.max(0, Math.ceil((endMs - Date.now()) / 86_400_000));
}

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
): Promise<
  { ok: true; site: Site } | { ok: false; error: string; upgrade?: boolean }
> {
  const normalized = normalizeDomain(domain);
  if (!isValidDomain(normalized)) {
    return { ok: false, error: "Please enter a valid domain, e.g. example.com" };
  }
  // Free plan is capped at one site; paid plans (Growth/Scale) are unlimited.
  const account = await getAccount(db, userId);
  if (!isPaid(account?.plan)) {
    const owned = await listSites(db, userId);
    if (owned.length >= FREE_SITE_LIMIT) {
      return {
        ok: false,
        upgrade: true,
        error: "The free plan includes one site. Upgrade to add more.",
      };
    }
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
