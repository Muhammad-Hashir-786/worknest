import "server-only";
import { redirect } from "next/navigation";
import { requireOrgContext } from "../../lib/auth/current-org";
import { can, type Permission } from "./permissions";
import type { CurrentUser } from "../../lib/auth/current-user";
import type { CurrentOrganization } from "../../lib/auth/current-org";
import type { OrgRole } from "../../lib/constants/roles";

/**
 * Server Component / page-level guard: resolves the verified org context
 * (see requireOrgContext) and redirects to the dashboard if the caller's
 * role lacks `permission`. Use this at the top of a page that's entirely
 * gated behind one permission.
 *
 * Server actions need a different shape - they return a form-friendly
 * `{ error }` instead of redirecting, so they call `can(role, permission)`
 * directly after `requireOrgContext()` rather than using this helper.
 */
export async function requirePermission(permission: Permission): Promise<{
  user: CurrentUser;
  organization: CurrentOrganization;
  role: OrgRole;
}> {
  const context = await requireOrgContext();

  if (!can(context.role, permission)) {
    redirect("/dashboard");
  }

  return context;
}
