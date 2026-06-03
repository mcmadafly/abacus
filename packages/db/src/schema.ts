import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * An account maps 1:1 to a Clerk user. We keep a local row so sites can be
 * foreign-keyed to a stable id and so we have somewhere to hang billing later.
 */
export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(), // Clerk user id, e.g. "user_abc123"
  email: text("email").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  // Billing (Stripe). plan: "free" | "growth" | "scale".
  plan: text("plan").notNull().default("free"),
  // Stripe subscription status, e.g. "active" | "trialing" | "past_due" |
  // "canceled". Null until they first subscribe.
  subscriptionStatus: text("subscription_status"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  currentPeriodEnd: integer("current_period_end", { mode: "timestamp" }),
});

/**
 * A site is one tracked domain belonging to an account. `id` is a short public
 * identifier used both as the Analytics Engine index and in the tracker payload.
 */
export const sites = sqliteTable(
  "sites",
  {
    id: text("id").primaryKey(), // short id, e.g. "abc123" (also the AE index)
    domain: text("domain").notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("sites_domain_unq").on(t.domain),
    index("sites_account_idx").on(t.accountId),
  ],
);

/**
 * Pre-aggregated per-day, per-site stats. Populated by the nightly cron from
 * Analytics Engine and used for the email digest + historical dashboard ranges
 * (and as the offline fallback when the AE SQL API is unavailable).
 *
 * top_pages / top_referrers / top_countries are JSON arrays of
 * `{ name: string, count: number }`, capped to a small top-N.
 */
export const dailyStats = sqliteTable(
  "daily_stats",
  {
    siteId: text("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // ISO day "YYYY-MM-DD" (UTC)
    pageviews: integer("pageviews").notNull().default(0),
    visitors: integer("visitors").notNull().default(0),
    topPages: text("top_pages", { mode: "json" })
      .notNull()
      .$type<TopItem[]>()
      .default(sql`'[]'`),
    topReferrers: text("top_referrers", { mode: "json" })
      .notNull()
      .$type<TopItem[]>()
      .default(sql`'[]'`),
    topCountries: text("top_countries", { mode: "json" })
      .notNull()
      .$type<TopItem[]>()
      .default(sql`'[]'`),
  },
  (t) => [
    // one row per site per day
    uniqueIndex("daily_stats_site_date_unq").on(t.siteId, t.date),
  ],
);

/**
 * Who receives the daily digest for a given site, and whether it is enabled.
 */
export const digestSubscriptions = sqliteTable(
  "digest_subscriptions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    siteId: text("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    uniqueIndex("digest_sub_site_email_unq").on(t.siteId, t.email),
    index("digest_sub_site_idx").on(t.siteId),
  ],
);

export type TopItem = { name: string; count: number };

export type Account = typeof accounts.$inferSelect;
export type Site = typeof sites.$inferSelect;
export type DailyStat = typeof dailyStats.$inferSelect;
export type DigestSubscription = typeof digestSubscriptions.$inferSelect;
