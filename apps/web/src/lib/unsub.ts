/**
 * Signed one-click unsubscribe tokens for digest emails. We sign the
 * subscription id with VISITOR_HASH_SALT (HMAC-SHA256) so an unsubscribe link
 * can't be forged or used to unsubscribe arbitrary subscriptions.
 */
const enc = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export function unsubToken(secret: string, subId: number): Promise<string> {
  return hmacHex(secret, `digest-unsub:${subId}`);
}

export async function verifyUnsubToken(
  secret: string,
  subId: number,
  token: string,
): Promise<boolean> {
  const expected = await unsubToken(secret, subId);
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}

export function unsubscribeUrl(
  origin: string,
  subId: number,
  token: string,
): string {
  return `${origin}/digest/unsubscribe?id=${subId}&t=${token}`;
}
