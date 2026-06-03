/**
 * Minimal Stripe REST client + webhook verification, implemented with `fetch`
 * and Web Crypto so it runs natively on Cloudflare Workers (no SDK / Node deps).
 */
const API = "https://api.stripe.com/v1";

function form(
  obj: Record<string, string | number | boolean | undefined>,
): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) p.append(k, String(v));
  }
  return p.toString();
}

async function call<T = any>(
  secretKey: string,
  path: string,
  body?: string,
  method: "GET" | "POST" = "POST",
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(
      `Stripe ${method} ${path} ${res.status}: ${json?.error?.message ?? JSON.stringify(json)}`,
    );
  }
  return json as T;
}

export interface CheckoutOpts {
  /** Line items; metered items (usage-based) must omit quantity. */
  lineItems: { price: string; metered?: boolean }[];
  successUrl: string;
  cancelUrl: string;
  clientReferenceId: string;
  customerEmail?: string;
  customerId?: string;
}

export async function createCheckoutSession(
  secretKey: string,
  opts: CheckoutOpts,
): Promise<{ id: string; url: string }> {
  const fields: Record<string, string | number | boolean | undefined> = {
    mode: "subscription",
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    client_reference_id: opts.clientReferenceId,
    allow_promotion_codes: true,
    "metadata[userId]": opts.clientReferenceId,
    "subscription_data[metadata][userId]": opts.clientReferenceId,
    ...(opts.customerId
      ? { customer: opts.customerId }
      : { customer_email: opts.customerEmail }),
  };
  opts.lineItems.forEach((item, i) => {
    fields[`line_items[${i}][price]`] = item.price;
    if (!item.metered) fields[`line_items[${i}][quantity]`] = 1;
  });
  return call(secretKey, "/checkout/sessions", form(fields));
}

/** Report metered usage to a Stripe Billing Meter (sum aggregation). */
export async function reportMeterEvent(
  secretKey: string,
  opts: {
    eventName: string;
    customerId: string;
    value: number;
    timestamp?: number;
    identifier?: string;
  },
): Promise<void> {
  await call(
    secretKey,
    "/billing/meter_events",
    form({
      event_name: opts.eventName,
      "payload[stripe_customer_id]": opts.customerId,
      "payload[value]": Math.round(opts.value),
      ...(opts.timestamp ? { timestamp: opts.timestamp } : {}),
      ...(opts.identifier ? { identifier: opts.identifier } : {}),
    }),
  );
}

export function retrieveSession(secretKey: string, id: string) {
  return call(secretKey, `/checkout/sessions/${id}`, undefined, "GET");
}

export function retrieveSubscription(secretKey: string, id: string) {
  return call(secretKey, `/subscriptions/${id}`, undefined, "GET");
}

export async function createBillingPortalSession(
  secretKey: string,
  customerId: string,
  returnUrl: string,
): Promise<{ url: string }> {
  return call(
    secretKey,
    "/billing_portal/sessions",
    form({ customer: customerId, return_url: returnUrl }),
  );
}

/**
 * Verify a Stripe webhook signature (the `t=…,v1=…` scheme) using Web Crypto.
 * Returns true only if a v1 signature matches and the timestamp is recent.
 */
export async function verifyStripeSignature(
  payload: string,
  sigHeader: string | null,
  secret: string,
  toleranceSec = 300,
): Promise<boolean> {
  if (!sigHeader) return false;
  let t = "";
  const v1: string[] = [];
  for (const part of sigHeader.split(",")) {
    const [k, val] = part.split("=");
    if (k === "t") t = val ?? "";
    else if (k === "v1" && val) v1.push(val);
  }
  if (!t || v1.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > toleranceSec) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${payload}`));
  const expected = [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return v1.some((sig) => timingSafeEqual(sig, expected));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
