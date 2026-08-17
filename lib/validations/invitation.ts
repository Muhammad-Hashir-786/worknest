import { z } from "zod";
import { INVITABLE_ROLES } from "../../lib/constants/roles";

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: z.enum(INVITABLE_ROLES, { message: "Select a role" }),
});

export const changeMemberRoleSchema = z.object({
  membershipId: z.string().trim().min(1, "membershipId is required"),
  role: z.enum(INVITABLE_ROLES, { message: "Select a role" }),
});

export const removeMemberSchema = z.object({
  membershipId: z.string().trim().min(1, "membershipId is required"),
});

export const cancelInvitationSchema = z.object({
  invitationId: z.string().trim().min(1, "invitationId is required"),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type ChangeMemberRoleInput = z.infer<typeof changeMemberRoleSchema>;
