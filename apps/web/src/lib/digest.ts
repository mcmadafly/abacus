/**
 * The nightly cron job: for each site, roll yesterday's Analytics Engine data
 * into D1, then email every enabled subscriber a summary of the day via Resend.
 *
 * Invoked from the Worker's `scheduled` handler (src/worker.ts).
 */
import { eq } from "drizzle-orm";
import { resendSendEmail } from "./resend";
import {
  createDb,
  digestSubscriptions,
  sites,
  type Site,
  type TopItem,
} from "@abacus/db";
import { aeConfigured, getStats } from "./query";
import { rollupDay } from "./aggregate";

export async function runDailyDigest(
  env: Env,
  scheduledTime: number,
): Promise<void> {
  const db = createDb(env.DB);

  // "Yesterday" relative to the scheduled run, in UTC.
  const yesterday = new Date(scheduledTime);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const day = yesterday.toISOString().slice(0, 10);

  const allSites = await db.select().from(sites);

  for (const site of allSites) {
    try {
      // 1. Roll AE → D1 (only possible when AE is configured).
      if (aeConfigured(env)) {
        await rollupDay(env, site.id, day);
      }

      // 2. Read the (now-rolled) stats for the day.
      const stats = await getStats(env, site.id, day, day);

      // 3. Email each enabled subscriber.
      const subs = await db
        .select()
        .from(digestSubscriptions)
        .where(eq(digestSubscriptions.siteId, site.id));

      const recipients = subs
        .filter((s) => s.enabled)
        .map((s) => s.email);
      if (recipients.length === 0) continue;

      const html = renderDigestEmail(site, day, stats);
      const subject = `${site.domain}: ${stats.visitors.toLocaleString()} visitors yesterday`;

      await resendSendEmail(env.RESEND_API_KEY, {
        from: env.DIGEST_FROM_EMAIL,
        to: recipients,
        subject,
        html,
      });
    } catch (err) {
      // One bad site shouldn't abort the whole run.
      console.error(`digest failed for ${site.domain} (${site.id}):`, err);
    }
  }
}

interface DigestStats {
  pageviews: number;
  visitors: number;
  topPages: TopItem[];
  topReferrers: TopItem[];
  topCountries: TopItem[];
}

