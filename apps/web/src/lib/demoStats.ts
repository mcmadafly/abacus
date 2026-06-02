/**
 * Deterministic demo analytics for the homepage hero dashboard.
 *
 * `generateDemoStats()` builds the raw dataset (embedded as JSON for the client).
 * `summarize()` derives a renderable view for a given { range, metric, page }
 * filter — and is shared by SSR (initial paint) and the client controller, so
 * the interactive demo and the server-rendered HTML stay in lockstep.
 */

export type Metric = "visitors" | "pageviews" | "bounce" | "duration";

export interface DayPoint {
  date: string; // "MMM D"
  visitors: number;
  pageviews: number;
  bounce: number; // %
  duration: number; // seconds
}
export interface PageDef {
  name: string;
  bounce: number;
  pvRatio: number;
  daily: number[]; // per-day visitors for this page
}
export interface SourceDef {
  name: string;
  weight: number;
}
export interface DemoData {
  days: number;
  series: DayPoint[];
  pages: PageDef[];
  sources: SourceDef[];
}

export interface DemoView {
  totals: { visitors: number; pageviews: number; bounce: number; duration: string };
  deltas: Record<Metric, number>;
  chartLabels: string[];
  chartValues: number[];
  spark: Record<Metric, number[]>;
  topPages: { name: string; count: number; bounce: number }[];
  topSources: { name: string; count: number }[];
}

/** Small seedable PRNG (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDay = (d: Date) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;

export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}
export function fmtDuration(sec: number): string {
  return `${Math.floor(sec / 60)}m ${String(Math.round(sec % 60)).padStart(2, "0")}s`;
}

export function generateDemoStats(days = 30, seed = 20260601): DemoData {
  const rand = rng(seed);
  const today = new Date();
  const series: DayPoint[] = [];
  let base = 820;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    base *= 1 + (rand() * 0.06 - 0.012);
    const dow = d.getUTCDay();
    const weekend = dow === 0 || dow === 6 ? 0.72 : 1;
    const visitors = Math.round(base * weekend * (0.85 + rand() * 0.3));
    const pageviews = Math.round(visitors * (2.4 + rand() * 0.8));
    const idx = days - 1 - i; // chronological index
    const bounce = Math.round(46 - idx * 0.12 + (rand() * 6 - 3));
    const duration = Math.round(132 + idx * 1.1 + (rand() * 26 - 13));
    series.push({ date: fmtDay(d), visitors, pageviews, bounce, duration });
  }

  const pageDefs = [
    { name: "/", weight: 0.3, bounce: 39, pvRatio: 2.1 },
    { name: "/pricing", weight: 0.18, bounce: 32, pvRatio: 1.8 },
    { name: "/blog/privacy-first", weight: 0.13, bounce: 51, pvRatio: 1.4 },
    { name: "/docs/install", weight: 0.1, bounce: 28, pvRatio: 2.6 },
    { name: "/sign-up", weight: 0.07, bounce: 21, pvRatio: 1.3 },
  ];
  const pages: PageDef[] = pageDefs.map((p, pi) => {
    const prand = rng(seed + pi * 97 + 13);
    return {
      name: p.name,
      bounce: p.bounce,
      pvRatio: p.pvRatio,
      daily: series.map((s) => Math.round(s.visitors * p.weight * (0.8 + prand() * 0.4))),
    };
  });

  const sources: SourceDef[] = [
    { name: "Google", weight: 0.33 },
    { name: "Direct / None", weight: 0.22 },
    { name: "GitHub", weight: 0.11 },
    { name: "Twitter / X", weight: 0.08 },
    { name: "Hacker News", weight: 0.05 },
  ];

  return { days, series, pages, sources };
}

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const avg = (a: number[]) => (a.length ? Math.round(sum(a) / a.length) : 0);
const pct = (r: number, p: number) => (p === 0 ? 0 : Math.round(((r - p) / p) * 1000) / 10);

export function summarize(
  data: DemoData,
  opts: { range: number; metric: Metric; page: string | null },
): DemoView {
  const { days, series } = data;
  const range = Math.min(opts.range, days);
  const start = days - range;
  const pageDef = opts.page ? (data.pages.find((p) => p.name === opts.page) ?? null) : null;

  // per-day arrays for the active filter
  const visitors: number[] = [];
  const pageviews: number[] = [];
  const bounce: number[] = [];
  const duration: number[] = [];
  for (let i = 0; i < days; i++) {
    const s = series[i]!;
    if (pageDef) {
      const v = pageDef.daily[i]!;
      visitors.push(v);
      pageviews.push(Math.round(v * pageDef.pvRatio));
      bounce.push(Math.max(5, Math.round(pageDef.bounce + Math.sin(i * 0.7 + pageDef.name.length) * 3)));
      duration.push(s.duration);
    } else {
      visitors.push(s.visitors);
      pageviews.push(s.pageviews);
      bounce.push(s.bounce);
      duration.push(s.duration);
    }
  }

  const win = <T>(a: T[]) => a.slice(start);
  const vWin = win(visitors);
  const pWin = win(pageviews);
  const bWin = win(bounce);
  const dWin = win(duration);

  const half = Math.max(1, Math.floor(range / 2));
  const recent = (a: number[]) => a.slice(-half);
  const prior = (a: number[]) => a.slice(-2 * half, -half);
  const sumDelta = (a: number[]) => pct(sum(recent(a)), sum(prior(a)));
  const avgDelta = (a: number[]) => pct(avg(recent(a)), avg(prior(a)));

  const metricArr: Record<Metric, number[]> = {
    visitors: vWin,
    pageviews: pWin,
    bounce: bWin,
    duration: dWin,
  };

  return {
    totals: {
      visitors: sum(vWin),
      pageviews: sum(pWin),
      bounce: avg(bWin),
      duration: fmtDuration(avg(dWin)),
    },
    deltas: {
      visitors: sumDelta(vWin),
      pageviews: sumDelta(pWin),
      bounce: avgDelta(bWin),
      duration: avgDelta(dWin),
    },
    chartLabels: win(series.map((s) => s.date)),
    chartValues: metricArr[opts.metric],
    spark: {
      visitors: vWin.slice(-7),
      pageviews: pWin.slice(-7),
      bounce: bWin.slice(-7),
      duration: dWin.slice(-7),
    },
    topPages: data.pages
      .map((p) => ({ name: p.name, count: sum(p.daily.slice(start)), bounce: p.bounce }))
      .sort((a, b) => b.count - a.count),
    topSources: data.sources.map((s) => ({
      name: s.name,
      count: Math.round(sum(win(series.map((d) => d.visitors))) * s.weight),
    })),
  };
}

/** The big chart figure for a given metric. */
export function metricFigure(view: DemoView, metric: Metric): string {
  if (metric === "bounce") return `${view.totals.bounce}%`;
  if (metric === "duration") return view.totals.duration;
  return view.totals[metric].toLocaleString("en-US");
}

export const METRIC_LABEL: Record<Metric, string> = {
  visitors: "Unique visitors",
  pageviews: "Pageviews",
  bounce: "Bounce rate",
  duration: "Visit duration",
};
/** true = up is good (green) */
export const METRIC_UP_GOOD: Record<Metric, boolean> = {
  visitors: true,
  pageviews: true,
  bounce: false,
  duration: true,
};
