/**
 * Plan + Stripe price configuration. Price ids are not secret — they're created
 * once via the Stripe API (see the upgrade work) and referenced by the checkout
 * flow and the webhook.
 */
export type PaidPlan = "growth" | "scale";
export type PlanId = "free" | PaidPlan;
export type Cycle = "monthly" | "yearly";

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

export function isPaid(plan: string | null | undefined): boolean {
  return plan === "growth" || plan === "scale";
}

export function isPaidPlan(plan: string): plan is PaidPlan {
  return plan === "growth" || plan === "scale";
}

export function priceId(plan: PaidPlan, cycle: Cycle): string {
  return PRICE_IDS[plan][cycle];
}

/** Reverse-map a Stripe price id to our plan id (used by the webhook). */
export function planForPrice(priceId: string | undefined): PaidPlan | null {
  if (!priceId) return null;
  for (const plan of ["growth", "scale"] as const) {
    if (Object.values(PRICE_IDS[plan]).includes(priceId)) return plan;
  }
  return null;
}

export const PLAN_LABEL: Record<PlanId, string> = {
  free: "Free",
  growth: "Growth",
  scale: "Scale",
};
