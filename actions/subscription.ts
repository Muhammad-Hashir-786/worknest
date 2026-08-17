"use server";
import { revalidatePath } from "next/cache";
import { requireOrgContext } from "~/lib/auth/current-org";
import { can, PERMISSION_DENIED_MESSAGE } from "~/lib/permissions/permissions";
import { SUBSCRIPTION_PLANS } from "~/lib/constants/roles";
import { changeSubscriptionPlan } from "~/services/subscription";

export interface SubscriptionActionState { error?: string; success?: boolean; }
export async function selectPlan(_state: SubscriptionActionState, formData: FormData): Promise<SubscriptionActionState> {
  const { organization, role } = await requireOrgContext();
  if (!can(role, "organization:manageBilling")) return { error: PERMISSION_DENIED_MESSAGE };
  const plan = formData.get("plan");
  if (typeof plan !== "string" || !SUBSCRIPTION_PLANS.includes(plan as typeof SUBSCRIPTION_PLANS[number])) return { error: "Select a valid plan." };
  await changeSubscriptionPlan(organization.id, plan as typeof SUBSCRIPTION_PLANS[number]);
  revalidatePath("/dashboard/settings/billing");
  return { success: true };
}