export function renderDigestEmail(
  site: Site,
  day: string,
  stats: DigestStats,
): string {
  // Brand fonts (Apple Mail honours the <link>; Gmail/Outlook fall back).
  const SERIF = "'Newsreader', Georgia, 'Times New Roman', serif";
  const SANS =
    "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const MONO =
    "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
  const ORIGIN = "https://abacuslytics.com";
  const num = (n: number) => n.toLocaleString();
  const vpv = stats.visitors
    ? (stats.pageviews / stats.visitors).toFixed(1)
    : "0.0";
  const pretty = new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  const statCell = (label: string, value: string, border: boolean) => `
    <td width="33%" valign="top" style="padding:16px 18px;${border ? "border-right:1px solid #2a2640;" : ""}">
      <p style="margin:0;font-family:${MONO};font-size:9.5px;letter-spacing:.07em;text-transform:uppercase;color:#8f8aa6">${label}</p>
      <p style="margin:9px 0 0;font-family:${SERIF};font-size:28px;font-weight:500;line-height:1;color:#f6f4fc">${value}</p>
    </td>`;

  const rows = (items: TopItem[]) => {
    if (items.length === 0) {
      return `<tr><td style="padding:10px 0;font-family:${SANS};font-size:13px;color:#807b96">No data yet</td></tr>`;
    }
    const max = Math.max(1, ...items.map((i) => i.count));
    return items
      .slice(0, 5)
      .map((i) => {
        const pct = Math.max(3, Math.round((i.count / max) * 100));
        return `<tr><td style="padding:9px 0 4px">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
            <td style="font-family:${SANS};font-size:13.5px;color:#e9e7f2">${escapeHtml(i.name || "—")}</td>
            <td align="right" style="font-family:${MONO};font-size:12.5px;color:#b9b4cc">${num(i.count)}</td>
          </tr></table>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:6px"><tr>
            <td bgcolor="#241f3b" style="background:#241f3b;border-radius:3px">
              <table width="${pct}%" cellpadding="0" cellspacing="0" role="presentation"><tr>
                <td height="5" style="height:5px;line-height:5px;font-size:1px;background:#5b46e5;border-radius:3px">&nbsp;</td>
              </tr></table>
            </td>
          </tr></table>
        </td></tr>`;
      })
      .join("");
  };

  const section = (title: string, items: TopItem[]) => `
    <tr><td style="padding:14px 26px 0">
      <p style="margin:0 0 2px;font-family:${MONO};font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#857fa0">${title}</p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">${rows(items)}</table>
    </td></tr>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Hanken+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <title>${escapeHtml(site.domain)} — daily report</title>
</head>
<body style="margin:0;padding:0;background:#0b0a16;font-family:${SANS}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#0b0a16">${num(stats.visitors)} visitors and ${num(stats.pageviews)} pageviews on ${escapeHtml(site.domain)} yesterday.</div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" bgcolor="#0b0a16" style="background:#0b0a16;padding:28px 12px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="width:600px;max-width:600px;background:#141124;border:1px solid #2a2640;border-radius:16px;overflow:hidden">
        <!-- accent bar -->
        <tr><td height="3" style="height:3px;line-height:3px;font-size:1px;background:#5b46e5">&nbsp;</td></tr>

        <!-- header -->
        <tr><td style="padding:24px 26px 0">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
            <td>
              <table cellpadding="0" cellspacing="0" role="presentation"><tr>
                <td width="26" style="width:26px"><table width="26" cellpadding="0" cellspacing="0" role="presentation"><tr><td height="26" bgcolor="#5b46e5" style="height:26px;background:#5b46e5;border-radius:8px">&nbsp;</td></tr></table></td>
                <td style="padding-left:9px;font-family:${SANS};font-size:17px;font-weight:600;letter-spacing:-.01em;color:#f4f2fb">Abacus</td>
              </tr></table>
            </td>
            <td align="right" style="font-family:${MONO};font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#857fa0">Daily report</td>
          </tr></table>
        </td></tr>

        <!-- title -->
        <tr><td style="padding:18px 26px 2px">
          <p style="margin:0;font-family:${MONO};font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#857fa0">${escapeHtml(pretty)}</p>
          <h1 style="margin:6px 0 0;font-family:${SERIF};font-size:26px;font-weight:500;letter-spacing:-.01em;color:#f7f5fd">${escapeHtml(site.domain)}</h1>
        </td></tr>

        <!-- stat strip -->
        <tr><td style="padding:16px 22px 6px">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" bgcolor="#1b1730" style="background:#1b1730;border-radius:13px"><tr>
            ${statCell("Unique visitors", num(stats.visitors), true)}
            ${statCell("Pageviews", num(stats.pageviews), true)}
            ${statCell("Views / visitor", vpv, false)}
          </tr></table>
        </td></tr>

        <!-- breakdowns -->
        ${section("Top pages", stats.topPages)}
        ${section("Top sources", stats.topReferrers)}
        ${section("Countries", stats.topCountries)}

        <!-- cta -->
        <tr><td style="padding:22px 26px 6px">
          <table cellpadding="0" cellspacing="0" role="presentation"><tr>
            <td bgcolor="#5b46e5" style="background:#5b46e5;border-radius:10px">
              <a href="${ORIGIN}/app/${escapeHtml(site.id)}" style="display:inline-block;padding:12px 22px;font-family:${SANS};font-size:13.5px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px">View live dashboard &rarr;</a>
            </td>
          </tr></table>
        </td></tr>

        <!-- footer -->
        <tr><td style="padding:24px 26px 26px">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr><td style="border-top:1px solid #221e38;padding-top:18px">
            <p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.55;color:#7d7896">You're receiving this because you subscribed to ${escapeHtml(site.domain)}'s daily digest. Cookie-free analytics, in your inbox — that's Abacus.</p>
          </td></tr></table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
