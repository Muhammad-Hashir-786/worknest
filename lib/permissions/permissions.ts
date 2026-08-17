import type { OrgRole } from "../../lib/constants/roles";

/**
 * Every permission the app checks against, namespaced as "resource:action"
 * so a search for a resource turns up every permission that touches it. New
 * features add an entry here and to ROLE_PERMISSIONS below - nowhere else in
 * the codebase should hardcode a `role === "admin"` style check.
 *
 * This is one of two authorization layers:
 *   1. Role permissions (this file) - can this role EVER perform this kind
 *      of action, org-wide? Answered by `can(role, permission)`.
 *   2. Resource ownership - is this the SPECIFIC record they're allowed to
 *      touch (e.g. "member can only update tasks assigned to them")? That
 *      can't be expressed as a role table - it's checked against the actual
 *      document in the action/service that loads it (see Task actions in a
 *      later milestone for an example).
 * A permission check alone is never sufficient for member-owned resources -
 * both layers apply together.
 */
export const PERMISSIONS = [
  "organization:update",
  "organization:delete",
  "organization:manageBilling",
  "members:invite",
  "members:remove",
  "members:changeRole",
  "projects:create",
  "projects:update",
  "projects:delete",
  "projects:manageMembers",
  "tasks:create",
  "tasks:update",
  "tasks:delete",
  "tasks:assign",
  "tasks:comment",
  "tasks:attach",
  "tasks:trackTime",
  "clients:manage",
  "activity:view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

// Written out per role in full rather than composed via "inherits from the
// role below". More verbose, but "can a manager delete a project?" is
// answered by reading one array instead of tracing an inheritance chain -
// worth the repetition for something security-sensitive.
const ROLE_PERMISSIONS: Record<OrgRole, readonly Permission[]> = {
  // Owner always has every permission, including the ownership/billing-tier
  // actions admins are explicitly excluded from.
  owner: [...PERMISSIONS],

  admin: [
    "organization:update",
    "members:invite",
    "members:remove",
    "members:changeRole",
    "projects:create",
    "projects:update",
    "projects:delete",
    "projects:manageMembers",
    "tasks:create",
    "tasks:update",
    "tasks:delete",
    "tasks:assign",
    "tasks:comment",
    "tasks:attach",
    "tasks:trackTime",
    "clients:manage",
    "activity:view",
  ],

  manager: [
    "projects:create",
    "projects:update",
    "projects:manageMembers",
    "tasks:create",
    "tasks:update",
    "tasks:delete",
    "tasks:assign",
    "tasks:comment",
    "tasks:attach",
    "tasks:trackTime",
    "clients:manage",
    "activity:view",
  ],

  // Members work within projects they've been added to. "tasks:update" here
  // covers status/comment/time-tracking on their own work; it is NOT
  // "can edit any task in the org" - that distinction is enforced by the
  // resource-ownership layer described above, not by this table.
  member: ["tasks:update", "tasks:comment", "tasks:attach", "tasks:trackTime"],
};

export function can(role: OrgRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionsFor(role: OrgRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export const PERMISSION_DENIED_MESSAGE = "You don't have permission to do this.";
