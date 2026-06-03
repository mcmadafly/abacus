/**
 * Minimal Resend REST client (fetch-based).
 *
 * We deliberately avoid the `resend` npm SDK: it bundles `react-dom/server`
 * (for React Email) which crashes a Cloudflare Worker at startup. We only ever
 * send pre-rendered HTML + add contacts, so a couple of fetch calls suffice.
 */
const API = "https://api.resend.com";

/** Whether Resend is configured (real key + audience). */
export function resendConfigured(apiKey?: string, audienceId?: string): boolean {
  return Boolean(apiKey && !apiKey.includes("placeholder") && audienceId);
}

export async function resendAddContact(
  apiKey: string,
  audienceId: string,
  email: string,
): Promise<void> {
  const res = await fetch(`${API}/audiences/${audienceId}/contacts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, unsubscribed: false }),
  });
  if (!res.ok) {
    throw new Error(`Resend add-contact ${res.status}: ${await res.text()}`);
  }
}

export async function resendSendEmail(
  apiKey: string,
  msg: {
    from: string;
    to: string[];
    subject: string;
    html: string;
    /** Extra MIME headers, e.g. List-Unsubscribe. */
    headers?: Record<string, string>;
  },
): Promise<void> {
  const res = await fetch(`${API}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(msg),
  });
  if (!res.ok) {
    throw new Error(`Resend send-email ${res.status}: ${await res.text()}`);
  }
}
