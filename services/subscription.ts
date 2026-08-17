import "server-only";
import connectDB from "~/lib/db";
import Subscription from "~/models/subscription";
import type { SubscriptionPlan, SubscriptionStatus } from "~/lib/constants/roles";

export interface SubscriptionSummary { plan: SubscriptionPlan; status: SubscriptionStatus; startDate: Date; renewalDate: Date | null; }

export async function getSubscription(organizationId: string): Promise<SubscriptionSummary> {
  await connectDB();
  const subscription = await Subscription.findOneAndUpdate(
    { organization: organizationId }, { $setOnInsert: { organization: organizationId, plan: "free", status: "active", startDate: new Date() } },
    { returnDocument: "after", upsert: true }
  ).lean();
  return { plan: subscription.plan as SubscriptionPlan, status: subscription.status as SubscriptionStatus, startDate: subscription.startDate, renewalDate: subscription.renewalDate ?? null };
}

// Provider-neutral for the submission. A Stripe/Paddle adapter can call this after
// its verified checkout/webhook flow; no browser-supplied billing IDs are trusted.
export async function changeSubscriptionPlan(organizationId: string, plan: SubscriptionPlan): Promise<void> {
  await connectDB();
  await Subscription.findOneAndUpdate({ organization: organizationId }, {
    $set: { plan, status: plan === "free" ? "active" : "trialing", renewalDate: plan === "free" ? null : new Date(Date.now() + 30 * 86400000) },
    $setOnInsert: { organization: organizationId, startDate: new Date() },
  }, { upsert: true });
}
