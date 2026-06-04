/**
 * Timezone helpers for the dashboard. Analytics Engine stores UTC timestamps
 * and its SQL subset can't convert timezones (no 2-arg toDate / INTERVAL), so
 * we bucket by shifting `toUnixTimestamp(timestamp)` by the zone's current UTC
 * offset (see query.ts). Good enough for recent ranges; approximate across DST.
 */
const TZ_RE = /^[A-Za-z][A-Za-z0-9_+\-]*(\/[A-Za-z0-9_+\-]+)*$/;

/** Validate an IANA timezone (from a user cookie); fall back to UTC. */
export function safeTz(tz: string | undefined | null): string {
  if (tz && TZ_RE.test(tz)) {
    try {
      new Intl.DateTimeFormat("en-CA", { timeZone: tz });
      return tz;
    } catch {
      /* invalid */
    }
  }
  return "UTC";
}

/** Today's date ("YYYY-MM-DD") in the given timezone. */
export function todayInTz(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Add `delta` days to a "YYYY-MM-DD" string (calendar arithmetic). */
export function shiftDay(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

/** Current UTC offset of a timezone, in seconds (e.g. America/Chicago → -18000). */
export function tzOffsetSeconds(tz: string): number {
  if (tz === "UTC") return 0;
  const now = new Date();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUTC - now.getTime()) / 1000);
}
