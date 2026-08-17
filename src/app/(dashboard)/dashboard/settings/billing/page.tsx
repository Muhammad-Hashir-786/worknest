import type { Metadata } from "next";
import { requireOrgContext } from "~/lib/auth/current-org";
import { can } from "~/lib/permissions/permissions";
import { getSubscription } from "~/services/subscription";
import BillingPlans from "./billing-plans";
export const metadata: Metadata = { title: "Billing - WorkNest" };
export default async function BillingPage() { const { organization, role } = await requireOrgContext(); const subscription = await getSubscription(organization.id); return <div className="max-w-3xl"><h1 className="text-2xl font-semibold text-neutral-900">Billing</h1><p className="mt-1 text-sm text-neutral-600">Current plan: <span className="font-medium capitalize">{subscription.plan}</span> ({subscription.status.replace("_", " ")}).</p><BillingPlans currentPlan={subscription.plan} canManage={can(role, "organization:manageBilling")}/></div>; }
