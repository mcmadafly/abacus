/**
 * Read side: query aggregated stats for the dashboard + digest.
 *
 * Primary source is the Analytics Engine SQL API (live, last ~90 days). Because
 * AE has no local query support, callers fall back to the D1 `daily_stats`
 * rollup (see `getStatsFromD1`) when AE isn't configured — e.g. local dev.
 */
import { and, eq, gte, lte } from "drizzle-orm";
import { createDb, dailyStats, type TopItem } from "@abacus/db";

const AE_TABLE = "abacus_events";

export interface SiteStats {
  pageviews: number;
  visitors: number;
  topPages: TopItem[];
  topReferrers: TopItem[];
  topCountries: TopItem[];
  /** pageviews per UTC day, ascending */
  byDay: { date: string; pageviews: number; visitors: number }[];
  source: "analytics-engine" | "d1";
}

export function aeConfigured(env: Env): boolean {
  return Boolean(env.CF_ACCOUNT_ID && env.CF_AE_API_TOKEN);
}

/** Run one SQL statement against the Analytics Engine SQL API. */
export async function queryAE<T = Record<string, unknown>>(
  env: Env,
  sql: string,
): Promise<T[]> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_AE_API_TOKEN}`,
        "Content-Type": "text/plain",
      },
      body: sql,
    },
  );
  if (!res.ok) {
    throw new Error(`AE query failed (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as { data: T[] };
  return json.data ?? [];
}

const num = (v: unknown): number => Number(v) || 0;

/**
 * Build a full stats bundle for a site over [startDay, endDay] (inclusive,
 * "YYYY-MM-DD" UTC). Uses AE when configured, otherwise the D1 rollup.
 */
export async function getStats(
  env: Env,
  siteId: string,
  startDay: string,
  endDay: string,
): Promise<SiteStats> {
  if (aeConfigured(env)) {
    return getStatsFromAE(env, siteId, startDay, endDay);
  }
  return getStatsFromD1(env, siteId, startDay, endDay);
}

export async function getStatsFromAE(
  env: Env,
  siteId: string,
  startDay: string,
  endDay: string,
): Promise<SiteStats> {
  // AE timestamps are UTC; make the range end-exclusive on the next day.
  const start = `${startDay} 00:00:00`;
  const endExclusive = `${addDay(endDay)} 00:00:00`;
  const where = `index1 = '${esc(siteId)}' AND blob8 = 'pageview' AND timestamp >= toDateTime('${start}') AND timestamp < toDateTime('${endExclusive}')`;

  const [totals, pages, refs, countries, byDay] = await Promise.all([
    queryAE<{ pageviews: unknown; visitors: unknown }>(
      env,
      `SELECT sum(_sample_interval) AS pageviews, count(DISTINCT blob7) AS visitors FROM ${AE_TABLE} WHERE ${where}`,
    ),
    topQuery(env, where, "blob1"),
    topQuery(env, where, "blob2"),
    topQuery(env, where, "blob3"),
    queryAE<{ d: string; pageviews: unknown; visitors: unknown }>(
      env,
      `SELECT toDate(timestamp) AS d, sum(_sample_interval) AS pageviews, count(DISTINCT blob7) AS visitors FROM ${AE_TABLE} WHERE ${where} GROUP BY d ORDER BY d ASC`,
    ),
  ]);

  return {
    pageviews: num(totals[0]?.pageviews),
    visitors: num(totals[0]?.visitors),
    topPages: pages,
    topReferrers: refs,
    topCountries: countries,
    byDay: byDay.map((r) => ({
      date: String(r.d),
      pageviews: num(r.pageviews),
      visitors: num(r.visitors),
    })),
    source: "analytics-engine",
  };
}

async function topQuery(
  env: Env,
  where: string,
  column: string,
): Promise<TopItem[]> {
  const rows = await queryAE<{ name: unknown; count: unknown }>(
    env,
    `SELECT ${column} AS name, sum(_sample_interval) AS count FROM ${AE_TABLE} WHERE ${where} GROUP BY name ORDER BY count DESC LIMIT 8`,
  );
  return rows.map((r) => ({ name: String(r.name ?? ""), count: num(r.count) }));
}

/** Offline fallback: assemble stats from the pre-aggregated D1 rollup. */
export async function getStatsFromD1(
  env: Env,
  siteId: string,
  startDay: string,
  endDay: string,
): Promise<SiteStats> {
  const db = createDb(env.DB);
  const rows = await db
    .select()
    .from(dailyStats)
    .where(
      and(
        eq(dailyStats.siteId, siteId),
        gte(dailyStats.date, startDay),
        lte(dailyStats.date, endDay),
      ),
    );
  rows.sort((a, b) => a.date.localeCompare(b.date));

  const pageviews = rows.reduce((s, r) => s + r.pageviews, 0);
  const visitors = rows.reduce((s, r) => s + r.visitors, 0);

  return {
    pageviews,
    visitors,
    topPages: mergeTop(rows.flatMap((r) => r.topPages)),
    topReferrers: mergeTop(rows.flatMap((r) => r.topReferrers)),
    topCountries: mergeTop(rows.flatMap((r) => r.topCountries)),
    byDay: rows.map((r) => ({
      date: r.date,
      pageviews: r.pageviews,
      visitors: r.visitors,
    })),
    source: "d1",
  };
}

/** Sum counts for repeated names across days and return the top 8. */
function mergeTop(items: TopItem[]): TopItem[] {
  const map = new Map<string, number>();
  for (const it of items) {
    map.set(it.name, (map.get(it.name) ?? 0) + it.count);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function esc(v: string): string {
  return v.replace(/'/g, "''");
}

export function addDay(day: string, n = 1): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export interface StatsWithDelta extends SiteStats {
  /** Totals for the immediately preceding window of equal length. */
  prev: { pageviews: number; visitors: number };
}

/**
 * Like `getStats`, but also fetches the immediately-preceding window of equal
 * length so the dashboard can show period-over-period deltas ("↑ 22.8%").
 */
export async function getStatsWithDelta(
  env: Env,
  siteId: string,
  startDay: string,
  endDay: string,
  days: number,
): Promise<StatsWithDelta> {
  const prevEnd = addDay(startDay, -1);
  const prevStart = addDay(startDay, -days);
  const [cur, prev] = await Promise.all([
    getStats(env, siteId, startDay, endDay),
    getStats(env, siteId, prevStart, prevEnd),
  ]);
  return {
    ...cur,
    prev: { pageviews: prev.pageviews, visitors: prev.visitors },
  };
}

/** Percent change a→b, rounded to one decimal. 0 when the base is 0. */
export function pctDelta(prev: number, cur: number): number {
  if (!prev) return 0;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}
