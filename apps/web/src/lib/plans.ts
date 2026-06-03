/**
 * Plan + Stripe price configuration. Price ids are not secret — they're created
 * once via the Stripe API (see the upgrade work) and referenced by the checkout
 * flow and the webhook.
 */
export type PaidPlan = "growth" | "scale";
export type PlanId = "free" | PaidPlan;
export type Cycle = "monthly" | "yearly";

// Flat base subscription prices (licensed).
export const PRICE_IDS: Record<PaidPlan, Record<Cycle, string>> = {
  growth: {
    monthly: "price_1Te4ujLAL8ATHfYu3QcDILbO",
    yearly: "price_1Te4ujLAL8ATHfYuG7oKK2yq",
  },
  scale: {
    monthly: "price_1Te4ukLAL8ATHfYuzZAE90Ox",
    yearly: "price_1Te4ukLAL8ATHfYukHKon6OD",
  },
};

// Metered overage prices (graduated: included quota @ $0, then $0.50 / 1k beyond).
// Only added to MONTHLY subscriptions — yearly plans treat the quota as a soft cap.
export const OVERAGE_PRICE_IDS: Record<PaidPlan, string> = {
  growth: "price_1Te5CQLAL8ATHfYuln0XnAWQ",
  scale: "price_1Te5CQLAL8ATHfYuRU0BYdwp",
};

/** Stripe Billing Meter event name (the cron reports pageviews to this). */
export const METER_EVENT_NAME = "abacus_pageviews";

/** Included monthly pageviews per plan. */
export const INCLUDED_PAGEVIEWS: Record<PaidPlan, number> = {
  growth: 10_000,
  scale: 100_000,
};

/** Overage price beyond the included quota. */
export const OVERAGE_PER_1K_USD = 0.5;

export function isPaid(plan: string | null | undefined): boolean {
  return plan === "growth" || plan === "scale";
}

export function isPaidPlan(plan: string): plan is PaidPlan {
  return plan === "growth" || plan === "scale";
}

export function priceId(plan: PaidPlan, cycle: Cycle): string {
  return PRICE_IDS[plan][cycle];
}

/** Reverse-map a Stripe price id (base or overage) to our plan id. */
export function planForPrice(priceId: string | undefined): PaidPlan | null {
  if (!priceId) return null;
  for (const plan of ["growth", "scale"] as const) {
    if (Object.values(PRICE_IDS[plan]).includes(priceId)) return plan;
    if (OVERAGE_PRICE_IDS[plan] === priceId) return plan;
  }
  return null;
}

/** Resolve the plan from a subscription's line items (base + overage). */
export function planForPrices(
  priceIds: (string | undefined)[],
): PaidPlan | null {
  for (const id of priceIds) {
    const p = planForPrice(id);
    if (p) return p;
  }
  return null;
}

export const PLAN_LABEL: Record<PlanId, string> = {
  free: "Free",
  growth: "Growth",
  scale: "Scale",
};

/** Included monthly pageviews for a plan, or null for free. */
export function includedFor(plan: string | null | undefined): number | null {
  return isPaidPlan(plan ?? "") ? INCLUDED_PAGEVIEWS[plan as PaidPlan] : null;
}

/**
 * Checkout line items for a plan + cycle: the flat base, plus the metered
 * overage item on MONTHLY plans (yearly is a flat soft-cap, no metered item).
 */
export function checkoutLineItems(
  plan: PaidPlan,
  cycle: Cycle,
): { price: string; metered?: boolean }[] {
  const items: { price: string; metered?: boolean }[] = [
    { price: PRICE_IDS[plan][cycle] },
  ];
  if (cycle === "monthly") items.push({ price: OVERAGE_PRICE_IDS[plan], metered: true });
  return items;
}
