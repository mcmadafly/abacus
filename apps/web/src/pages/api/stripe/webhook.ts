import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { createDb, accounts } from "@abacus/db";
import { planForPrice } from "../../../lib/plans";
import {
  retrieveSubscription,
  verifyStripeSignature,
} from "../../../lib/stripe";

export const prerender = false;

/** Statuses that still grant paid access. */
const ACTIVE = new Set(["active", "trialing", "past_due"]);

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const payload = await request.text();
  const ok = await verifyStripeSignature(
    payload,
    request.headers.get("stripe-signature"),
    env.STRIPE_WEBHOOK_SECRET,
  );
  if (!ok) return new Response("invalid signature", { status: 400 });

  const event = JSON.parse(payload);
  const db = createDb(env.DB);

  const syncSub = async (sub: any, userId?: string) => {
    const plan = planForPrice(sub?.items?.data?.[0]?.price?.id);
    const active = ACTIVE.has(sub.status);
    const where = userId
      ? eq(accounts.id, userId)
      : eq(accounts.stripeCustomerId, String(sub.customer));
    await db
      .update(accounts)
      .set({
        plan: active ? (plan ?? "growth") : "free",
        subscriptionStatus: sub.status,
        stripeCustomerId: String(sub.customer),
        stripeSubscriptionId: String(sub.id),
        currentPeriodEnd: sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : null,
      })
      .where(where);
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        if (s.subscription) {
          const sub = await retrieveSubscription(
            env.STRIPE_SECRET_KEY,
            s.subscription,
          );
          await syncSub(sub, s.client_reference_id ?? sub.metadata?.userId);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await syncSub(sub, sub.metadata?.userId);
        break;
      }
    }
  } catch (e) {
    // Log and 500 so Stripe retries.
    console.error("stripe webhook error", e);
    return new Response("handler error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
};
