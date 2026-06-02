/**
 * Roll a single day's Analytics Engine data for one site into the D1
 * `daily_stats` table. Idempotent: re-running for the same (site, day) upserts.
 */
import { createDb, dailyStats } from "@abacus/db";
import { getStatsFromAE } from "./query";

export async function rollupDay(
  env: Env,
  siteId: string,
  day: string,
): Promise<{ pageviews: number; visitors: number }> {
  const stats = await getStatsFromAE(env, siteId, day, day);

  const db = createDb(env.DB);
  await db
    .insert(dailyStats)
    .values({
      siteId,
      date: day,
      pageviews: stats.pageviews,
      visitors: stats.visitors,
      topPages: stats.topPages,
      topReferrers: stats.topReferrers,
      topCountries: stats.topCountries,
    })
    .onConflictDoUpdate({
      target: [dailyStats.siteId, dailyStats.date],
      set: {
        pageviews: stats.pageviews,
        visitors: stats.visitors,
        topPages: stats.topPages,
        topReferrers: stats.topReferrers,
        topCountries: stats.topCountries,
      },
    });

  return { pageviews: stats.pageviews, visitors: stats.visitors };
}
