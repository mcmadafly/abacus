/**
 * The nightly cron job: for each site, roll yesterday's Analytics Engine data
 * into D1, then email every enabled subscriber a summary of the day via Resend.
 *
 * Invoked from the Worker's `scheduled` handler (src/worker.ts).
 */
import { eq } from "drizzle-orm";
import { Resend } from "resend";
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
  const resend = new Resend(env.RESEND_API_KEY);

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

      await resend.emails.send({
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
  const list = (items: TopItem[]) =>
    items.length === 0
      ? `<tr><td style="padding:6px 0;color:#9ca3af;font-size:14px">No data</td></tr>`
      : items
          .slice(0, 5)
          .map(
            (i) =>
              `<tr><td style="padding:6px 0;font-size:14px;color:#111827">${escapeHtml(
                i.name || "—",
              )}</td><td style="padding:6px 0;font-size:14px;color:#6b7280;text-align:right">${i.count.toLocaleString()}</td></tr>`,
          )
          .join("");

  const block = (title: string, items: TopItem[]) => `
    <td valign="top" width="50%" style="padding:0 8px">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af">${title}</p>
      <table width="100%" cellpadding="0" cellspacing="0">${list(items)}</table>
    </td>`;

  return `<!doctype html>
<html>
<body style="margin:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb">
        <tr><td style="padding:24px 28px;border-bottom:1px solid #f3f4f6">
          <p style="margin:0;font-size:13px;color:#6b7280">Your Abacus report · ${escapeHtml(day)}</p>
          <h1 style="margin:4px 0 0;font-size:20px;color:#111827">${escapeHtml(site.domain)}</h1>
        </td></tr>
        <tr><td style="padding:24px 28px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="50%" style="padding:0 8px">
                <p style="margin:0;font-size:30px;font-weight:700;color:#111827">${stats.visitors.toLocaleString()}</p>
                <p style="margin:2px 0 0;font-size:13px;color:#6b7280">visitors</p>
              </td>
              <td width="50%" style="padding:0 8px">
                <p style="margin:0;font-size:30px;font-weight:700;color:#111827">${stats.pageviews.toLocaleString()}</p>
                <p style="margin:2px 0 0;font-size:13px;color:#6b7280">pageviews</p>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 20px 8px">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            ${block("Top pages", stats.topPages)}
            ${block("Top sources", stats.topReferrers)}
          </tr></table>
        </td></tr>
        <tr><td style="padding:0 20px 24px">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            ${block("Countries", stats.topCountries)}
            <td width="50%"></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #f3f4f6;text-align:center">
          <p style="margin:0;font-size:12px;color:#9ca3af">Sent by Abacus · real analytics, in your inbox</p>
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
