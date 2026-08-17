// Single source of truth for controlled vocabularies used across models.
// Import from here instead of re-typing enum arrays in each schema file.
// If a value ever needs to change (e.g. "manager" -> "project_manager"),
// it only needs to change here.

export const ORG_ROLES = ["owner", "admin", "manager", "member"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const PROJECT_MEMBER_ROLES = ["lead", "member"] as const;
export type ProjectMemberRole = (typeof PROJECT_MEMBER_ROLES)[number];

export const INVITATION_STATUS = ["pending", "accepted", "rejected", "expired"] as const;
export type InvitationStatus = (typeof INVITATION_STATUS)[number];

// Roles a person can actually be invited as. "owner" is intentionally excluded -
// ownership isn't something you invite someone into, it transfers or is assigned directly.
export const INVITABLE_ROLES = ["admin", "manager", "member"] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const PROJECT_STATUS = [
  "planning",
  "active",
  "on_hold",
  "completed",
  "archived",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUS)[number];

export const TASK_STATUS = [
  "todo",
  "in_progress",
  "in_review",
  "completed",
] as const;
export type TaskStatus = (typeof TASK_STATUS)[number];

// Shared between Project and Task
export const PRIORITY = ["high", "medium", "low"] as const;
export type Priority = (typeof PRIORITY)[number];

export const ACTIVITY_ACTIONS = [
  "created",
  "updated",
  "assigned",
  "status_changed",
  "deleted",
  "commented",
  "invited",
] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export const NOTIFICATION_TYPES = [
  "task_assigned",
  "comment_mention",
  "deadline_reminder",
  "project_update",
  "status_change",
  "general",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const SUBSCRIPTION_PLANS = ["free", "pro", "business"] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

export const SUBSCRIPTION_STATUS = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "expired",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[number];

export const COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "500+",
] as const;
export type CompanySize = (typeof COMPANY_SIZES)[number];

export const INDUSTRIES = [
  "Software",
  "Marketing",
  "Finance",
  "Education",
  "Healthcare",
  "E-commerce",
  "Consulting",
  "Other",
] as const;
export type Industry = (typeof INDUSTRIES)[number];
