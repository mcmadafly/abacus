/**
 * Nightly usage reporting for metered billing. After the digest rollup
 * populates `daily_stats`, we report each paid account's pageviews for the day
 * to its Stripe Billing Meter. Stripe sums these over the billing period and
 * charges overage beyond the plan's included quota (graduated tier).
 *
 * Yearly accounts have no metered subscription item, so their reported events
 * are simply never billed — safe to report for everyone with a customer id.
 */
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import {
  createDb,
  accounts,
  dailyStats,
  sites,
  type Account,
} from "@abacus/db";
import { INCLUDED_PAGEVIEWS, METER_EVENT_NAME, isPaid, isPaidPlan } from "./plans";
import { reportMeterEvent } from "./stripe";
import { sumPageviews } from "./query";

/**
 * Pageviews used this calendar month vs the plan's included quota (for the
 * dashboard meter). Returns null for free accounts. Billing itself is handled
 * by Stripe over the real subscription period; this is an informational view.
 */
export async function accountUsage(
  env: Env,
  account: Account | undefined,
  siteIds: string[],
): Promise<{ used: number; included: number } | null> {
  if (!isPaid(account?.plan) || !account || !isPaidPlan(account.plan)) {
    return null;
  }
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
  const end = now.toISOString().slice(0, 10);
  const used = await sumPageviews(env, siteIds, start, end);
  return { used, included: INCLUDED_PAGEVIEWS[account.plan] };
}

const BILLABLE_STATUS = new Set(["active", "trialing", "past_due"]);

export async function reportUsage(env: Env, scheduledTime: number): Promise<void> {
  if (!env.STRIPE_SECRET_KEY) return;

  const yesterday = new Date(scheduledTime);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const day = yesterday.toISOString().slice(0, 10);
  const ts = Math.floor(Date.parse(`${day}T12:00:00Z`) / 1000);

  const db = createDb(env.DB);
  const paid = await db
    .select()
    .from(accounts)
    .where(
      and(
        inArray(accounts.plan, ["growth", "scale"]),
        isNotNull(accounts.stripeCustomerId),
      ),
    );

  for (const acct of paid) {
    if (!acct.stripeCustomerId) continue;
    if (acct.subscriptionStatus && !BILLABLE_STATUS.has(acct.subscriptionStatus)) {
      continue;
    }
    try {
      const owned = await db
        .select({ id: sites.id })
        .from(sites)
        .where(eq(sites.accountId, acct.id));
      if (owned.length === 0) continue;

      const rows = await db
        .select({ pv: dailyStats.pageviews })
        .from(dailyStats)
        .where(
          and(
            inArray(
              dailyStats.siteId,
              owned.map((s) => s.id),
            ),
            eq(dailyStats.date, day),
          ),
        );
      const pageviews = rows.reduce((sum, r) => sum + r.pv, 0);
      if (pageviews <= 0) continue;

      await reportMeterEvent(env.STRIPE_SECRET_KEY, {
        eventName: METER_EVENT_NAME,
        customerId: acct.stripeCustomerId,
        value: pageviews,
        timestamp: ts,
        identifier: `${acct.stripeCustomerId}:${day}`, // idempotent per day
      });
    } catch (err) {
      console.error(`usage report failed for account ${acct.id}:`, err);
    }
  }
}
